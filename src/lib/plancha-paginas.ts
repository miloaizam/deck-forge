/**
 * Como se reparte una plancha de cartas (la imagen de una baraja o de la
 * coleccion) en paginas. Logica pura, sin canvas: el dibujo vive en
 * `components/card-sheet-image.ts`, que usa estas medidas.
 *
 * Una pagina mide 1600 de ancho y como mucho `ALTO_MAXIMO` de alto. Antes, lo
 * que no cabia sumaba columnas y achicaba las cartas: con 1000 cartas quedaban
 * de ~77 px y no se leian. Ensanchar no sirve, porque el limite es de AREA
 * (Safari de iOS), asi que ahora las cartas van siempre a diez por fila y lo
 * que no cabe pasa a la pagina siguiente.
 */

export const ANCHO = 1600;
export const MARGEN = 56;
export const HUECO = 14;
/** Cartas por fila, siempre. */
export const COLUMNAS = 10;
/**
 * Alto maximo de una pagina. Safari de iOS no dibuja un canvas de mas de ~16,7
 * millones de pixeles (y lo deja en blanco sin avisar): a 1600 de ancho, unos
 * 10 000 de alto.
 */
export const ALTO_MAXIMO = 10_000;
/** Alto de una linea del pie bajo la carta (nombre, edicion, frecuencia). */
export const LINEA_PIE = 18;
/** Titulo de un tramo, encima de sus cartas. */
export const ALTO_TITULO_TRAMO = 40;
/** Espacio bajo las cartas de un tramo, antes del siguiente. */
export const ESPACIO_TRAS_TRAMO = 24;

/** El tamano de una carta con `COLUMNAS` por fila. */
export function medidas() {
  const w = Math.floor((ANCHO - MARGEN * 2 - HUECO * (COLUMNAS - 1)) / COLUMNAS);
  // Proporcion del arte: 512 x 732 (CARD_RATIO).
  return { w, h: Math.round((w * 732) / 512) };
}

interface TramoMedible<C> {
  titulo: string;
  cuenta: number;
  cartas: C[];
}

/** Lo que suma el pie bajo cada fila: el de la carta con mas lineas. */
export function altoPieDeCarta(tramos: TramoMedible<{ pie?: string[] }>[]): number {
  const n = Math.max(
    0,
    ...tramos.flatMap((t) => t.cartas.map((c) => c.pie?.length ?? 0)),
  );
  return n === 0 ? 0 : 8 + n * LINEA_PIE;
}

/** Alto de una fila de cartas, con su pie y el hueco hasta la siguiente. */
export function altoFila(tramos: TramoMedible<{ pie?: string[] }>[]): number {
  return medidas().h + altoPieDeCarta(tramos) + HUECO;
}

export interface TramoEnPagina<C> {
  titulo: string;
  /** El total del tramo entero, tambien en sus trozos: es lo que se tiene. */
  cuenta: number;
  cartas: C[];
  /** Sigue de la pagina anterior: el titulo lleva «(cont.)». */
  continua: boolean;
}

/** Alto que ocupan unos tramos ya repartidos. */
export function altoTramos<C>(tramos: TramoEnPagina<C>[], fila: number): number {
  return tramos.reduce(
    (s, t) =>
      s +
      ALTO_TITULO_TRAMO +
      Math.ceil(t.cartas.length / COLUMNAS) * fila +
      ESPACIO_TRAS_TRAMO,
    0,
  );
}

/**
 * Reparte los tramos en paginas de diez columnas.
 *
 * `fijoPrimera` y `fijoResto` son lo que cada pagina gasta fuera de las
 * cartas (margen, cabecera, pie con el logotipo): la primera lleva la nota y
 * el aviso rojo, las demas no. Un tramo que se corta sigue en la pagina
 * siguiente con `continua`, y nunca queda un titulo solo al pie de una
 * pagina: si no cabe con al menos una fila, el tramo pasa a la siguiente.
 */
export function paginar<C>(
  tramos: TramoMedible<C>[],
  fila: number,
  fijoPrimera: number,
  fijoResto: number,
): TramoEnPagina<C>[][] {
  const paginas: TramoEnPagina<C>[][] = [[]];
  let usado = 0;
  let disponible = ALTO_MAXIMO - fijoPrimera;
  const nueva = () => {
    paginas.push([]);
    usado = 0;
    disponible = ALTO_MAXIMO - fijoResto;
  };
  const extra = ALTO_TITULO_TRAMO + ESPACIO_TRAS_TRAMO;

  for (const t of tramos) {
    const filas = Math.ceil(t.cartas.length / COLUMNAS);
    if (filas === 0) {
      // Un tramo sin cartas (no deberia llegar, pero no se pierde el titulo).
      if (usado + extra > disponible && paginas[paginas.length - 1].length > 0) nueva();
      paginas[paginas.length - 1].push({ ...t, cartas: [], continua: false });
      usado += extra;
      continue;
    }
    let hecha = 0;
    let continua = false;
    // `continue` dentro del do-while salta a la condicion: vuelve a intentar
    // la misma fila en la pagina nueva.
    do {
      let caben = Math.floor((disponible - usado - extra) / fila);
      if (caben < 1) {
        // En una pagina vacia se fuerza una fila: no hay donde mas ponerla.
        if (paginas[paginas.length - 1].length > 0) {
          nueva();
          continue;
        }
        caben = 1;
      }
      const n = Math.min(caben, filas - hecha);
      paginas[paginas.length - 1].push({
        titulo: t.titulo,
        cuenta: t.cuenta,
        cartas: t.cartas.slice(hecha * COLUMNAS, (hecha + n) * COLUMNAS),
        continua,
      });
      usado += extra + n * fila;
      hecha += n;
      continua = true;
      if (hecha < filas) nueva();
    } while (hecha < filas);
  }
  return paginas;
}
