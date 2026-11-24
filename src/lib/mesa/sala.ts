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
