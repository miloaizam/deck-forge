import { readFile } from "node:fs/promises";
import path from "node:path";

import { sortCards } from "./card-order";
import { buildFacets, PAGE_SIZE, paginate, type Facets } from "./catalog";
import { conErratas } from "./erratas";
import { catalogSchema, type Card, type Formato } from "./types";

/**
 * Lee el catalogo generado por `scripts/build_cards.py`.
 *
 * Corre solo en tiempo de build (Server Component + `output: "export"`). Lo
 * que un Server Component pase de aqui a una isla de cliente viaja dentro del
 * HTML: para el catalogo entero, el navegador tiene `useCatalogo`. Se valida
 * con Zod aunque sea un archivo propio: si el generador cambia de forma,
 * preferimos fallar en el build y no en la cara del usuario.
 *
 * Sale con la Fe de Erratas y la Banlist del formato aplicadas
 * (`conErratas`): el catalogo muestra el texto vigente, no el impreso que
 * guarda el JSON. El HTML estatico es siempre Estandar.
 *
 * Sale ya ordenado con `compareCards`, que es el orden que comparten el
 * catalogo, la grilla del constructor y el contenido de una baraja.
 */
export async function getCards(formato: Formato = "estandar"): Promise<Card[]> {
  const file = path.join(process.cwd(), "public", "data", "cards.json");
  const raw = await readFile(file, "utf-8");
  return sortCards(
    catalogSchema.parse(JSON.parse(raw)).map((c) => conErratas(c, formato)),
  );
}

/** Las cartas de una sola edicion, por su slug. */
export async function getCardsByEdition(slug: string): Promise<Card[]> {
  const cards = await getCards();
  return cards.filter((c) => c.edicion === slug);
}

/**
 * Lo que la pagina de un catalogo necesita en el HTML estatico: su primera
 * pagina sin filtros, cuantas cartas tiene y sus facetas. El resto de las
 * cartas lo baja el navegador (`useCatalogo`): incrustar el catalogo entero
 * en cada HTML costaba ~1,45 MB por pagina.
 */
export async function getCatalogPage(
  slug?: string,
  pageSize = PAGE_SIZE,
): Promise<{
  inicial: Card[];
  total: number;
  facets: Facets;
}> {
  const cards = slug ? await getCardsByEdition(slug) : await getCards();
  return {
    inicial: paginate(cards, 1, pageSize),
    total: cards.length,
    facets: buildFacets(cards),
  };
}
