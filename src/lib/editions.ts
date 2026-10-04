/**
 * Las diez ediciones del formato Escuelas Elementales.
 *
 * `slug` es el que guardamos en el campo `edicion` de cada carta y el que va
 * en la URL de su pagina. Coincide con el de la API salvo en Escuelas
 * Elementales, que la API llama `escuelas_elementales` con guion BAJO: ese
 * valor vive en `API_SLUGS` de scripts/fetch_edition.py y no sale de ahi, para
 * que ni el dato ni la URL lleven un guion bajo que desentona y que se pierde
 * cuando el enlace va subrayado.
 *
 * `cargada` marca si su JSON ya existe en `data-src/`.
 *
 * La lista lleva ademas las ediciones de FUERA del formato, marcadas con
 * `parcial`. Estan aqui para que `editionTitle()` sepa como se llaman: sin
 * eso, el filtro del catalogo mostraria el slug pelado.
 */
export interface Edition {
  slug: string;
  titulo: string;
  cargada: boolean;
  /**
   * No es una de las diez ediciones. Va detras de ellas en la grilla y en el
   * filtro, y sin pagina propia salvo que lleve `paginaPropia`. Sus cartas
   * viven en `data-src/extras.json`; ver CLAUDE.md.
   */
  parcial?: boolean;
  /**
   * Una `parcial` que si tiene pagina en /catalogo/<slug>: Adicionales y Arte
   * Alternativo, que reunen decenas de cartas. Las demas parciales son de
   * cuatro cartas o ninguna, y no valen una ruta.
   */
  paginaPropia?: boolean;
}

export const EDITIONS: Edition[] = [
  { slug: "bushido", titulo: "Bushido", cargada: true },
  { slug: "sol-naciente", titulo: "Sol Naciente", cargada: true },
  { slug: "dominio", titulo: "Dominio", cargada: true },
  { slug: "contraataque", titulo: "ContraAtaque", cargada: true },
  { slug: "aguila-imperial", titulo: "Águila Imperial", cargada: true },
  { slug: "steampunk", titulo: "Steampunk", cargada: true },
  { slug: "axis-mundi", titulo: "Axis Mundi", cargada: true },
  { slug: "hijos-del-sol", titulo: "Hijos del Sol", cargada: true },
  { slug: "legado-gotico", titulo: "Legado Gótico", cargada: true },
  { slug: "escuelas-elementales", titulo: "Escuelas Elementales", cargada: true },

  // Las dos que no son ediciones del juego sino del catalogo: Adicionales
  // (cartas de packs y de ediciones de fuera del formato que se juegan en el)
  // y Arte Alternativo (otras impresiones de cartas que ya estan cargadas).
  // Salen en este orden detras de las diez.
  {
    slug: "adicionales",
    titulo: "Adicionales",
    cargada: true,
    parcial: true,
    paginaPropia: true,
  },
  {
    slug: "arte-alternativo",
    titulo: "Arte Alternativo",
    cargada: true,
    parcial: true,
    paginaPropia: true,
  },

  // De fuera del formato, sin cartas hoy. Se quedan para que el nombre se lea
  // bien si alguna vuelve a aportar una carta suelta.
  { slug: "helenica", titulo: "Helénica", cargada: true, parcial: true },
  { slug: "imperio", titulo: "Imperio", cargada: true, parcial: true },
  { slug: "espada-sagrada", titulo: "Espada Sagrada", cargada: true, parcial: true },
  { slug: "dominios-de-ra", titulo: "Dominios de Ra", cargada: true, parcial: true },
  { slug: "cruzadas", titulo: "Cruzadas", cargada: true, parcial: true },
  { slug: "furia", titulo: "Furia", cargada: true, parcial: true },
];

/**
 * Las que tienen pagina propia de catalogo: las diez y las `parcial` que
 * llevan `paginaPropia`.
 */
export const LOADED_EDITIONS = EDITIONS.filter(
  (e) => e.cargada && (!e.parcial || e.paginaPropia),
);

/**
 * De donde sale cada impresion de Arte Alternativo (campo `origen` de la
 * carta), de la edicion mas NUEVA a la mas vieja: en ese orden se presentan.
 * Son ediciones del juego que no son del formato, asi que no estan en
 * `EDITIONS`. "Promo 2017" es la tanda promocional de ese ano, que la API
 * guarda dentro de Sol Naciente.
 */
export const ORIGENES = [
  { slug: "conjuros", titulo: "Conjuros" },
  { slug: "tierra-austral", titulo: "Tierra Austral" },
  { slug: "cuentos-de-ultratumba", titulo: "Cuentos de Ultratumba" },
  { slug: "dinastia-del-dragon", titulo: "Dinastía del Dragón" },
  { slug: "invasion-oscura", titulo: "Invasión Oscura" },
  { slug: "terrores-nocturnos", titulo: "Terrores Nocturnos" },
  { slug: "arsenal", titulo: "Arsenal" },
  { slug: "kilimanjaro", titulo: "Kilimanjaro" },
  { slug: "olimpia", titulo: "Olimpia" },
  { slug: "dharma", titulo: "Dharma" },
  { slug: "kemet", titulo: "Kemet" },
  { slug: "promo-2017", titulo: "Promo 2017" },
  { slug: "templarios", titulo: "Templarios" },
  { slug: "camelot", titulo: "Camelot" },
  { slug: "midgard", titulo: "Midgard" },
  { slug: "asgard", titulo: "Asgard" },
  { slug: "rebelion", titulo: "Sumeria Rebelión" },
  { slug: "sumeria", titulo: "Sumeria" },
  { slug: "furiaext", titulo: "Furia Extensión" },
  { slug: "furia", titulo: "Furia" },
] as const;

/** Titulo legible del origen de un arte alternativo. */
export function origenTitle(slug: string): string {
  return ORIGENES.find((o) => o.slug === slug)?.titulo ?? slug;
}

export function findEdition(slug: string): Edition | undefined {
  return EDITIONS.find((e) => e.slug === slug);
}

/** Titulo legible a partir del slug guardado en la carta. */
export function editionTitle(slug: string): string {
  return findEdition(slug)?.titulo ?? slug;
}
