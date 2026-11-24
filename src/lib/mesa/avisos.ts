import { jugador, type Mesa } from "./table";

/** La mano maxima (DAR, Fase de Robar): pasado esto, el dueno descarta a mano. */
export const MANO_MAXIMA = 8;

export type Aviso = { tipo: "castillo-vacio" } | { tipo: "mano-larga"; cartas: number };

/**
 * Lo que la mesa avisa y no decide (GAME.md §4): quedarse sin Castillo es
 * perder el juego (DAR §3.1), pero el resultado lo declaran los jugadores; y
 * con mas de 8 en la mano, el dueno elige que descartar.
 */
export function avisos(mesa: Mesa, id: string): Aviso[] {
  const j = jugador(mesa, id);
  if (!j) return [];
  const lista: Aviso[] = [];
  if (j.zonas.castillo.length === 0) lista.push({ tipo: "castillo-vacio" });
  if (j.zonas.mano.length > MANO_MAXIMA) {
    lista.push({ tipo: "mano-larga", cartas: j.zonas.mano.length });
  }
  return lista;
}
