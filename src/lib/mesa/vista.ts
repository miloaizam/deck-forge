import { anfitriona, enJuego, ubicar, type Ficha, type Mesa } from "./table";

/**
 * Quien ve que (GAME.md §5, «Lo publico y lo privado van separados»):
 *
 * | Zona                   | La ve                                        |
 * | Castillo               | nadie, salvo lo revelado para el o los dos   |
 * | Mano y Soporte         | solo su dueno                                |
 * | En juego               | todos; boca abajo, solo su controlador       |
 * | Cementerio y Destierro | todos                                        |
 *
 * Una ficha anexada o puesta debajo se ve como la zona de su anfitriona.
 * Esto es lo que, en el 1v1, decide que viaja por la red.
 */
export function veCarta(mesa: Mesa, uid: string, observador: string): boolean {
  const f = mesa.fichas[uid];
  if (!f) return false;
  const r = mesa.revelado;
  if (r && r.uids.includes(uid) && (r.para === "todos" || r.para === observador)) {
    return true;
  }
  const donde = ubicar(mesa, anfitriona(mesa, uid));
  if (!donde) return false;
  switch (donde.zona) {
    case "castillo":
      return false;
    case "mano":
    case "soporte":
      return f.dueno === observador;
    case "cementerio":
    case "destierro":
      return true;
    default:
      return enJuego(donde.zona) && (!f.bocaAbajo || f.controlador === observador);
  }
}

/** Si TODOS los jugadores ven la carta: solo entonces el registro la nombra. */
export function esPublica(mesa: Mesa, uid: string): boolean {
  return mesa.jugadores.every((j) => veCarta(mesa, uid, j.id));
}

/** Una ficha tal como la ve un jugador: sin carta si no le toca verla. */
export type FichaVista = Omit<Ficha, "cartaId"> & { cartaId: string | null };

export type MesaVista = Omit<Mesa, "fichas"> & { fichas: Record<string, FichaVista> };

/** La mesa como la ve `observador`. Las demas fichas pierden su carta. */
export function vista(mesa: Mesa, observador: string): MesaVista {
  const fichas: Record<string, FichaVista> = {};
  for (const [uid, f] of Object.entries(mesa.fichas)) {
    fichas[uid] = veCarta(mesa, uid, observador) ? f : { ...f, cartaId: null };
  }
  return { ...mesa, fichas };
}
