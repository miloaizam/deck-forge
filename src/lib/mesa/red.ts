import * as z from "zod/mini";

import { ZONAS_BUSCABLES, type Accion } from "./apply";
import {
  CONTADORES,
  FASES,
  MAX_NOTA,
  MAX_REGISTRO,
  ZONAS,
  jugador,
  type Mesa,
  type Zona,
} from "./table";
import { esPublica, vista, type MesaVista } from "./vista";

/**
 * Lo que viaja entre los dos navegadores del 1v1 (GAME.md, sesion 5). Logica
 * pura: el canal de Supabase Realtime solo lleva y trae estos mensajes.
 *
 * Cada navegador sabe lo publico y las cartas de SU baraja, y nada mas. Las
 * del rival que no ve quedan con `cartaId: ""` (desconocida). Por eso:
 * - lo que se publica sale de `publicar()`: una carta va con su id solo si
 *   los dos la ven (`esPublica`). Nunca viaja una carta oculta;
 * - una accion que necesita una carta que este navegador no conoce (botar o
 *   mirar del Castillo ajeno, mover una carta oculta del rival) no se hace
 *   aqui: va como **pedido** al navegador del dueno, que la hace al instante
 *   y sin preguntar (GAME.md §2) y publica el resultado;
 * - lo que el rival mira de tu Castillo se le manda solo a el (`privado`).
 *
 * En la practica los lados son "a" (quien creo la sala) y "b".
 */

export const LADOS = ["a", "b"] as const;
export type Lado = (typeof LADOS)[number];

export const otroLado = (l: Lado): Lado => (l === "a" ? "b" : "a");

/** Una carta que este navegador no conoce. */
export const DESCONOCIDA = "";

/** La mesa con solo lo que ven los dos: lo que se publica. */
export function publicar(m: Mesa): MesaVista {
  const fichas: MesaVista["fichas"] = {};
  for (const [uid, f] of Object.entries(m.fichas)) {
    fichas[uid] = esPublica(m, uid) ? f : { ...f, cartaId: null };
  }
  return { ...m, fichas };
}

/** Lo publicado, completado con las cartas que este navegador conoce. */
export function completar(
  p: MesaVista,
  conocidas: Readonly<Record<string, string>>,
): Mesa {
  const fichas: Mesa["fichas"] = {};
  for (const [uid, f] of Object.entries(p.fichas)) {
    fichas[uid] = { ...f, cartaId: f.cartaId ?? conocidas[uid] ?? DESCONOCIDA };
  }
  return { ...p, fichas };
}

/** Las cartas de una baraja recien preparada: su dueno las conoce siempre. */
export function cartasDe(m: Mesa): Record<string, string> {
  return Object.fromEntries(Object.values(m.fichas).map((f) => [f.uid, f.cartaId]));
}

/**
 * Las dos mitades en una mesa. Cada lado prepara la suya con `newTable` y
 * manda al otro solo lo que se ve de ella (`vista` para el rival).
 */
export function unirMitades(a: Mesa, b: Mesa): Mesa {
  const ja = jugador(a, "a");
  const jb = jugador(b, "b");
  if (!ja || !jb) throw new Error("faltan las mitades");
  return {
    fichas: { ...a.fichas, ...b.fichas },
    jugadores: [ja, jb],
    turno: { numero: 1, activo: "a", fase: "agrupacion", prioridad: null },
    revelado: null,
    registro: [
      { n: 1, por: "a", tipo: "preparar", cartas: [] },
      { n: 2, por: "b", tipo: "preparar", cartas: [] },
    ],
  };
}

/** Las acciones que tocan el Castillo de otro: las hace su dueno. */
const SOBRE_UN_CASTILLO = new Set<Accion["tipo"]>([
  "botar",
  "mirar",
  "mostrar",
  "barajar",
  "barajarDesdeCementerio",
]);

/**
 * Quien tiene que hacer esta accion, si no es `yo`: el dueno de la carta
 * oculta que necesita, o del Castillo que toca. `null` si `yo` la puede
 * hacer con lo que sabe.
 */
export function quienLaHace(m: Mesa, a: Accion, yo: string): string | null {
  if ("jugador" in a && SOBRE_UN_CASTILLO.has(a.tipo) && a.jugador !== yo) {
    return a.jugador;
  }
  const uids: string[] = [];
  if ("uid" in a && typeof a.uid === "string") uids.push(a.uid);
  if (a.tipo === "portar") uids.push(a.portador);
  if (a.tipo === "ponerDebajo") uids.push(a.encima);
  for (const uid of uids) {
    const f = m.fichas[uid];
    if (f && f.cartaId === DESCONOCIDA && f.dueno !== yo) return f.dueno;
  }
  return null;
}

/**
 * Lo que el dueno le manda en privado a quien mira su Castillo: las cartas
 * reveladas para el que no son publicas. Vacio si no hay nada que mandar.
 */
export function reveladasPara(m: Mesa, para: string): Record<string, string> {
  const r = m.revelado;
  if (!r || r.para !== para) return {};
  return Object.fromEntries(
    r.uids.filter((u) => !esPublica(m, u)).map((u) => [u, m.fichas[u].cartaId]),
  );
}

/** Lo que el dueno de una mitad le manda al rival antes de empezar. */
export function mitadParaElRival(mitad: Mesa, rival: Lado): MesaVista {
  return vista(mitad, rival);
}

/* ------------------------------------------------------------------ *
 * Validacion de lo que llega (CLAUDE.md, seguridad #4). Lo manda el otro
 * navegador, que es de otra persona: se acota todo y se revisa que la mesa
 * sea coherente antes de usarla.
 * ------------------------------------------------------------------ */

const CONTROLES = /[\p{Cc}‎‏‪-‮⁦-⁩]/gu;
const texto = (max: number) =>
  z.pipe(
    z.string().check(z.maxLength(max * 4)),
    z.transform((t: string) => t.replace(CONTROLES, "").slice(0, max)),
  );

const lado = z.enum(LADOS);
const uid = z.string().check(z.regex(/^[ab]-\d{1,3}$/));
const cartaId = z.string().check(z.regex(/^[a-z0-9-]{3,40}$/));
const zona = z.enum(ZONAS);
const entero = (min: number, max: number) =>
  z.int().check(z.minimum(min), z.maximum(max));

const fichaSchema = z.object({
  uid,
  cartaId: z.nullable(cartaId),
  dueno: lado,
  controlador: lado,
  bocaAbajo: z.boolean(),
  portadaPor: z.nullable(uid),
  debajoDe: z.nullable(uid),
  contadores: z.partialRecord(z.enum(CONTADORES), entero(0, 999)),
  fuerza: entero(-999, 999),
  nota: texto(MAX_NOTA),
});

const listaDeUids = z.array(uid).check(z.maxLength(150));
const zonasSchema = z.object(
  Object.fromEntries(ZONAS.map((zz) => [zz, listaDeUids])) as Record<
    Zona,
    typeof listaDeUids
  >, // seguro: una entrada por cada zona de ZONAS, con el mismo esquema
);

const entradaSchema = z.object({
  n: entero(1, 10_000_000),
  por: lado,
  tipo: texto(30),
  cartas: z.array(z.nullable(cartaId)).check(z.maxLength(60)),
  desde: z.optional(zona),
  hacia: z.optional(zona),
  cuantas: z.optional(entero(-999, 999)),
  detalle: z.optional(texto(MAX_NOTA)),
  objetivo: z.optional(lado),
});

export const mesaVistaSchema = z.object({
  fichas: z.record(uid, fichaSchema),
  jugadores: z.array(z.object({ id: lado, zonas: zonasSchema })).check(z.maxLength(2)),
  turno: z.object({
    numero: entero(1, 100_000),
    activo: lado,
    fase: z.enum(FASES),
    prioridad: z.nullable(lado),
  }),
  revelado: z.nullable(
    z.object({
      jugador: lado,
      zona,
      uids: listaDeUids,
      para: z.union([lado, z.literal("todos")]),
      por: lado,
      modo: z.enum(["mirar", "mostrar", "buscar"]),
      mostrar: z.boolean(),
    }),
  ),
  registro: z.array(entradaSchema).check(z.maxLength(MAX_REGISTRO)),
});

/**
 * Cada uid de las zonas existe y esta una sola vez; cada ficha esta en una
 * zona o cuelga de otra que existe. Una mesa que no cumple no se usa.
 */
export function esCoherente(m: MesaVista): boolean {
  if (Object.keys(m.fichas).length > 300) return false;
  const vistas = new Set<string>();
  for (const j of m.jugadores) {
    for (const zz of ZONAS) {
      for (const u of j.zonas[zz]) {
        if (vistas.has(u) || !m.fichas[u]) return false;
        vistas.add(u);
      }
    }
  }
  for (const [u, f] of Object.entries(m.fichas)) {
    if (f.uid !== u) return false;
    const arriba = f.portadaPor ?? f.debajoDe;
    if (arriba ? !m.fichas[arriba] || vistas.has(u) : !vistas.has(u)) return false;
  }
  return true;
}

const accionSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("mover"),
    uid,
    jugador: lado,
    zona,
    posicion: z.optional(z.number()),
  }),
  z.object({ tipo: z.literal("voltear"), uid }),
  z.object({ tipo: z.literal("robar"), jugador: lado, n: z.optional(entero(0, 60)) }),
  z.object({ tipo: z.literal("botar"), jugador: lado, n: entero(0, 60) }),
  z.object({ tipo: z.literal("barajar"), jugador: lado }),
  z.object({ tipo: z.literal("mulligan"), jugador: lado }),
  z.object({ tipo: z.literal("agrupar"), jugador: lado }),
  z.object({ tipo: z.literal("portar"), uid, portador: uid }),
  z.object({ tipo: z.literal("ponerDebajo"), uid, encima: uid }),
  z.object({
    tipo: z.literal("contador"),
    uid,
    contador: z.enum(CONTADORES),
    delta: entero(-999, 999),
  }),
  z.object({ tipo: z.literal("fuerza"), uid, delta: entero(-999, 999) }),
  z.object({ tipo: z.literal("nota"), uid, texto: texto(MAX_NOTA) }),
  z.object({ tipo: z.literal("limpiarTemporales") }),
  z.object({ tipo: z.literal("mirar"), jugador: lado, n: entero(0, 60) }),
  z.object({ tipo: z.literal("mostrar"), jugador: lado, n: entero(0, 60) }),
  z.object({ tipo: z.literal("ordenarTope"), uids: listaDeUids }),
  z.object({ tipo: z.literal("cerrarRevelado") }),
  z.object({
    tipo: z.literal("abrirBusqueda"),
    zona: z.enum(ZONAS_BUSCABLES),
    mostrar: z.boolean(),
  }),
  z.object({ tipo: z.literal("buscar"), uid: z.nullable(uid) }),
  z.object({
    tipo: z.literal("barajarDesdeCementerio"),
    jugador: lado,
    uids: listaDeUids,
  }),
  z.object({ tipo: z.literal("fase"), fase: z.enum(FASES) }),
  z.object({ tipo: z.literal("siguienteFase") }),
  z.object({ tipo: z.literal("pasarTurno") }),
  z.object({ tipo: z.literal("prioridad"), jugador: lado }),
  z.object({ tipo: z.literal("sortear") }),
]);

export const mensajeSchema = z.discriminatedUnion("t", [
  /** Al entrar: «aqui estoy», para que el otro mande lo que tenga. */
  z.object({ t: z.literal("hola"), de: lado }),
  /** Lo que se ve de la mitad propia, antes de empezar. */
  z.object({ t: z.literal("mitad"), de: lado, mesa: mesaVistaSchema }),
  /** La mesa publica, con su version. */
  z.object({
    t: z.literal("estado"),
    de: lado,
    v: entero(1, 10_000_000),
    mesa: mesaVistaSchema,
  }),
  /** Una accion que tiene que hacer el dueno. */
  z.object({ t: z.literal("pedido"), de: lado, accion: accionSchema }),
  /** Las cartas que el dueno revela solo a quien mira su Castillo. */
  z.object({
    t: z.literal("privado"),
    de: lado,
    para: lado,
    cartas: z.record(uid, cartaId),
  }),
]);

/**
 * Un mensaje del canal. Se escribe a mano y no con `z.infer`: lo que se manda
 * usa los tipos del modelo (`MesaVista`, `Accion`), y lo que llega, validado,
 * es mas estrecho y cabe en estos.
 */
export type Mensaje =
  | { t: "hola"; de: Lado }
  | { t: "mitad"; de: Lado; mesa: MesaVista }
  | { t: "estado"; de: Lado; v: number; mesa: MesaVista }
  | { t: "pedido"; de: Lado; accion: Accion }
  | { t: "privado"; de: Lado; para: Lado; cartas: Record<string, string> };

/** Un mensaje que llega por el canal, validado; `null` si no sirve. */
export function leerMensaje(datos: unknown): Mensaje | null {
  const r = mensajeSchema.safeParse(datos);
  if (!r.success) return null;
  if ((r.data.t === "mitad" || r.data.t === "estado") && !esCoherente(r.data.mesa))
    return null;
  return r.data;
}
