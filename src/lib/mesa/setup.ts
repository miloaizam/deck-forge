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
 * Los uids se reparten DESPUES de barajar: si salieran en el orden de la
 * baraja, las copias de una carta tendrian numeros seguidos, y en el 1v1
 * ver una sola dejaria adivinar cuales son las otras.
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
    let oroApartado = false;
    for (const { id: cartaId, n: copias } of deck.principal) {
      for (let i = 0; i < copias; i++) {
        if (cartaId === deck.oroInicial && !oroApartado) {
          oroApartado = true;
          zonas.reserva.push(crear(cartaId));
        } else {
          mazo.push(cartaId);
        }
      }
    }
    const castillo = barajar(mazo, azar).map(crear);
    const side = barajar(
      deck.side.flatMap(({ id: cartaId, n: copias }) =>
        Array.from({ length: copias }, () => cartaId),
      ),
      azar,
    );
    zonas.soporte = side.map(crear);
    zonas.mano = castillo.splice(0, MANO_INICIAL);
    zonas.castillo = castillo;
    jugadores.push({ id, zonas });
  }

  const primero = jugadores[0]?.id ?? "";
  return {
    fichas,
    jugadores,
    turno: { numero: 1, activo: primero, fase: "agrupacion", prioridad: null },
    revelado: null,
    registro: [{ n: 1, por: primero, tipo: "preparar", cartas: [] }],
  };
}
