import { EDITIONS } from "./editions";
import { fueraDelBloque } from "./erratas";
import { FRECUENCIAS_DEL_FORMATO } from "./formatos";
import type { Card, Formato, Frecuencia } from "./types";

/**
 * Si una carta entra en un formato (`formatos.ts`): por su frecuencia en las
 * diez ediciones y, si es de fuera del bloque EE, porque la Banlist del
 * formato la nombre.
 */

/** Por que una carta no entra en un formato. */
export type MotivoFuera = "frecuencia" | "fuera-del-bloque";

const ORIGINALES = new Set(EDITIONS.filter((e) => !e.parcial).map((e) => e.slug));

const FRECUENCIAS = new WeakMap<readonly Card[], Map<string, Set<Frecuencia>>>();

/**
 * Las frecuencias de cada carta (`identidad`) en las diez ediciones, o en
 * todas sus impresiones si no tiene ninguna ahi. Se calcula una vez por
 * catalogo.
 */
export function frecuenciasPorIdentidad(
  cards: readonly Card[],
): Map<string, Set<Frecuencia>> {
  const hecho = FRECUENCIAS.get(cards);
  if (hecho) return hecho;
  const originales = new Map<string, Set<Frecuencia>>();
  const todas = new Map<string, Set<Frecuencia>>();
  for (const c of cards) {
    const destino = ORIGINALES.has(c.edicion) ? [originales, todas] : [todas];
    for (const m of destino) {
      const s = m.get(c.identidad) ?? new Set<Frecuencia>();
      s.add(c.frecuencia);
      m.set(c.identidad, s);
    }
  }
  for (const [k, s] of todas) if (!originales.has(k)) originales.set(k, s);
  FRECUENCIAS.set(cards, originales);
  return originales;
}

/**
 * Si la carta no entra en el formato, y por que: por su frecuencia o por ser
 * de fuera del bloque EE sin que la Banlist del formato la nombre. `null` si
 * entra. Una baneada SI entra aqui: eso lo dice `estaBaneada`.
 */
export function motivoFueraDeFormato(
  card: Pick<Card, "nombre" | "identidad" | "frecuencia">,
  formato: Formato,
  frecuencias: Map<string, Set<Frecuencia>>,
): MotivoFuera | null {
  if (fueraDelBloque(card, formato)) return "fuera-del-bloque";
  const admitidas = FRECUENCIAS_DEL_FORMATO[formato];
  if (admitidas === null) return null;
  const suyas = frecuencias.get(card.identidad) ?? new Set([card.frecuencia]);
  return admitidas.some((f) => suyas.has(f)) ? null : "frecuencia";
}

const EN_FORMATO = new WeakMap<readonly Card[], Map<Formato, Card[]>>();

/**
 * Las cartas del catalogo que entran en el formato. La misma lista para el
 * mismo catalogo y formato: de ella salen indices de busqueda, que son caros.
 */
export function cartasEnFormato(cards: readonly Card[], formato: Formato): Card[] {
  const porFormato = EN_FORMATO.get(cards) ?? new Map<Formato, Card[]>();
  EN_FORMATO.set(cards, porFormato);
  const hecha = porFormato.get(formato);
  if (hecha) return hecha;
  const frecuencias = frecuenciasPorIdentidad(cards);
  const nueva = cards.filter(
    (c) => motivoFueraDeFormato(c, formato, frecuencias) === null,
  );
  porFormato.set(formato, nueva);
  return nueva;
}
