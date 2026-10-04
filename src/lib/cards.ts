import { readFile } from "node:fs/promises";
import path from "node:path";

import { sortCards } from "./card-order";
import { catalogSchema, type Card } from "./types";

/**
 * Lee el catalogo generado por `scripts/build_cards.py`.
 *
 * Corre solo en tiempo de build (Server Component + `output: "export"`), asi
 * que el JSON nunca viaja entero al navegador salvo que lo pidamos. Se valida
 * con Zod aunque sea un archivo propio: si el generador cambia de forma,
 * preferimos fallar en el build y no en la cara del usuario.
 *
 * Sale ya ordenado con `compareCards`, que es el orden que comparten el
 * catalogo, la grilla del constructor y el contenido de una baraja.
 */
export async function getCards(): Promise<Card[]> {
  const file = path.join(process.cwd(), "public", "data", "cards.json");
  const raw = await readFile(file, "utf-8");
  return sortCards(catalogSchema.parse(JSON.parse(raw)));
}

/** Las cartas de una sola edicion, por su slug. */
export async function getCardsByEdition(slug: string): Promise<Card[]> {
  const cards = await getCards();
  return cards.filter((c) => c.edicion === slug);
}

/**
 * Las impresiones de OTRAS ediciones de las cartas de una edicion: la pagina
 * de una edicion solo lleva sus cartas, y el selector de impresiones del modal
 * necesita tambien las demas. Viajan solo las que comparten identidad.
 */
export async function getOtherPrintings(slug: string): Promise<Card[]> {
  const cards = await getCards();
  const identidades = new Set(
    cards.filter((c) => c.edicion === slug).map((c) => c.identidad),
  );
  return cards.filter((c) => c.edicion !== slug && identidades.has(c.identidad));
}
