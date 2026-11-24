import * as z from "zod/mini";

import { FORMATOS, type Formato } from "../types";

/**
 * Las salas del 1v1 (GAME.md, sesion 4): el codigo para unirse y la
 * validacion de lo que responde la base (CLAUDE.md, seguridad #4). Logica
 * pura; las peticiones estan en `src/components/mesa/sala-api.ts` y la SQL,
 * en `supabase/mesa.sql`.
 */

/** Seis letras y numeros sin los que se confunden (0/O, 1/I/L), como la base. */
export const CODIGO_SALA = /^[A-HJ-KM-NP-Z2-9]{6}$/;

/** Lo que alguien escribe o pega («abc 123», «ABC-123») a un codigo, o `null`. */
export function normalizarCodigo(texto: string): string | null {
  const limpio = texto.toUpperCase().replace(/[\s-]/g, "");
  return CODIGO_SALA.test(limpio) ? limpio : null;
}

export const ESTADOS_SALA = [
  "esperando",
  "jugando",
  "entre_juegos",
  "terminada",
] as const;
export type EstadoSala = (typeof ESTADOS_SALA)[number];

export const MEJOR_DE = [3, 5] as const;
export type MejorDe = (typeof MEJOR_DE)[number];

/** El alias lo escribio otro jugador: sin controles ni cambios de direccion. */
const CONTROLES = /[\p{Cc}‎‏‪-‮⁦-⁩]/gu;
const alias = z.pipe(
  z.nullable(z.string().check(z.maxLength(80))),
  z.transform((t: string | null) => (t ? t.replace(CONTROLES, "").slice(0, 20) : null)),
);

const uuid = z.string().check(z.uuid());
const fecha = z.nullable(z.string().check(z.maxLength(40)));
const victorias = z.int().check(z.minimum(0), z.maximum(5));

export const salaSchema = z.object({
  id: uuid,
  codigo: z.string().check(z.regex(CODIGO_SALA)),
  formato: z.enum(FORMATOS),
  mejor_de: z.union([z.literal(3), z.literal(5)]),
  estado: z.enum(ESTADOS_SALA),
  jugador_a: uuid,
  jugador_b: z.nullable(uuid),
  alias_a: alias,
  alias_b: alias,
  listo_a: z.boolean(),
  listo_b: z.boolean(),
  victorias_a: victorias,
  victorias_b: victorias,
  ganador: z.nullable(uuid),
  senal_a: fecha,
  senal_b: fecha,
  creada: fecha,
  /** Por que termino la serie (sesiones 6 y 7). */
  motivo: z._default(z.nullable(z.enum(["abandono", "rendicion", "partidas"])), null),
  /** La hora de la base cuando respondio. */
  ahora: z._default(fecha, null),
  /** La serie (sesion 7): cuantos juegos empezaron, anulados incluidos. */
  ronda: z._default(z.int().check(z.minimum(1), z.maximum(1000)), 1),
  empates: z._default(z.int().check(z.minimum(0), z.maximum(1000)), 0),
  /** Quien declaro el resultado del juego en curso, y que declaro. */
  declara: z._default(z.nullable(uuid), null),
  declarado: z._default(z.nullable(z.enum(["a", "b", "empate"])), null),
  /** Como termino el ultimo juego, y si fue por rendicion. */
  ultimo: z._default(z.nullable(z.enum(["a", "b", "empate", "anulado"])), null),
  rendido: z._default(z.boolean(), false),
});

export type Sala = z.infer<typeof salaSchema>;

export const salaCreadaSchema = z.object({
  id: uuid,
  codigo: z.string().check(z.regex(CODIGO_SALA)),
});

/** `mis_mesas()`: las filas que no pasen la validacion se descartan, no tumban la lista. */
export function leerMisSalas(datos: unknown): Sala[] {
  if (!Array.isArray(datos)) return [];
  return datos.slice(0, 10).flatMap((d) => {
    const r = salaSchema.safeParse(d);
    return r.success ? [r.data] : [];
  });
}

/** `ver_mesa()`: `null` si no existe, no es tuya o llego rota. */
export function leerSala(datos: unknown): Sala | null {
  const r = salaSchema.safeParse(datos);
  return r.success ? r.data : null;
}

/** De que lado de la sala esta `uid`, o `null` si no juega en ella. */
export function miLado(sala: Sala, uid: string): "a" | "b" | null {
  if (sala.jugador_a === uid) return "a";
  if (sala.jugador_b === uid) return "b";
  return null;
}

/** El nombre de un jugador en la sala: su alias, o uno generico. */
export function nombreEnSala(sala: Sala, lado: "a" | "b"): string {
  const a = lado === "a" ? sala.alias_a : sala.alias_b;
  return a || (lado === "a" ? "Anfitrión" : "Invitado");
}

/** Que significa cada error propio de `mesa.sql` (el `code` de la respuesta). */
export const MENSAJE_ERROR_SALA: Record<string, string> = {
  MS001: "Esa sala no existe, ya está completa o ya empezó.",
  MS002: "Inicia sesión para jugar.",
  MS003: "Ya tienes tres salas abiertas. Sal de una para crear o unirte a otra.",
  MS004: "No eres parte de esa sala.",
  MS005: "La sala ya empezó.",
  MS006: "Elige una baraja antes de marcarte listo.",
  MS007: "Tu rival todavía puede volver: espera a que se acabe su tiempo.",
  MS008: "Ese juego ya terminó.",
  MS009: "Tu rival ya declaró un resultado: respóndele primero.",
  MS010: "Tu rival cambió o retiró lo que había declarado.",
};

export const NOMBRE_ESTADO_SALA: Record<EstadoSala, string> = {
  esperando: "Esperando",
  jugando: "En juego",
  entre_juegos: "Entre juegos",
  terminada: "Terminada",
};

export function esFormato(v: string): v is Formato {
  return (FORMATOS as readonly string[]).includes(v);
}

/** El tiempo de gracia de quien se desconecta (GAME.md §2). El mismo que `mesa.sql`. */
export const GRACIA_MS = 120_000;

const msDe = (fecha: string | null): number | null => {
  const t = fecha ? Date.parse(fecha) : Number.NaN;
  return Number.isFinite(t) ? t : null;
};

/**
 * Cuantos ms le quedan al jugador `lado` para volver, desde su ultima senal
 * en la base. Se cuenta con la hora de la base (`ahora`), corrida por lo que
 * paso en este navegador desde que llego la respuesta (`recibida`, en ms del
 * reloj local): asi un reloj adelantado o atrasado no cambia la cuenta.
 * `null` si no hay con que contar.
 */
export function restanteDeGracia(
  sala: Sala,
  lado: "a" | "b",
  recibida: number,
  ahoraLocal: number,
): number | null {
  const senal = msDe(lado === "a" ? sala.senal_a : sala.senal_b);
  const base = msDe(sala.ahora);
  if (senal === null || base === null) return null;
  const ahoraEnLaBase = base + Math.max(0, ahoraLocal - recibida);
  return Math.max(0, GRACIA_MS - (ahoraEnLaBase - senal));
}
