import { copiesOf, setQuantity, totalCards } from "../deck";
import type { Deck, DeckEntry } from "../types";
import type { Lado } from "./red";
import { nombreEnSala, type MejorDe, type Sala } from "./sala";

/**
 * La serie del 1v1 (GAME.md, sesion 7): el marcador, como termino cada
 * juego y el cambio con el Mazo de Soporte entre juegos. Logica pura; lo
 * que cambia la sala lo decide la base (`supabase/mesa.sql`).
 */

export type Resultado = Lado | "empate";

/** Cuantos juegos hay que ganar: 2 al mejor de 3, 3 al mejor de 5. */
export function victoriasParaGanar(mejorDe: MejorDe): number {
  return Math.floor(mejorDe / 2) + 1;
}

/** El numero del juego que se esta jugando o que viene: los anulados se repiten. */
export function numeroDeJuego(sala: Sala): number {
  return sala.victorias_a + sala.victorias_b + sala.empates + 1;
}

/**
 * La semilla del barajado de cada ronda, desde la de la sala. La primera es
 * la misma (una partida empezada antes de la sesion 7 se rearma igual); las
 * siguientes se mezclan, para que cada juego baraje distinto.
 */
export function semillaDeRonda(semilla: number, ronda: number): number {
  if (ronda <= 1) return semilla;
  const mezcla = (semilla ^ Math.imul(ronda, 0x9e3779b1)) >>> 0;
  return mezcla === 0 ? 1 : mezcla;
}

/** Lo que alguien declara, dicho desde quien lo lee: «ganaste», «ganó Invitado». */
export function quienGano(resultado: Resultado, yo: Lado, sala: Sala): string {
  if (resultado === "empate") return "empate";
  return resultado === yo ? "tú" : nombreEnSala(sala, resultado);
}

/** Como termino el ultimo juego, para la pantalla entre juegos. */
export function textoDelUltimo(sala: Sala, yo: Lado): string {
  const rival: Lado = yo === "a" ? "b" : "a";
  switch (sala.ultimo) {
    case null:
      return "";
    case "empate":
      return "El juego terminó en empate: no suma al marcador.";
    case "anulado":
      return "No hubo acuerdo sobre el resultado: el juego se anula y se juega de nuevo.";
    default:
      if (sala.ultimo === yo) {
        return sala.rendido
          ? `Ganaste el juego: ${nombreEnSala(sala, rival)} se rindió.`
          : "Ganaste el juego.";
      }
      return sala.rendido
        ? `${nombreEnSala(sala, rival)} ganó el juego: te rendiste.`
        : `${nombreEnSala(sala, rival)} ganó el juego.`;
  }
}

/**
 * Cambia una copia de `sale` (del Castillo) por una de `entra` (del Mazo de
 * Soporte): una por una, y siempre con 50 en el Castillo (DAR, anexo 1).
 * `null` si no se puede: alguna no esta donde debe, o la que sale es el oro
 * inicial, que es una carta concreta apartada antes de empezar.
 */
export function cambiarConSide(deck: Deck, sale: string, entra: string): Deck | null {
  const enCastillo = copiesOf(deck, sale, "principal");
  const enSide = copiesOf(deck, entra, "side");
  if (enCastillo === 0 || enSide === 0 || sale === entra) return null;
  if (deck.oroInicial === sale) return null;
  let d = setQuantity(deck, sale, "principal", enCastillo - 1);
  d = setQuantity(d, sale, "side", copiesOf(d, sale, "side") + 1);
  d = setQuantity(d, entra, "side", enSide - 1);
  d = setQuantity(d, entra, "principal", copiesOf(d, entra, "principal") + 1);
  return d;
}

/** Lo que entro al Castillo y lo que salio, respecto de la baraja guardada. */
export function cambiosConSide(
  guardada: Deck,
  actual: Deck,
): { entraron: DeckEntry[]; salieron: DeckEntry[] } {
  const ids = new Set([...guardada.principal, ...actual.principal].map((e) => e.id));
  const entraron: DeckEntry[] = [];
  const salieron: DeckEntry[] = [];
  for (const id of ids) {
    const n = copiesOf(actual, id, "principal") - copiesOf(guardada, id, "principal");
    if (n > 0) entraron.push({ id, n });
    if (n < 0) salieron.push({ id, n: -n });
  }
  return { entraron, salieron };
}

/** Cuantas cartas se cambiaron con el side. */
export function cuantosCambios(guardada: Deck, actual: Deck): number {
  return totalCards(cambiosConSide(guardada, actual).entraron);
}
