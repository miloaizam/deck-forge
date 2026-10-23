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

/*
 * El DAR (Documento Actualizado de Reglas): secciones hechas de bloques. El
 * texto lleva un marcado minimo que `marcado.ts` lee: **negrita**, *cursiva*,
 * [[id|texto]] (una seccion, un apartado o una regla del propio documento) y
 * {{Carta}} (una carta del catalogo). Nada de HTML.
 */

export const DIAGRAMAS = ["anatomia", "arena", "arbol"] as const;
export type Diagrama = (typeof DIAGRAMAS)[number];

export type BloqueDar =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "nota"; texto: string }
  | { tipo: "lista"; ordenada?: boolean; items: string[] }
  /** Puntos con su propia etiqueta: "C1", "a", "Coste de Oro". */
  | { tipo: "etiquetada"; items: { etiqueta: string; texto: string }[] }
  | { tipo: "cartas"; cartas: string[]; pie?: string }
  | { tipo: "diagrama"; diagrama: Diagrama }
  | {
      tipo: "caso";
      titulo: string;
      /** La carta del ejemplo, con su linea de tipo, coste y Fuerza. */
      carta?: string;
      linea?: string;
      /** El texto de la carta, citado. */
      cita?: string[];
      bloques: BloqueDar[];
    }
  | {
      tipo: "apartado";
      /** "8.1", o null en los que el original no numera. */
      id: string;
      numero: string | null;
      titulo: string;
      bloques: BloqueDar[];
    }
  | {
      tipo: "regla";
      /** "8.1-D", "4.1.1": el ancla con que se cita. */
      id: string;
      letra: string;
      titulo?: string;
      bloques: BloqueDar[];
    };

const ancla = z.string().check(z.regex(/^[0-9a-z][0-9a-zA-Z.-]*$/));

// Recursivo: los getters dejan que un bloque contenga bloques. El tipo va
// escrito a mano arriba porque TypeScript no lo infiere de un esquema que se
// referencia a si mismo.
export const bloqueDarSchema: z.ZodMiniType<BloqueDar> = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("parrafo"), texto }),
  z.strictObject({ tipo: z.literal("nota"), texto }),
  z.strictObject({
    tipo: z.literal("lista"),
    ordenada: z.optional(z.boolean()),
    items: z.array(texto).check(z.minLength(1)),
  }),
  z.strictObject({
    tipo: z.literal("etiquetada"),
    items: z.array(z.strictObject({ etiqueta: texto, texto })).check(z.minLength(1)),
  }),
  z.strictObject({
    tipo: z.literal("cartas"),
    cartas: z.array(texto).check(z.minLength(1)),
    pie: z.optional(texto),
  }),
  z.strictObject({ tipo: z.literal("diagrama"), diagrama: z.enum(DIAGRAMAS) }),
  z.strictObject({
    tipo: z.literal("caso"),
    titulo: texto,
    carta: z.optional(texto),
    linea: z.optional(texto),
    cita: z.optional(z.array(texto).check(z.minLength(1))),
    get bloques() {
      return z.array(bloqueDarSchema);
    },
  }),
  z.strictObject({
    tipo: z.literal("apartado"),
    id: ancla,
    numero: z.nullable(texto),
    titulo: texto,
    get bloques() {
      return z.array(bloqueDarSchema).check(z.minLength(1));
    },
  }),
  z.strictObject({
    tipo: z.literal("regla"),
    id: ancla,
    letra: texto,
    titulo: z.optional(texto),
    get bloques() {
      return z.array(bloqueDarSchema);
    },
  }),
]);

export const darSchema = z.strictObject({
  titulo: texto,
  corto: texto,
  formato: texto,
  original: z.strictObject({
    titulo: texto,
    revision: texto,
    archivo: texto,
    paginas: z.int().check(z.positive()),
  }),
  version: fecha,
  secciones: z
    .array(
      z.strictObject({
        id: ancla,
        titulo: texto,
        bloques: z.array(bloqueDarSchema).check(z.minLength(1)),
      }),
    )
    .check(z.minLength(1)),
  correcciones: z.array(texto),
});
export type Dar = z.infer<typeof darSchema>;
export type SeccionDar = Dar["secciones"][number];

/** Todos los bloques del DAR, de afuera hacia adentro. */
export function* bloquesDelDar(bloques: BloqueDar[]): Generator<BloqueDar> {
  for (const b of bloques) {
    yield b;
    if ("bloques" in b) yield* bloquesDelDar(b.bloques);
  }
}

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
  dar: {
    ruta: "/documentos/dar",
    pdf: "/reglas/DAR-261023.pdf",
    paginas: 54,
  },
  feDeErratas: {
    ruta: "/documentos/fe-de-erratas",
    pdf: "/reglas/FeDeErratas-261023.pdf",
    paginas: 25,
  },
  banlist: {
    ruta: "/documentos/banlist",
    pdf: "/reglas/BanlistEstandar-261023.pdf",
    paginas: 7,
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
