import * as z from "zod/mini";

import type { Afinidad } from "./deck-rules";
import { ATRIBUTOS, deckSchema, ESCUELAS, RAZAS } from "./types";

/**
 * La Comunidad: las barajas que sus duenos publicaron. Logica pura, sin red:
 * los ordenes, la afinidad con que se filtra y la validacion de lo que llega
 * de la nube (seguridad #4). Las peticiones estan en
 * `src/components/nube/comunidad-api.ts`.
 *
 * Lo que escribe otro jugador (alias, nombre, nota) se limpia igual que una
 * baraja importada: mismos topes y sin caracteres de control ni de direccion
 * de texto. Y se pinta siempre como texto.
 */

export const ORDENES_COMUNIDAD = ["likes", "tendencia", "recientes", "copias"] as const;
export type OrdenComunidad = (typeof ORDENES_COMUNIDAD)[number];

export const ETIQUETA_ORDEN_COMUNIDAD: Record<OrdenComunidad, string> = {
  likes: "Más likes",
  tendencia: "Tendencia (7 días)",
  recientes: "Más recientes",
  copias: "Más copiadas",
};

export const esOrdenComunidad = (v: string | null): v is OrdenComunidad =>
  (ORDENES_COMUNIDAD as readonly string[]).includes(v ?? "");

/** Barajas por pagina en la lista. */
export const POR_PAGINA = 24;

/* ------------------------------------------------------------------ *
 * Afinidad: la etiqueta con que se lista y se filtra
 * ------------------------------------------------------------------ */

/**
 * La afinidad de una baraja como texto corto: `raza:Dragón`,
 * `escuela:Clan Desafiante` o `atributo:Luz`. Es la via mas estrecha que
 * cumple (`deckStats` las da de la mas estrecha a la mas ancha): una baraja
 * de solo Dragones es de raza Dragon aunque tambien cumpla su escuela. Null
 * si no tiene Aliados (una de Totems) o no cumple ninguna.
 */
export function claveAfinidad(afinidad: Afinidad): string | null {
  const via = afinidad.vias[0];
  if (afinidad.vacio || !via) return null;
  if (via.modo === "raza") return `raza:${via.raza}`;
  if (via.modo === "escuela") return `escuela:${via.escuela}`;
  return `atributo:${via.atributo}`;
}

/** Todas las afinidades que se pueden elegir en el filtro, en orden. */
export const AFINIDADES: readonly string[] = [
  ...[...RAZAS].sort((a, b) => a.localeCompare(b, "es")).map((r) => `raza:${r}`),
  ...ESCUELAS.map((e) => `escuela:${e}`),
  ...ATRIBUTOS.map((a) => `atributo:${a}`),
];

const AFINIDAD_VALIDA = new Set(AFINIDADES);
export const esAfinidad = (v: string | null): v is string => AFINIDAD_VALIDA.has(v ?? "");

/** «Raza Dragón», «Escuela Clan Desafiante», «Luz». */
export function etiquetaAfinidad(clave: string | null): string {
  if (!clave) return "Sin Aliados";
  const [modo, valor] = clave.split(":");
  if (modo === "raza") return `Raza ${valor}`;
  if (modo === "escuela") return `Escuela ${valor}`;
  return valor ?? clave;
}

/* ------------------------------------------------------------------ *
 * Lo que llega de la nube
 * ------------------------------------------------------------------ */

const CONTROLES = /[\p{Cc}‎‏‪-‮⁦-⁩]/gu;
const texto = (max: number) =>
  z.pipe(
    z.string().check(z.maxLength(max * 4)),
    z.transform((t: string) =>
      t
        .replace(/[\t\n\r]+/g, " ")
        .replace(CONTROLES, "")
        .slice(0, max),
    ),
  );

const afinidadRemota = z.pipe(
  z.nullable(z.string().check(z.maxLength(40))),
  z.transform((a: string | null) => (esAfinidad(a) ? a : null)),
);

const contador = z.int().check(z.nonnegative());
const fecha = z.pipe(
  z.string().check(z.maxLength(40)),
  z.transform((t: string) => {
    const ms = Date.parse(t);
    return Number.isFinite(ms) ? ms : 0;
  }),
);

/** Una fila de `listar_publicas`. */
export const filaPublicaSchema = z.object({
  public_id: z.string().check(z.uuid()),
  nombre: z._default(z.nullable(texto(60)), null),
  afinidad: afinidadRemota,
  portada: z.nullable(z.string().check(z.maxLength(40), z.regex(/^[a-z0-9-]+$/))),
  alias: texto(20),
  likes: contador,
  copias: contador,
  likes_semana: contador,
  publicada_en: fecha,
  total: contador,
});
export type FilaPublica = z.infer<typeof filaPublicaSchema>;

/**
 * Lee la lista: una fila rota se descarta sin llevarse a las demas. `total`
 * es el de la consulta entera, para paginar.
 */
export function leerListaPublica(datos: unknown): {
  filas: FilaPublica[];
  total: number;
} {
  const lista = z.array(z.unknown()).check(z.maxLength(100)).safeParse(datos);
  const filas: FilaPublica[] = [];
  for (const bruta of lista.success ? lista.data : []) {
    const f = filaPublicaSchema.safeParse(bruta);
    if (f.success) filas.push(f.data);
  }
  return { filas, total: filas[0]?.total ?? 0 };
}

/** Una baraja publica entera, de `leer_publica`. */
export const barajaPublicaSchema = z.object({
  public_id: z.string().check(z.uuid()),
  datos: deckSchema,
  afinidad: afinidadRemota,
  alias: texto(20),
  likes: contador,
  copias: contador,
  publicada_en: fecha,
  mia: z.boolean(),
  me_gusta: z.boolean(),
});
export type BarajaPublica = z.infer<typeof barajaPublicaSchema>;

/** La primera fila de `leer_publica`, o null si no hay o no valida. */
export function leerBarajaPublica(datos: unknown): BarajaPublica | null {
  const fila: unknown = Array.isArray(datos) ? datos[0] : undefined;
  const r = barajaPublicaSchema.safeParse(fila);
  return r.success ? r.data : null;
}

/** Un `public_id`: lo que va en `/baraja/?p=`. */
export const ID_PUBLICO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------ *
 * Reportes
 * ------------------------------------------------------------------ */

export const MOTIVOS_REPORTE = [
  { valor: "nombre", texto: "El nombre es ofensivo" },
  { valor: "nota", texto: "La nota es ofensiva" },
  { valor: "spam", texto: "Es spam o publicidad" },
  { valor: "otro", texto: "Otro motivo" },
] as const;
export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number]["valor"];

export const MAX_NOTA_REPORTE = 280;
