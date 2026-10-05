import MiniSearch from "minisearch";

import { compareEditions } from "./card-order";
import { EDITIONS } from "./editions";
import { coincideTipo, esClaseDeOro, OPCIONES_DE_TIPO } from "./oros";
import { ESCUELAS, FRECUENCIAS, KEYWORDS_IMPRESAS, RAZAS, type Card } from "./types";

/**
 * Cuantas cartas por pagina.
 *
 * El catalogo llena siete columnas y el constructor seis, que ademas cede
 * ancho al panel de la baraja: cada uno cierra sus filas con un numero distinto.
 */
export const PAGE_SIZE = 35;
export const PAGE_SIZE_BUILDER = 30;

/** Un filtro sin valor es `""`: significa "todos". */
export interface CatalogFilters {
  query: string;
  edicion: string;
  habilidad: string;
  tipo: string;
  raza: string;
  escuela: string;
  frecuencia: string;
  coste: string;
  fuerza: string;
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  edicion: "",
  habilidad: "",
  tipo: "",
  raza: "",
  escuela: "",
  frecuencia: "",
  coste: "",
  fuerza: "",
};

export function hasActiveFilters(f: CatalogFilters): boolean {
  return Object.values(f).some((v) => v !== "");
}

/**
 * Cuantos filtros hay puestos, sin contar la busqueda: es el numero que lleva
 * el boton de filtros, y la busqueda tiene su propio campo a la vista.
 */
export function countActiveFilters(f: CatalogFilters): number {
  const claves = Object.keys(f) as (keyof CatalogFilters)[];
  return claves.filter((k) => k !== "query" && f[k] !== "").length;
}

/**
 * Opciones de cada filtro.
 *
 * Tipo, raza, escuela y frecuencia usan las listas canonicas del formato: la
 * oferta es la misma en toda edicion, asi el filtro no cambia de forma segun
 * lo que este cargado. Tipo, raza, escuela y habilidad van en orden
 * alfabetico; frecuencia, de la mas rara a la mas comun, que es su orden
 * natural; edicion, de la mas nueva a la mas vieja. Coste y fuerza si se derivan de las cartas, porque son
 * rangos abiertos.
 *
 * El atributo NO tiene faceta propia: Luz y Oscuridad son keywords impresas
 * como cualquier otra y se filtran desde `habilidades`, que sale del campo
 * `keywords`. Una novena faceta que dijera lo mismo solo parte la busqueda en
 * dos sitios.
 *
 * `ediciones` queda vacia cuando todas las cartas son de la misma edicion: en
 * /catalogo/<edicion> el filtro no tendria nada que elegir, y un Select sin
 * opciones no se dibuja.
 */
export interface Facets {
  ediciones: string[];
  habilidades: string[];
  tipos: string[];
  razas: string[];
  escuelas: string[];
  frecuencias: string[];
  costes: string[];
  fuerzas: string[];
}

/**
 * En castellano y sin que las tildes manden al final: "Bárbaro" va con la B y
 * "Única" con la U. Un sort() a secas compara codigos y las pondria detras de
 * la Z.
 */
const COLLATOR = new Intl.Collator("es");
const alfabetico = (lista: readonly string[]) => [...lista].sort(COLLATOR.compare);

export function buildFacets(cards: Card[]): Facets {
  const numeric = (pick: (c: Card) => number | null) =>
    [
      ...new Set(
        cards
          .map(pick)
          .filter((v): v is number => v !== null)
          .map(String),
      ),
    ].sort((a, b) => Number(a) - Number(b));

  // Ediciones de la mas nueva a la mas vieja, igual que las ordena la grilla
  // (compareEditions): Escuelas Elementales arriba, Bushido al final, y las
  // parciales despues.
  const presentes = new Set(cards.map((c) => c.edicion));
  const ediciones = EDITIONS.filter((e) => presentes.has(e.slug))
    .map((e) => e.slug)
    .sort(compareEditions);

  // Las keywords que trae cada carta incluyen etiquetas internas de busqueda
  // de la API ("Destruir", "que controles"): al filtro solo suben las que el
  // juego imprime de verdad.
  const declaradas = new Set(cards.flatMap((c) => c.keywords));

  return {
    ediciones: ediciones.length > 1 ? ediciones : [],
    habilidades: alfabetico(KEYWORDS_IMPRESAS.filter((k) => declaradas.has(k))),
    // Los tipos y, bajo "Oro", sus tres clases (`oros.ts`). Las clases solo si
    // hay cartas: en Escuelas Elementales no hay Oro inicial de edicion.
    tipos: OPCIONES_DE_TIPO.filter(
      (t) => !esClaseDeOro(t) || cards.some((c) => coincideTipo(c, t)),
    ),
    razas: alfabetico(RAZAS),
    escuelas: alfabetico(ESCUELAS),
    frecuencias: [...FRECUENCIAS],
    costes: numeric((c) => c.coste),
    fuerzas: numeric((c) => c.fuerza),
  };
}

/** Minusculas y sin tildes: "samurai" encuentra Samurái y "tugarin", Tugarín. */
function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Indice de busqueda por nombre y habilidad.
 *
 * Todas las palabras tienen que estar (`AND`): con el `OR` por defecto, cada
 * palabra de "Thor el Poderoso" sumaba sus propias cartas y la busqueda
 * devolvia media coleccion. `prefix` solo va en la ULTIMA palabra, la que se
 * esta escribiendo, para que "kyu" encuentre Kyubi sin que "el" encuentre
 * "elegir". Y `fuzzy` (una letra mal escrita, que con nombres japoneses
 * transliterados pasa seguido) solo desde cuatro letras: en una palabra corta
 * una letra de diferencia ya es otra palabra.
 */
export function buildSearchIndex(cards: Card[]): MiniSearch<Card> {
  const index = new MiniSearch<Card>({
    idField: "id",
    fields: ["nombre", "habilidad", "raza", "codigo"],
    storeFields: ["id"],
    processTerm: normalizeTerm,
    searchOptions: {
      combineWith: "AND",
      prefix: (_term, i, terms) => i === terms.length - 1,
      fuzzy: (term) => (term.length >= 4 ? 0.2 : false),
      boost: { nombre: 3, codigo: 2 },
    },
  });
  index.addAll(cards);
  return index;
}

export function applyFilters(
  cards: Card[],
  filters: CatalogFilters,
  index: MiniSearch<Card>,
): Card[] {
  let result = cards;

  const query = filters.query.trim();
  if (query) {
    const ranked = index.search(query);
    const order = new Map(ranked.map((r, i) => [r.id as string, i]));
    result = result
      .filter((c) => order.has(c.id))
      .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }

  const matches = (value: string | number | null, wanted: string) =>
    wanted === "" || String(value) === wanted;

  return result.filter(
    (c) =>
      matches(c.edicion, filters.edicion) &&
      (filters.habilidad === "" || c.keywords.includes(filters.habilidad)) &&
      coincideTipo(c, filters.tipo) &&
      matches(c.raza, filters.raza) &&
      matches(c.escuela, filters.escuela) &&
      matches(c.frecuencia, filters.frecuencia) &&
      matches(c.coste, filters.coste) &&
      matches(c.fuerza, filters.fuerza),
  );
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Rango 1-indexado que se esta mostrando, para el pie de la paginacion. */
export function pageRange(
  page: number,
  total: number,
  size = PAGE_SIZE,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * size + 1, to: Math.min(page * size, total) };
}

/**
 * Los filtros del catalogo en la URL (`?q=dragon&tipo=Aliado&p=2`), para que
 * sobrevivan a ir y volver, al recargar y al compartir el enlace.
 *
 * La URL es una entrada de afuera (seguridad #4 de CLAUDE.md): cada valor se
 * acepta solo si es una opcion que el filtro ofrece, el texto se acota y la
 * pagina se lee como entero positivo. Lo demas se ignora en silencio.
 */
const CLAVES_URL: Record<
  Exclude<keyof CatalogFilters, "query">,
  [string, keyof Facets]
> = {
  edicion: ["ed", "ediciones"],
  habilidad: ["hab", "habilidades"],
  tipo: ["tipo", "tipos"],
  raza: ["raza", "razas"],
  escuela: ["esc", "escuelas"],
  frecuencia: ["frec", "frecuencias"],
  coste: ["coste", "costes"],
  fuerza: ["fuerza", "fuerzas"],
};

const MAX_BUSQUEDA_URL = 100;

export function filtersFromSearch(
  search: string,
  facets: Facets,
): { filters: CatalogFilters; page: number } {
  const params = new URLSearchParams(search);
  const filters: CatalogFilters = { ...EMPTY_FILTERS };
  filters.query = (params.get("q") ?? "").slice(0, MAX_BUSQUEDA_URL);
  for (const [clave, [param, faceta]] of Object.entries(CLAVES_URL)) {
    const valor = params.get(param);
    if (valor && facets[faceta].includes(valor)) {
      // `clave` sale de las claves de CLAVES_URL, que son claves de CatalogFilters.
      filters[clave as keyof CatalogFilters] = valor;
    }
  }
  const p = Number.parseInt(params.get("p") ?? "", 10);
  return { filters, page: Number.isFinite(p) && p > 1 && p < 10_000 ? p : 1 };
}

export function filtersToSearch(filters: CatalogFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.slice(0, MAX_BUSQUEDA_URL));
  for (const [clave, [param]] of Object.entries(CLAVES_URL)) {
    const valor = filters[clave as keyof CatalogFilters]; // ver arriba
    if (valor) params.set(param, valor);
  }
  if (page > 1) params.set("p", String(page));
  const s = params.toString();
  return s ? `?${s}` : "";
}
