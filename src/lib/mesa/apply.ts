import { barajar, MANO_MINIMA, type Azar } from "../hand-test";
import {
  anfitriona,
  dependientes,
  enJuego,
  jugador,
  ubicar,
  MAX_NOTA,
  type Contador,
  type Ficha,
  type Mesa,
  type Zona,
} from "./table";

/**
 * Todo lo que se le puede hacer a la mesa. Ninguna accion aplica reglas: son
 * las manos del jugador (GAME.md §1). Lo unico que la mesa decide sola es lo
 * que el DAR fija y no deja otra salida: lo que sale del juego va a las zonas
 * de su DUENO (§10.5, §10.47) y pierde sus marcas, y lo que estaba anexado o
 * debajo de una carta que sale va al Cementerio de su dueno (§10.38).
 */
export type Accion =
  /**
   * Lleva una ficha a una zona. `jugador` dice de que lado: en juego, eso
   * cambia el controlador; fuera del juego no cuenta, va con su dueno.
   * `posicion` es el indice en la lista: por defecto el tope en el Castillo
   * (0) y el final en las demas. Mover una anexada la suelta.
   */
  | { tipo: "mover"; uid: string; jugador: string; zona: Zona; posicion?: number }
  | { tipo: "voltear"; uid: string }
  /** Del tope del Castillo a la mano, de a una (DAR §10.45). */
  | { tipo: "robar"; jugador: string; n?: number }
  /** Del tope del Castillo al Cementerio (DAR §10.7). */
  | { tipo: "botar"; jugador: string; n: number }
  | { tipo: "barajar"; jugador: string }
  /** La mano vuelve al Castillo, se baraja y se roba una menos. */
  | { tipo: "mulligan"; jugador: string }
  /** Ataque vuelve a Defensa y el Oro Pagado a la Reserva (DAR §9). */
  | { tipo: "agrupar"; jugador: string }
  /** Anexa un Arma a un Aliado en juego (DAR §10.39). */
  | { tipo: "portar"; uid: string; portador: string }
  /** Pone una carta debajo de otra en juego (DAR §10.38). */
  | { tipo: "ponerDebajo"; uid: string; encima: string }
  | { tipo: "contador"; uid: string; contador: Contador; delta: number }
  | { tipo: "fuerza"; uid: string; delta: number }
  | { tipo: "nota"; uid: string; texto: string }
  /** Borra los modificadores de Fuerza de toda la mesa (fin de turno). */
  | { tipo: "limpiarTemporales" };

/**
 * Aplica una accion sin tocar `mesa`: devuelve otra. Una accion que no se
 * puede hacer (una ficha que no existe, anexar algo a si mismo) devuelve la
 * misma mesa, sin lanzar: lo que llegue por la red no tiene que tumbarla.
 *
 * El azar solo lo usan barajar y mulligan; el test lo reemplaza por uno fijo.
 */
export function apply(mesa: Mesa, accion: Accion, azar: Azar = Math.random): Mesa {
  const m = structuredClone(mesa);
  return aplicarSobre(m, accion, azar) ? m : mesa;
}

/** Muta `m`, que ya es una copia. Devuelve si hizo algo. */
function aplicarSobre(m: Mesa, a: Accion, azar: Azar): boolean {
  switch (a.tipo) {
    case "mover":
      return mover(m, a.uid, a.jugador, a.zona, a.posicion);

    case "voltear": {
      const f = m.fichas[a.uid];
      if (!f) return false;
      f.bocaAbajo = !f.bocaAbajo;
      return true;
    }

    case "robar":
    case "botar": {
      const j = jugador(m, a.jugador);
      const pedidas = a.n ?? 1;
      if (!j || !Number.isFinite(pedidas)) return false;
      const n = Math.min(Math.max(0, Math.floor(pedidas)), j.zonas.castillo.length);
      if (n === 0) return false;
      const destino = a.tipo === "robar" ? "mano" : "cementerio";
      j.zonas[destino].push(...j.zonas.castillo.splice(0, n));
      return true;
    }

    case "barajar": {
      const j = jugador(m, a.jugador);
      if (!j) return false;
      j.zonas.castillo = barajar(j.zonas.castillo, azar);
      return true;
    }

    case "mulligan": {
      const j = jugador(m, a.jugador);
      if (!j || j.zonas.mano.length === 0) return false;
      const cuantas = Math.max(MANO_MINIMA, j.zonas.mano.length - 1);
      const castillo = barajar([...j.zonas.castillo, ...j.zonas.mano], azar);
      j.zonas.mano = castillo.splice(0, cuantas);
      j.zonas.castillo = castillo;
      return true;
    }

    case "agrupar": {
      const j = jugador(m, a.jugador);
      if (!j) return false;
      j.zonas.defensa.push(...j.zonas.ataque.splice(0));
      j.zonas.reserva.push(...j.zonas.oroPagado.splice(0));
      return true;
    }

    case "portar":
      return anexar(m, a.uid, a.portador, "portadaPor");

    case "ponerDebajo":
      return anexar(m, a.uid, a.encima, "debajoDe");

    case "contador": {
      const f = m.fichas[a.uid];
      if (!f || !Number.isFinite(a.delta)) return false;
      const valor = Math.max(0, (f.contadores[a.contador] ?? 0) + Math.trunc(a.delta));
      if (valor === 0) delete f.contadores[a.contador];
      else f.contadores[a.contador] = valor;
      return true;
    }

    case "fuerza": {
      const f = m.fichas[a.uid];
      if (!f || !Number.isFinite(a.delta)) return false;
      f.fuerza += Math.trunc(a.delta);
      return true;
    }

    case "nota": {
      const f = m.fichas[a.uid];
      if (!f) return false;
      f.nota = a.texto.trim().slice(0, MAX_NOTA);
      return true;
    }

    case "limpiarTemporales":
      for (const f of Object.values(m.fichas)) f.fuerza = 0;
      return true;
  }
}

function mover(
  m: Mesa,
  uid: string,
  lado: string,
  zona: Zona,
  posicion: number | undefined,
): boolean {
  const f = m.fichas[uid];
  if (!f) return false;
  const destino = jugador(m, enJuego(zona) ? lado : f.dueno);
  if (!destino) return false;

  sacar(m, uid);

  if (enJuego(zona)) {
    cambiarControlador(m, uid, destino.id);
  } else {
    salirDelJuego(m, uid);
  }

  const lista = destino.zonas[zona];
  const porDefecto = zona === "castillo" ? 0 : lista.length;
  const i = Math.min(Math.max(0, Math.trunc(posicion ?? porDefecto)), lista.length);
  lista.splice(Number.isFinite(i) ? i : porDefecto, 0, uid);
  return true;
}

/** El controlador de una ficha y de todo lo que lleva anexado o debajo. */
function cambiarControlador(m: Mesa, uid: string, controlador: string): void {
  m.fichas[uid].controlador = controlador;
  for (const d of dependientes(m, uid)) cambiarControlador(m, d.uid, controlador);
}

/** Saca una ficha de su lista o la suelta de su anfitriona. */
function sacar(m: Mesa, uid: string): void {
  const f = m.fichas[uid];
  f.portadaPor = null;
  f.debajoDe = null;
  const donde = ubicar(m, uid);
  if (donde) donde.jugador.zonas[donde.zona].splice(donde.indice, 1);
}

/**
 * La carta vuelve a ser de su dueno y pierde lo que se le hizo en juego. Lo
 * que tenia anexado o debajo va al Cementerio de SU dueno, que puede ser otro.
 */
function salirDelJuego(m: Mesa, uid: string): void {
  const f = m.fichas[uid];
  f.controlador = f.dueno;
  f.bocaAbajo = false;
  f.contadores = {};
  f.fuerza = 0;
  f.nota = "";
  for (const d of dependientes(m, uid)) {
    d.portadaPor = null;
    d.debajoDe = null;
    salirDelJuego(m, d.uid);
    jugador(m, d.dueno)?.zonas.cementerio.push(d.uid);
  }
}

function anexar(
  m: Mesa,
  uid: string,
  host: string,
  campo: "portadaPor" | "debajoDe",
): boolean {
  const f = m.fichas[uid];
  if (!f || !m.fichas[host] || cuelgaDe(m, host, uid)) return false;
  // La anfitriona tiene que estar en juego.
  const raiz = anfitriona(m, host);
  const donde = ubicar(m, raiz);
  if (!donde || !enJuego(donde.zona)) return false;

  sacar(m, uid);
  f[campo] = host;
  cambiarControlador(m, uid, m.fichas[raiz].controlador);
  return true;
}

/** Si `uid` es `host` o alguna de las fichas de las que cuelga: anexar haria un ciclo. */
function cuelgaDe(m: Mesa, host: string, uid: string): boolean {
  let actual: string | null = host;
  for (let i = 0; actual && i < 100; i++) {
    if (actual === uid) return true;
    const f: Ficha | undefined = m.fichas[actual];
    actual = f?.portadaPor ?? f?.debajoDe ?? null;
  }
  return false;
}
