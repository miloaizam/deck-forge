import * as z from "zod/mini";

import { editionTitle, origenTitle } from "./editions";
import { cardRefSchema, SECCIONES_DE_LA_BARAJA, type Card, type Tipo } from "./types";

/**
 * La coleccion del usuario: las cartas que tiene, con sus copias, y las que le
 * faltan, que son las que QUIERE conseguir (no todo el catalogo: nadie
 * colecciona las 2650). Una carta puede estar en las dos: tiene 1 y le faltan
 * 2 para las 3 que quiere.
 *
 * Se cuenta por impresion (`id`): quien colecciona distingue el arte normal
 * del alternativo. Vive en `localStorage`, aparte de las barajas, y como todo
 * lo que sale de ahi se valida al leerse (CLAUDE.md, seguridad #4).
 *
 * Sin `"use client"` por lo mismo que `deck-storage.ts`: las funciones que
 * tocan `localStorage` se defienden solas de correr en el servidor.
 */

export const COLECCION_KEY = "deckforge-coleccion";

/** Copias de una impresion. Holgado: hay quien guarda cajas de Oros. */
export const MAX_COPIAS_COLECCION = 99;

/** Una impresion por carta del catalogo y margen para las que se sumen. */
const MAX_ENTRADAS = 10_000;

/** Cota antes de parsear: localStorage y los archivos traen cualquier cosa. */
const MAX_CHARS = 512 * 1024;

export interface Coleccion {
  /** Id de impresion -> copias que tiene (de 1 en adelante). */
  readonly tengo: Readonly<Record<string, number>>;
  /**
   * Id de impresion -> copias que le faltan, ADEMAS de las que tiene (de 1 en
   * adelante, con el mismo tope). Puede convivir con `tengo`.
   */
  readonly quiero: Readonly<Record<string, number>>;
}

export const COLECCION_VACIA: Coleccion = Object.freeze({
  tengo: Object.freeze({}),
  quiero: Object.freeze({}),
});

const copiasSchema = z.int().check(z.minimum(1), z.maximum(MAX_COPIAS_COLECCION));

/**
 * Valida las entradas una a una: una rota no se lleva a las demas. Los ids
 * viejos se traducen (`ids-anteriores.ts`) y, si dos acaban en el mismo, se
 * suman (hasta su tope). Nunca lanza.
 *
 * `quiero` se lee tambien como lista de ids, que es como lo guardaba la
 * version anterior (una copia de cada una).
 */
export function sanearColeccion(
  cartas: unknown,
  quiero: unknown,
): { coleccion: Coleccion; descartadas: number } {
  const tengo: Record<string, number> = {};
  const faltan: Record<string, number> = {};
  let descartadas = 0;
  let leidas = 0;
  const leer = (origen: unknown, destino: Record<string, number>) => {
    const pares: [unknown, unknown][] = Array.isArray(origen)
      ? origen.map((id) => [id, 1])
      : typeof origen === "object" && origen !== null
        ? Object.entries(origen)
        : [];
    for (const [clave, valor] of pares) {
      const id = cardRefSchema.safeParse(clave);
      const n = copiasSchema.safeParse(valor);
      if (++leidas > MAX_ENTRADAS || !id.success || !n.success) {
        descartadas++;
        continue;
      }
      destino[id.data] = Math.min(MAX_COPIAS_COLECCION, (destino[id.data] ?? 0) + n.data);
    }
  };
  leer(cartas, tengo);
  leer(quiero, faltan);
  return { coleccion: { tengo, quiero: faltan }, descartadas };
}

/** Lee lo guardado en localStorage. Lo que no cuadre se descarta. */
export function parseColeccion(raw: string | null): Coleccion {
  if (!raw || raw.length > MAX_CHARS) return COLECCION_VACIA;
  try {
    const bruto: unknown = JSON.parse(raw);
    if (typeof bruto !== "object" || bruto === null) return COLECCION_VACIA;
    const sobre = bruto as { cartas?: unknown; quiero?: unknown }; // se valida campo a campo
    return sanearColeccion(sobre.cartas, sobre.quiero).coleccion;
  } catch {
    return COLECCION_VACIA;
  }
}

export const estaVacia = (col: Coleccion) =>
  Object.keys(col.tengo).length === 0 && Object.keys(col.quiero).length === 0;

const acotar = (n: number, tope: number) => Math.max(0, Math.min(tope, Math.trunc(n)));

/**
 * La coleccion con `n` copias de `id`; con 0 sale de las que tiene. Las copias
 * que se suman se descuentan de las que faltan (las consiguio); bajar no las
 * repone, porque puede ser un error corregido y no una carta perdida.
 */
export function conCopias(col: Coleccion, id: string, n: number): Coleccion {
  const acotado = acotar(n, MAX_COPIAS_COLECCION);
  const antes = col.tengo[id] ?? 0;
  const tengo: Record<string, number> = { ...col.tengo };
  const quiero: Record<string, number> = { ...col.quiero };
  if (acotado === 0) delete tengo[id];
  else tengo[id] = acotado;
  if (acotado > antes && id in quiero) {
    const faltan = quiero[id] - (acotado - antes);
    if (faltan > 0) quiero[id] = faltan;
    else delete quiero[id];
  }
  return { tengo, quiero };
}

/** Las copias que faltan de `id`, aparte de las que tiene; con 0 sale de la lista. */
export function conFaltantes(col: Coleccion, id: string, n: number): Coleccion {
  const acotado = acotar(n, MAX_COPIAS_COLECCION);
  const quiero: Record<string, number> = { ...col.quiero };
  if (acotado === 0) delete quiero[id];
  else quiero[id] = acotado;
  return { ...col, quiero };
}

/** Anota una carta como faltante (una copia), o la saca si ya estaba. */
export function alternarQuiero(col: Coleccion, id: string): Coleccion {
  return conFaltantes(col, id, id in col.quiero ? 0 : 1);
}

/** Llego una de las que faltaban: una copia mas en las que tiene y una menos aqui. */
export function conseguiUna(col: Coleccion, id: string): Coleccion {
  if (!(id in col.quiero)) return col;
  return conCopias(col, id, (col.tengo[id] ?? 0) + 1);
}

/**
 * Junta una coleccion importada con la que hay. Por impresion se queda la
 * MAYOR de las dos cantidades, en las dos listas: importar el mismo respaldo
 * dos veces no duplica nada, e importar uno viejo no borra nada.
 */
export function fusionar(actual: Coleccion, importada: Coleccion): Coleccion {
  const mayor = (
    a: Readonly<Record<string, number>>,
    b: Readonly<Record<string, number>>,
  ) => {
    const out: Record<string, number> = { ...a };
    for (const [id, n] of Object.entries(b)) out[id] = Math.max(out[id] ?? 0, n);
    return out;
  };
  const tengo = mayor(actual.tengo, importada.tengo);
  const quiero = mayor(actual.quiero, importada.quiero);
  return { tengo, quiero };
}

/** Las cartas agrupadas por tipo, en el orden de las secciones de la baraja. */
export function porTipo(cards: Card[]): { tipo: Tipo; titulo: string; cards: Card[] }[] {
  return SECCIONES_DE_LA_BARAJA.map(({ tipo, titulo }) => ({
    tipo,
    titulo,
    cards: cards.filter((c) => c.tipo === tipo),
  })).filter((g) => g.cards.length > 0);
}

/**
 * La lista que se ve como texto, para pegarla en un chat (WhatsApp, sobre
 * todo) o un foro: una carta por linea, con sus copias, y entre parentesis la
 * edicion y la frecuencia, que es lo que hace falta para saber que impresion
 * es. Un arte alternativo dice de donde sale («Arte de Templarios»), como el
 * pie de la imagen.
 *
 * Los titulos van entre asteriscos, que WhatsApp pinta en negrita y en
 * cualquier otro sitio se leen igual. Respeta el orden de `cards`: el de los
 * filtros que se ven.
 */
export function coleccionComoTexto(
  titulo: string,
  cards: Card[],
  copias: Readonly<Record<string, number>>,
): string {
  const n = (c: Card) => copias[c.id] ?? 0;
  const total = cards.reduce((s, c) => s + n(c), 0);
  const lineas = [`*${titulo}* (${total === 1 ? "1 carta" : `${total} cartas`})`];
  for (const g of porTipo(cards)) {
    lineas.push("", `*${g.titulo}* (${g.cards.reduce((s, c) => s + n(c), 0)})`);
    for (const c of g.cards) {
      const edicion = c.origen
        ? `Arte de ${origenTitle(c.origen)}`
        : editionTitle(c.edicion);
      lineas.push(`${n(c)}x ${c.nombre} (${edicion}, ${c.frecuencia})`);
    }
  }
  return lineas.join("\n");
}

/* ------------------------------------------------------------------ *
 * Respaldo
 * ------------------------------------------------------------------ */

const archivoSchema = z.object({
  app: z.literal("deckforge"),
  tipo: z.literal("coleccion"),
  v: z.literal(1),
  cartas: z.unknown(),
  quiero: z.optional(z.unknown()),
});

export function exportarColeccion(col: Coleccion): string {
  return JSON.stringify(
    {
      app: "deckforge",
      tipo: "coleccion",
      v: 1,
      exportado: new Date().toISOString(),
      cartas: col.tengo,
      quiero: col.quiero,
    },
    null,
    2,
  );
}

/** Lee un respaldo de coleccion. `null` si no lo es. Nunca lanza. */
export function importarColeccion(
  texto: string,
): { coleccion: Coleccion; descartadas: number } | null {
  if (texto.length > MAX_CHARS) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  const sobre = archivoSchema.safeParse(bruto);
  if (!sobre.success) return null;
  return sanearColeccion(sobre.data.cartas, sobre.data.quiero);
}

/* ------------------------------------------------------------------ *
 * La coleccion como sistema externo, igual que las barajas
 * (`deck-storage.ts`): useSyncExternalStore y sincronizacion entre pestanas.
 * ------------------------------------------------------------------ */

const disponible = () => typeof window !== "undefined";

let cache: Coleccion | null = null;
const oyentes = new Set<() => void>();

function avisar(): void {
  cache = null;
  for (const cb of oyentes) cb();
}

function alCambiarStorage(e: StorageEvent): void {
  if (e.key === COLECCION_KEY || e.key === null) avisar();
}

export function subscribeColeccion(cb: () => void): () => void {
  if (oyentes.size === 0 && disponible()) {
    window.addEventListener("storage", alCambiarStorage);
  }
  oyentes.add(cb);
  return () => {
    oyentes.delete(cb);
    if (oyentes.size === 0 && disponible()) {
      window.removeEventListener("storage", alCambiarStorage);
    }
  };
}

export function getColeccionSnapshot(): Coleccion {
  if (cache === null) {
    try {
      cache = disponible()
        ? parseColeccion(localStorage.getItem(COLECCION_KEY))
        : COLECCION_VACIA;
    } catch {
      cache = COLECCION_VACIA; // ventana privada, almacenamiento bloqueado
    }
  }
  return cache;
}

export function getServerColeccionSnapshot(): Coleccion {
  return COLECCION_VACIA;
}

/** Guarda la coleccion entera. Devuelve si pudo (cuota llena, bloqueo). */
export function saveColeccion(col: Coleccion): boolean {
  if (!disponible()) return false;
  try {
    const sobre = JSON.stringify({ v: 1, cartas: col.tengo, quiero: col.quiero });
    // Nunca se escribe lo que despues no se podria leer.
    if (sobre.length > MAX_CHARS) return false;
    localStorage.setItem(COLECCION_KEY, sobre);
    avisar();
    return true;
  } catch {
    return false;
  }
}
