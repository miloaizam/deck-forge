import { z } from "zod";

import { compareEditions } from "./card-order";
import { editionTitle } from "./editions";
import { cardRefSchema, SECCIONES_DE_LA_BARAJA, type Card, type Tipo } from "./types";

/**
 * La coleccion del usuario: cuantas copias tiene de cada impresion.
 *
 * Se cuenta por IMPRESION (`id`) y no por `identidad`: quien colecciona
 * distingue el Kirin normal del Milenaria, y del dato por impresion sale el
 * otro (cartas distintas) sumando; al reves no se puede. Vive en
 * `localStorage`, aparte de las barajas, y como todo lo que sale de ahi se
 * valida al leerse (CLAUDE.md, seguridad #4).
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

/** Id de impresion -> copias (de 1 en adelante; las que no tiene no estan). */
export type Coleccion = Readonly<Record<string, number>>;

const VACIA: Coleccion = Object.freeze({});

const copiasSchema = z.number().int().min(1).max(MAX_COPIAS_COLECCION);

/**
 * Valida las entradas una a una: una rota no se lleva a las demas. Los ids
 * viejos se traducen (`ids-anteriores.ts`) y, si dos acaban en el mismo, se
 * suman. Nunca lanza.
 */
export function sanearColeccion(bruto: unknown): {
  cartas: Coleccion;
  descartadas: number;
} {
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    return { cartas: VACIA, descartadas: 0 };
  }
  const cartas: Record<string, number> = {};
  let descartadas = 0;
  let leidas = 0;
  for (const [clave, valor] of Object.entries(bruto)) {
    if (++leidas > MAX_ENTRADAS) {
      descartadas++;
      continue;
    }
    const id = cardRefSchema.safeParse(clave);
    const n = copiasSchema.safeParse(valor);
    if (!id.success || !n.success) {
      descartadas++;
      continue;
    }
    cartas[id.data] = Math.min(MAX_COPIAS_COLECCION, (cartas[id.data] ?? 0) + n.data);
  }
  return { cartas, descartadas };
}

/** Lee lo guardado en localStorage. Lo que no cuadre se descarta. */
export function parseColeccion(raw: string | null): Coleccion {
  if (!raw || raw.length > MAX_CHARS) return VACIA;
  try {
    const bruto: unknown = JSON.parse(raw);
    if (typeof bruto !== "object" || bruto === null || !("cartas" in bruto)) {
      return VACIA;
    }
    return sanearColeccion(bruto.cartas).cartas;
  } catch {
    return VACIA;
  }
}

/** La coleccion con `n` copias de `id`; con 0 la impresion sale. */
export function conCopias(col: Coleccion, id: string, n: number): Coleccion {
  const acotado = Math.max(0, Math.min(MAX_COPIAS_COLECCION, Math.trunc(n)));
  const siguiente: Record<string, number> = { ...col };
  if (acotado === 0) delete siguiente[id];
  else siguiente[id] = acotado;
  return siguiente;
}

/**
 * Junta una coleccion importada con la que hay. Por impresion se queda la
 * MAYOR de las dos cantidades: importar el mismo respaldo dos veces no duplica
 * nada, e importar uno viejo no borra lo marcado despues.
 */
export function fusionar(actual: Coleccion, importada: Coleccion): Coleccion {
  const out: Record<string, number> = { ...actual };
  for (const [id, n] of Object.entries(importada)) {
    out[id] = Math.max(out[id] ?? 0, n);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Cuentas
 * ------------------------------------------------------------------ */

export interface Avance {
  tengo: number;
  total: number;
}

export interface ResumenColeccion {
  /** Impresiones con al menos una copia, sobre las del catalogo. */
  impresiones: Avance;
  /** Cartas distintas (por `identidad`) con al menos una impresion. */
  cartas: Avance;
  /** Copias en total, sumando todas las impresiones. */
  copias: number;
  /** Impresiones de las que hay mas de tres copias: lo que sobra para jugar. */
  repetidas: number;
  /** Por edicion, de la mas nueva a la mas vieja, como el catalogo. */
  porEdicion: (Avance & { slug: string; titulo: string })[];
}

/**
 * Solo cuenta impresiones que estan en el catalogo: una id guardada de una
 * carta que ya no existe no infla los totales (y se conserva, por si vuelve).
 */
export function resumir(cards: Card[], col: Coleccion): ResumenColeccion {
  const identidades = new Map<string, boolean>();
  const ediciones = new Map<string, Avance>();
  let tengo = 0;
  let copias = 0;
  let repetidas = 0;

  for (const c of cards) {
    const n = col[c.id] ?? 0;
    const ed = ediciones.get(c.edicion) ?? { tengo: 0, total: 0 };
    ed.total++;
    if (n > 0) {
      ed.tengo++;
      tengo++;
      copias += n;
      if (n > 3) repetidas++;
    }
    ediciones.set(c.edicion, ed);
    identidades.set(c.identidad, (identidades.get(c.identidad) ?? false) || n > 0);
  }

  return {
    impresiones: { tengo, total: cards.length },
    cartas: {
      tengo: [...identidades.values()].filter(Boolean).length,
      total: identidades.size,
    },
    copias,
    repetidas,
    porEdicion: [...ediciones.entries()]
      .sort(([a], [b]) => compareEditions(a, b))
      .map(([slug, a]) => ({ slug, titulo: editionTitle(slug), ...a })),
  };
}

/** Porcentaje entero, sin redondear a 100 lo que no esta completo. */
export function porcentaje({ tengo, total }: Avance): number {
  if (total === 0) return 0;
  const p = Math.round((tengo / total) * 100);
  return p === 100 && tengo < total ? 99 : p;
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
 * negocian los cambios: por tipo, con el codigo para no confundir artes.
 * Las obtenidas llevan las copias; las faltantes, no.
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
      const n = col[c.id] ?? 0;
      out.push(
        conCopiasPuestas ? `${n} ${c.nombre} (${c.codigo})` : `${c.nombre} (${c.codigo})`,
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
});

export function exportarColeccion(col: Coleccion): string {
  return JSON.stringify(
    {
      app: "deckforge",
      tipo: "coleccion",
      v: 1,
      exportado: new Date().toISOString(),
      cartas: col,
    },
    null,
    2,
  );
}

/** Lee un respaldo de coleccion. `null` si no lo es. Nunca lanza. */
export function importarColeccion(
  texto: string,
): { cartas: Coleccion; descartadas: number } | null {
  if (texto.length > MAX_CHARS) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  const sobre = archivoSchema.safeParse(bruto);
  if (!sobre.success) return null;
  return sanearColeccion(sobre.data.cartas);
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
      cache = disponible() ? parseColeccion(localStorage.getItem(COLECCION_KEY)) : VACIA;
    } catch {
      cache = VACIA; // ventana privada, almacenamiento bloqueado
    }
  }
  return cache;
}

export function getServerColeccionSnapshot(): Coleccion {
  return VACIA;
}

/** Guarda la coleccion entera. Devuelve si pudo (cuota llena, bloqueo). */
export function saveColeccion(col: Coleccion): boolean {
  if (!disponible()) return false;
  try {
    const sobre = JSON.stringify({ v: 1, cartas: col });
    // Nunca se escribe lo que despues no se podria leer.
    if (sobre.length > MAX_CHARS) return false;
    localStorage.setItem(COLECCION_KEY, sobre);
    avisar();
    return true;
  } catch {
    return false;
  }
}
