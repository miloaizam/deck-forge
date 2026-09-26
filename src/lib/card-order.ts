import { EDITIONS } from "./editions";
import { FRECUENCIAS, type Card } from "./types";

/**
 * El orden en que se presenta el catalogo, en un solo lugar.
 *
 * Lo comparten las tres vistas que listan cartas —el catalogo, la grilla del
 * constructor y el contenido de una baraja—: si cada una ordenara a su manera, una
 * carta cambiaria de sitio al pasar de una a otra y habria que volver a
 * buscarla. Solo depende de la carta, nunca de cuantas copias lleve la baraja:
 * de eso depende que restar una copia no mueva su fila.
 */

const RANGO_FRECUENCIA = new Map(FRECUENCIAS.map((f, i) => [f, i]));

/**
 * Ediciones de la ultima en salir a la primera: Escuelas Elementales arriba y
 * Bushido al fondo. Es al reves que `EDITIONS`, que va en orden de salida.
 *
 * Las `parcial` —las de fuera del formato, que solo aportan cartas sueltas— se
 * quedan al final en su propio orden: son cuatro o cinco cartas y encabezar el
 * catalogo con ellas mentiria sobre lo que es el formato.
 */
const DEL_FORMATO = EDITIONS.filter((e) => !e.parcial);
const RANGO_EDICION = new Map<string, number>([
  ...DEL_FORMATO.map((e, i): [string, number] => [e.slug, DEL_FORMATO.length - 1 - i]),
  ...EDITIONS.filter((e) => e.parcial).map((e, i): [string, number] => [
    e.slug,
    DEL_FORMATO.length + i,
  ]),
]);

/**
 * El oro inicial de una edicion: la carta a arte completo, sin habilidad, con
 * que empieza la partida. Va nombrada "Oro Inicial <edicion>" en `data-src/`
 * (ver la seccion de datos de CLAUDE.md), que es lo que la reconoce aqui.
 *
 * La API le pone el numero mas alto de la edicion, asi que por codigo caeria
 * al final de los Oros; en la practica es el primero que se busca.
 */
export function esOroInicial(card: Card): boolean {
  return card.tipo === "Oro" && card.nombre.startsWith("Oro Inicial");
}

/**
 * Dentro del tramo de Oros de una edicion: primero el oro inicial, despues los
 * Oros que traen habilidad —que son cartas como cualquier otra— y al final los
 * Oros normales, que son el monton con que se paga todo.
 *
 * Solo se aplica dentro de la frecuencia Oro, donde las 124 cartas del catalogo
 * son de tipo Oro. En las demas frecuencias hay Oros mezclados con todo lo
 * otro, y ahi el tipo no manda sobre el numero de la carta.
 */
function rangoDentroDeOro(card: Card): number {
  if (esOroInicial(card)) return 0;
  return card.habilidad === "" ? 2 : 1;
}

/**
 * Por edicion (de la ultima a la primera) y dentro de ella por frecuencia, de
 * la mas rara a la mas comun, que es el orden de `FRECUENCIAS`.
 *
 * Los JSON de `data-src/` vienen en el orden en que los entrega la API, que
 * agrupa por frecuencia dentro de cada edicion pero no siempre bien —en
 * ContraAtaque llegaba derechamente barajada— y nunca entre ediciones. El
 * desempate final es el numero impreso de la carta, que dentro de una misma
 * frecuencia corre seguido.
 */
export function compareCards(a: Card, b: Card): number {
  // Una edicion que no este en EDITIONS va al final en vez de reventar.
  const edicion =
    (RANGO_EDICION.get(a.edicion) ?? EDITIONS.length) -
    (RANGO_EDICION.get(b.edicion) ?? EDITIONS.length);
  if (edicion !== 0) return edicion;

  const frecuencia =
    RANGO_FRECUENCIA.get(a.frecuencia)! - RANGO_FRECUENCIA.get(b.frecuencia)!;
  if (frecuencia !== 0) return frecuencia;

  if (a.frecuencia === "Oro") {
    const oro = rangoDentroDeOro(a) - rangoDentroDeOro(b);
    if (oro !== 0) return oro;
  }

  return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
}

/** El catalogo entero en ese orden, sin tocar el arreglo que recibe. */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}
