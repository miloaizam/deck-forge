import type { ResolvedDeck } from "./deck-rules";

/**
 * El testeador de manos de /baraja: sacar al azar una mano inicial para ver
 * que puede salir.
 *
 * Reglas, tal como las pidio el proyecto:
 * - La mano inicial es de MANO_INICIAL cartas del principal. El side no entra:
 *   no se juega de salida.
 * - El **oro inicial no esta en el mazo que se baraja**: se aparta antes de
 *   empezar. Se quita UNA copia de esa carta (una baraja legal lleva una sola,
 *   pero una a medio armar puede llevar mas y las demas si se barajan).
 * - El mulligan vuelve a barajar y roba una carta menos cada vez: 8, 7, 6…
 *
 * Logica pura, con el azar inyectado: el test lo reemplaza por uno fijo.
 */

export const MANO_INICIAL = 8;

/** Lo menos que puede quedar una mano a fuerza de mulligans. */
export const MANO_MINIMA = 1;

/** Devuelve un numero en [0, 1), como Math.random. */
export type Azar = () => number;

/** Los ids del mazo que se baraja: una entrada por copia, sin el oro inicial. */
export function mazoParaRobar(res: ResolvedDeck, oroInicial: string | null): string[] {
  const mazo: string[] = [];
  let apartado = false;
  for (const { card, n } of res.principal) {
    for (let i = 0; i < n; i++) {
      if (!apartado && card.id === oroInicial) {
        apartado = true;
        continue;
      }
      mazo.push(card.id);
    }
  }
  return mazo;
}

/**
 * Fisher-Yates sobre una copia: cada orden sale con la misma probabilidad.
 * (El "sort con un random" que se ve por ahi no es uniforme.)
 */
export function barajar<T>(cartas: readonly T[], azar: Azar = Math.random): T[] {
  const mazo = [...cartas];
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return mazo;
}

/** Baraja y roba `cuantas`, o todas las que haya si el mazo es mas corto. */
export function robarMano(
  mazo: readonly string[],
  cuantas: number,
  azar: Azar = Math.random,
): string[] {
  return barajar(mazo, azar).slice(0, Math.max(0, cuantas));
}
