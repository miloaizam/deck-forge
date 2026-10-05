import { z } from "zod";

import { cardRefSchema, SECCIONES_DE_LA_BARAJA, type Card, type Tipo } from "./types";

/**
 * La coleccion del usuario: las cartas que tiene, con sus copias, y las que le
 * faltan, que son las que QUIERE conseguir (no todo el catalogo: nadie
 * colecciona las 2652).
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
  /** Id de impresion -> copias (de 1 en adelante). */
  readonly tengo: Readonly<Record<string, number>>;
  /** Las impresiones que quiere conseguir. Nunca una que ya tiene. */
  readonly quiero: readonly string[];
}

export const COLECCION_VACIA: Coleccion = Object.freeze({
  tengo: Object.freeze({}),
  quiero: Object.freeze([]),
});

const copiasSchema = z.number().int().min(1).max(MAX_COPIAS_COLECCION);

/**
 * Valida las entradas una a una: una rota no se lleva a las demas. Los ids
 * viejos se traducen (`ids-anteriores.ts`) y, si dos acaban en el mismo, se
 * suman. Nunca lanza.
 */
export function sanearColeccion(
  cartas: unknown,
  quiero: unknown,
): { coleccion: Coleccion; descartadas: number } {
  const tengo: Record<string, number> = {};
  let descartadas = 0;
  let leidas = 0;
  if (typeof cartas === "object" && cartas !== null && !Array.isArray(cartas)) {
    for (const [clave, valor] of Object.entries(cartas)) {
      const id = cardRefSchema.safeParse(clave);
      const n = copiasSchema.safeParse(valor);
      if (++leidas > MAX_ENTRADAS || !id.success || !n.success) {
        descartadas++;
        continue;
      }
      tengo[id.data] = Math.min(MAX_COPIAS_COLECCION, (tengo[id.data] ?? 0) + n.data);
    }
  }
  const deseadas = new Set<string>();
  if (Array.isArray(quiero)) {
    for (const valor of quiero) {
      const id = cardRefSchema.safeParse(valor);
      if (++leidas > MAX_ENTRADAS || !id.success) {
        descartadas++;
        continue;
      }
      if (!(id.data in tengo)) deseadas.add(id.data);
    }
  }
  return { coleccion: { tengo, quiero: [...deseadas] }, descartadas };
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
  Object.keys(col.tengo).length === 0 && col.quiero.length === 0;

/**
 * La coleccion con `n` copias de `id`; con 0 sale de las que tiene. Tenerla
 * la saca de las que faltan: ya no falta.
 */
export function conCopias(col: Coleccion, id: string, n: number): Coleccion {
  const acotado = Math.max(0, Math.min(MAX_COPIAS_COLECCION, Math.trunc(n)));
  const tengo: Record<string, number> = { ...col.tengo };
  if (acotado === 0) delete tengo[id];
  else tengo[id] = acotado;
  return {
    tengo,
    quiero: acotado > 0 ? col.quiero.filter((q) => q !== id) : col.quiero,
  };
}

/** Suma o quita una impresion de las que faltan. Una que ya tiene no entra. */
export function alternarQuiero(col: Coleccion, id: string): Coleccion {
  if (col.quiero.includes(id)) {
    return { ...col, quiero: col.quiero.filter((q) => q !== id) };
  }
  if (id in col.tengo) return col;
  return { ...col, quiero: [...col.quiero, id] };
}

/**
 * Junta una coleccion importada con la que hay. Por impresion se queda la
 * MAYOR de las dos cantidades y las que faltan se suman: importar el mismo
 * respaldo dos veces no duplica nada, e importar uno viejo no borra nada.
 */
export function fusionar(actual: Coleccion, importada: Coleccion): Coleccion {
  const tengo: Record<string, number> = { ...actual.tengo };
  for (const [id, n] of Object.entries(importada.tengo)) {
    tengo[id] = Math.max(tengo[id] ?? 0, n);
  }
  const quiero = [...new Set([...actual.quiero, ...importada.quiero])].filter(
    (id) => !(id in tengo),
  );
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
 * Una lista de texto para pasar por Discord o WhatsApp, que es como se
 * negocian los cambios: por tipo, con el codigo para no confundir artes. Las
 * que tiene llevan las copias; las que faltan, no.
 */
export function coleccionComoTexto(
  titulo: string,
  cards: Card[],
  col: Coleccion,
  conCopiasPuestas: boolean,
): string {
  const out = [`${titulo} (${cards.length})`];
  for (const g of porTipo(cards)) {
    out.push("", `${g.titulo} (${g.cards.length})`);
    for (const c of g.cards) {
      out.push(
        conCopiasPuestas
          ? `${col.tengo[c.id] ?? 0} ${c.nombre} (${c.codigo})`
          : `${c.nombre} (${c.codigo})`,
      );
    }
  }
  return out.join("\n");
}

/* ------------------------------------------------------------------ *
 * Respaldo
 * ------------------------------------------------------------------ */

const archivoSchema = z.object({
  app: z.literal("deckforge"),
  tipo: z.literal("coleccion"),
  v: z.literal(1),
  cartas: z.unknown(),
  quiero: z.unknown().optional(),
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
