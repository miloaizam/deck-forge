import * as z from "zod/mini";

import { TIPOS } from "./types";

/**
 * Los documentos oficiales del formato, transcritos a datos en
 * `documentos/fuente/*.json`: la Fe de Erratas y la Banlist.
 *
 * De ellos salen los PDF (`documentos/fuente/generar.mjs`) y las paginas de
 * `/documentos`. Como todo lo que entra desde fuera del bundle, se validan con
 * Zod; los esquemas son estrictos para que un campo mal escrito en el JSON
 * falle en vez de perderse en silencio. `documentos.test.ts` los cruza ademas
 * con el catalogo real.
 */

const texto = z.string().check(z.trim(), z.minLength(1));
/** AAAA-MM-DD. */
const fecha = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/));

export const CAMBIOS = ["habilidad", "raza", "nombre", "frecuencia"] as const;
export type Cambio = (typeof CAMBIOS)[number];

export const erratumSchema = z
  .strictObject({
    nombre: texto,
    /** El codigo IMPRESO en la carta (`SOL-013-232`), no el del catalogo. */
    codigo: texto,
    edicion: texto,
    tipo: z.enum(TIPOS),
    raza: z.nullable(texto),
    coste: z.nullable(z.int().check(z.minimum(0))),
    fuerza: z.nullable(z.int().check(z.minimum(0))),
    cambio: z.enum(CAMBIOS),
    /**
     * "Donde dice": el texto (o la raza, el nombre…) impreso en la carta. Es
     * `null` cuando la carta se imprimio con varias versiones: van en `versiones`.
     */
    antes: z.nullable(texto),
    /** "Debe decir". */
    despues: texto,
    /** Varias versiones impresas del "Donde dice" (Ataque de Dragon). */
    versiones: z.optional(z.array(texto).check(z.minLength(2))),
    /** Una errata anterior, entre la carta impresa y la vigente. */
    intermedio: z.optional(z.strictObject({ etiqueta: texto, texto })),
    /** El titulo del "Debe decir" cuando el original lo nombra distinto. */
    etiquetaDespues: z.optional(texto),
    /** Una aclaracion del propio documento. */
    nota: z.optional(texto),
    /** Lo que la transcripcion corrigio del original, y por que. */
    correccion: z.optional(texto),
  })
  // O un "Donde dice" o varios, nunca los dos ni ninguno.
  .check(
    z.refine((e) => (e.antes === null) === (e.versiones !== undefined), {
      message: "cada entrada lleva `antes` o `versiones`, uno de los dos",
    }),
  );
export type Erratum = z.infer<typeof erratumSchema>;

export const feDeErratasSchema = z.strictObject({
  titulo: texto,
  formato: texto,
  original: z.strictObject({
    titulo: texto,
    actualizacion: texto,
    archivo: texto,
    paginas: z.int().check(z.positive()),
  }),
  version: fecha,
  orden: texto,
  entradas: z.array(erratumSchema).check(z.minLength(1)),
});
export type FeDeErratas = z.infer<typeof feDeErratasSchema>;

export const banlistSchema = z.strictObject({
  titulo: texto,
  formato: texto,
  original: z.strictObject({
    titulo: texto,
    archivo: texto,
    paginas: z.int().check(z.positive()),
    modificado: fecha,
  }),
  version: fecha,
  construccion: texto,
  prohibidas: z.array(texto).check(z.minLength(1)),
  unicas: z.array(texto).check(z.minLength(1)),
  observacion: z.strictObject({
    descripcion: texto,
    condiciones: z.array(z.strictObject({ carta: texto, condicion: z.nullable(texto) })),
    porRaza: z.array(
      z.strictObject({
        raza: texto,
        cartas: z
          .array(z.strictObject({ carta: texto, edicion: texto }))
          .check(z.minLength(1)),
      }),
    ),
  }),
  erratas: z.array(
    z.strictObject({
      carta: texto,
      texto,
      /** Solo en las cartas de fuera del formato. */
      edicion: z.optional(texto),
    }),
  ),
  correcciones: z.array(texto),
});
export type Banlist = z.infer<typeof banlistSchema>;

/** Todos los nombres de carta que nombra la banlist, sin repetir. */
export function cartasDeLaBanlist(b: Banlist): string[] {
  return [
    ...new Set([
      ...b.prohibidas,
      ...b.unicas,
      ...b.erratas.map((e) => e.carta),
      ...b.observacion.condiciones.map((c) => c.carta),
      ...b.observacion.porRaza.flatMap((r) => r.cartas.map((c) => c.carta)),
    ]),
  ];
}

/**
 * Un nombre de carta para comparar: sin mayusculas, sin tildes y sin
 * espacios de mas. Los documentos y el catalogo no siempre coinciden en eso.
 */
export function claveDeNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’´`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Las ediciones de la Fe de Erratas, en el orden del documento original. El
 * indice y las secciones de la pagina siguen este orden; `documentos.test.ts`
 * vigila que ninguna entrada caiga fuera.
 */
export const EDICIONES_FE_DE_ERRATAS = [
  "Dominio",
  "ContraAtaque",
  "Águila Imperial",
  "Steampunk",
  "Axis Mundi",
  "Hijos del Sol",
  "Legado Gótico",
  "Escuelas Elementales",
  "Otras ediciones",
] as const;

export const ETIQUETA_CAMBIO: Record<Cambio, string> = {
  habilidad: "Habilidad",
  raza: "Raza",
  nombre: "Nombre",
  frecuencia: "Frecuencia",
};

export interface Documento {
  /** Ruta de su pagina en el sitio. */
  ruta: string;
  /** El PDF publicado, en public/reglas/ (seguridad #11 de CLAUDE.md). */
  pdf: string;
  /** Paginas del PDF; `documentos.test.ts` las compara con el archivo. */
  paginas: number;
}

export const DOCUMENTOS = {
  feDeErratas: {
    ruta: "/documentos/fe-de-erratas",
    pdf: "/reglas/FeDeErratas-260926.pdf",
    paginas: 24,
  },
  banlist: {
    ruta: "/documentos/banlist",
    pdf: "/reglas/BanlistEstandar-260926.pdf",
    paginas: 5,
  },
} as const satisfies Record<string, Documento>;

/** "2026-09-26" -> "26 de septiembre de 2026". */
export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
