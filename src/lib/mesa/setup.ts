import type { Deck } from "../types";
import { barajar, MANO_INICIAL, type Azar } from "../hand-test";
import { zonasVacias, type Ficha, type Jugador, type Mesa } from "./table";

/**
 * Prepara un juego desde barajas guardadas (DAR, preparar cada juego):
 * - el **oro inicial** empieza en la Reserva: se aparta UNA copia (una baraja
 *   legal lleva una sola; una a medio armar puede llevar mas, y las demas se
 *   barajan, igual que en `hand-test.ts`);
 * - el resto del principal, **barajado**, es el Castillo;
 * - se roban **8** a la mano;
 * - el side queda en el Mazo de Soporte.
 *
 * La mesa no revisa que la baraja cumpla: eso lo decide quien la llama.
 */
export function newTable(
  asientos: readonly { id: string; deck: Deck }[],
  azar: Azar = Math.random,
): Mesa {
  const fichas: Record<string, Ficha> = {};
  const jugadores: Jugador[] = [];

  for (const { id, deck } of asientos) {
    let n = 0;
    const crear = (cartaId: string): string => {
      const uid = `${id}-${++n}`;
      fichas[uid] = {
        uid,
        cartaId,
        dueno: id,
        controlador: id,
        bocaAbajo: false,
        portadaPor: null,
        debajoDe: null,
        contadores: {},
        fuerza: 0,
        nota: "",
      };
      return uid;
    };

    const zonas = zonasVacias();
    const mazo: string[] = [];
    for (const { id: cartaId, n: copias } of deck.principal) {
      for (let i = 0; i < copias; i++) {
        const uid = crear(cartaId);
        if (cartaId === deck.oroInicial && zonas.reserva.length === 0) {
          zonas.reserva.push(uid);
        } else {
          mazo.push(uid);
        }
      }
    }
    for (const { id: cartaId, n: copias } of deck.side) {
      for (let i = 0; i < copias; i++) zonas.soporte.push(crear(cartaId));
    }

    const castillo = barajar(mazo, azar);
    zonas.mano = castillo.splice(0, MANO_INICIAL);
    zonas.castillo = castillo;
    jugadores.push({ id, zonas });
  }

  return { fichas, jugadores };
}
