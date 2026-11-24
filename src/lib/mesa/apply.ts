import { barajar, MANO_MINIMA, type Azar } from "../hand-test";
import {
  anfitriona,
  dependientes,
  enJuego,
  jugador,
  ubicar,
  FASES,
  MAX_NOTA,
  MAX_REGISTRO,
  type Contador,
  type EntradaRegistro,
  type Fase,
  type Ficha,
  type Mesa,
  type Zona,
} from "./table";
import { esPublica } from "./vista";

/** Donde se puede buscar (DAR §10.8). */
export const ZONAS_BUSCABLES = ["castillo", "cementerio", "soporte"] as const;
export type ZonaBuscable = (typeof ZONAS_BUSCABLES)[number];

/**
 * Todo lo que se le puede hacer a la mesa. Ninguna accion aplica reglas: son
 * las manos del jugador (GAME.md §1). Lo unico que la mesa decide sola es lo
 * que el DAR fija y no deja otra salida: lo que sale del juego va a las zonas
 * de su DUENO (§10.5, §10.47) y pierde sus marcas, lo que estaba anexado o
 * debajo de una carta que sale va al Cementerio de su dueno (§10.38), y
 * buscar en el Castillo lo baraja siempre (§10.8).
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
  | { tipo: "limpiarTemporales" }
  /** Las n de arriba del Castillo de `jugador`, solo para quien mira (DAR §10.34). */
  | { tipo: "mirar"; jugador: string; n: number }
  /** Lo mismo, a la vista de los dos (DAR §10.35). */
  | { tipo: "mostrar"; jugador: string; n: number }
  /** Devuelve arriba lo mirado o mostrado, en el orden elegido. */
  | { tipo: "ordenarTope"; uids: string[] }
  /** Cierra lo mirado o mostrado sin tocar el orden, o abandona una busqueda. */
  | { tipo: "cerrarRevelado" }
  /** Recorre una zona propia entera para buscar. `mostrar`: «Buscar y mostrar». */
  | { tipo: "abrirBusqueda"; zona: ZonaBuscable; mostrar: boolean }
  /** Toma la carta elegida de la busqueda abierta, o ninguna (fallar a proposito). */
  | { tipo: "buscar"; uid: string | null }
  /** Esas cartas del Cementerio van al Castillo, que se baraja (DAR §10.5). */
  | { tipo: "barajarDesdeCementerio"; jugador: string; uids: string[] }
  | { tipo: "fase"; fase: Fase }
  | { tipo: "siguienteFase" }
  | { tipo: "pasarTurno" }
  /** Quien tiene la prioridad en la Guerra de Talismanes. */
  | { tipo: "prioridad"; jugador: string }
  /** Moneda: con dos jugadores, decide quien comienza. */
  | { tipo: "sortear" };

/** Lo que una accion deja en el registro, antes de numerarla. */
type Linea = Omit<EntradaRegistro, "n" | "por">;

/**
 * Aplica una accion sin tocar `mesa`: devuelve otra. Una accion que no se
 * puede hacer (una ficha que no existe, anexar algo a si mismo, tocar la
 * mano ajena) devuelve la misma mesa, sin lanzar: lo que llegue por la red
 * no tiene que tumbarla.
 *
 * `por` es quien la hace: por defecto el primer jugador, que en la practica
 * es el unico. El azar solo lo usan barajar, mulligan, buscar y la moneda.
 */
export function apply(
  mesa: Mesa,
  accion: Accion,
  azar: Azar = Math.random,
  por: string = mesa.jugadores[0]?.id ?? "",
): Mesa {
  if (!puede(mesa, accion, por)) return mesa;
  const m = structuredClone(mesa);
  const linea = aplicarSobre(m, accion, azar, por);
  if (!linea) return mesa;
  revisarRevelado(m);
  const n = (m.registro.at(-1)?.n ?? 0) + 1;
  m.registro.push({ n, por, ...linea });
  if (m.registro.length > MAX_REGISTRO)
    m.registro.splice(0, m.registro.length - MAX_REGISTRO);
  return m;
}

/**
 * Quien puede hacer que. La mano y el Soporte son de su dueno: solo el las
 * toca, roba, hace mulligan, baraja su Castillo y busca. Todo lo demas lo
 * puede hacer cualquiera de los dos, porque los efectos tocan la mesa del
 * otro: botar del Castillo ajeno (el dano), mirarlo, mover lo que esta en
 * juego (GAME.md §2).
 */
export function puede(mesa: Mesa, a: Accion, por: string): boolean {
  if (!jugador(mesa, por)) return false;
  const privadaAjena = (uid: string): boolean => {
    const donde = ubicar(mesa, anfitriona(mesa, uid));
    return (
      donde !== null &&
      (donde.zona === "mano" || donde.zona === "soporte") &&
      mesa.fichas[uid]?.dueno !== por
    );
  };
  switch (a.tipo) {
    case "mover":
    case "voltear":
    case "contador":
    case "fuerza":
    case "nota":
    case "portar":
    case "ponerDebajo":
      return !privadaAjena(a.uid);
    case "robar":
    case "mulligan":
    case "barajar":
    case "agrupar":
      return a.jugador === por;
    case "ordenarTope":
    case "cerrarRevelado":
      return mesa.revelado?.por === por;
    case "buscar":
      return mesa.revelado?.modo === "buscar" && mesa.revelado.por === por;
    default:
      return true;
  }
}

/** El id de la carta si los dos la ven; si no, `null`. */
function siPublica(m: Mesa, uid: string): string | null {
  return esPublica(m, uid) ? m.fichas[uid].cartaId : null;
}

/** Lo revelado deja de valer si sus cartas ya no estan donde estaban. */
function revisarRevelado(m: Mesa): void {
  const r = m.revelado;
  if (!r) return;
  const lista = jugador(m, r.jugador)?.zonas[r.zona] ?? [];
  const mirado = r.modo === "buscar" ? lista : lista.slice(0, r.uids.length);
  const igual =
    mirado.length === r.uids.length && r.uids.every((u) => mirado.includes(u));
  if (!igual) m.revelado = null;
}

/** Muta `m`, que ya es una copia. Devuelve su linea del registro, o `null` si no hizo nada. */
function aplicarSobre(m: Mesa, a: Accion, azar: Azar, por: string): Linea | null {
  switch (a.tipo) {
    case "mover": {
      const f = m.fichas[a.uid];
      if (!f) return null;
      const desde = ubicar(m, anfitriona(m, a.uid))?.zona;
      const antes = siPublica(m, a.uid);
      if (!mover(m, a.uid, a.jugador, a.zona, a.posicion)) return null;
      return {
        tipo: "mover",
        cartas: [antes ?? siPublica(m, a.uid)],
        desde,
        hacia: a.zona,
      };
    }

    case "voltear": {
      const f = m.fichas[a.uid];
      if (!f) return null;
      const antes = siPublica(m, a.uid);
      f.bocaAbajo = !f.bocaAbajo;
      return {
        tipo: "voltear",
        cartas: [antes ?? siPublica(m, a.uid)],
        detalle: f.bocaAbajo ? "abajo" : "arriba",
      };
    }

    case "robar":
    case "botar": {
      const j = jugador(m, a.jugador);
      const pedidas = a.n ?? 1;
      if (!j || !Number.isFinite(pedidas)) return null;
      const n = Math.min(Math.max(0, Math.floor(pedidas)), j.zonas.castillo.length);
      if (n === 0) return null;
      const destino = a.tipo === "robar" ? "mano" : "cementerio";
      const movidas = j.zonas.castillo.splice(0, n);
      j.zonas[destino].push(...movidas);
      return {
        tipo: a.tipo,
        cartas: a.tipo === "botar" ? movidas.map((u) => siPublica(m, u)) : [],
        cuantas: n,
        objetivo: j.id,
      };
    }

    case "barajar": {
      const j = jugador(m, a.jugador);
      if (!j) return null;
      j.zonas.castillo = barajar(j.zonas.castillo, azar);
      return { tipo: "barajar", cartas: [], objetivo: j.id };
    }

    case "mulligan": {
      const j = jugador(m, a.jugador);
      if (!j || j.zonas.mano.length === 0) return null;
      const cuantas = Math.max(MANO_MINIMA, j.zonas.mano.length - 1);
      const castillo = barajar([...j.zonas.castillo, ...j.zonas.mano], azar);
      j.zonas.mano = castillo.splice(0, cuantas);
      j.zonas.castillo = castillo;
      return { tipo: "mulligan", cartas: [], cuantas };
    }

    case "agrupar": {
      const j = jugador(m, a.jugador);
      if (!j) return null;
      j.zonas.defensa.push(...j.zonas.ataque.splice(0));
      j.zonas.reserva.push(...j.zonas.oroPagado.splice(0));
      return { tipo: "agrupar", cartas: [] };
    }

    case "portar":
    case "ponerDebajo": {
      const host = a.tipo === "portar" ? a.portador : a.encima;
      const antes = m.fichas[a.uid] ? siPublica(m, a.uid) : null;
      const campo = a.tipo === "portar" ? "portadaPor" : "debajoDe";
      if (!anexar(m, a.uid, host, campo)) return null;
      return { tipo: a.tipo, cartas: [antes ?? siPublica(m, a.uid), siPublica(m, host)] };
    }

    case "contador": {
      const f = m.fichas[a.uid];
      if (!f || !Number.isFinite(a.delta)) return null;
      const delta = Math.trunc(a.delta);
      const valor = Math.max(0, (f.contadores[a.contador] ?? 0) + delta);
      if (valor === 0) delete f.contadores[a.contador];
      else f.contadores[a.contador] = valor;
      return {
        tipo: "contador",
        cartas: [siPublica(m, a.uid)],
        detalle: a.contador,
        cuantas: delta,
      };
    }

    case "fuerza": {
      const f = m.fichas[a.uid];
      if (!f || !Number.isFinite(a.delta)) return null;
      f.fuerza += Math.trunc(a.delta);
      return {
        tipo: "fuerza",
        cartas: [siPublica(m, a.uid)],
        cuantas: Math.trunc(a.delta),
      };
    }

    case "nota": {
      const f = m.fichas[a.uid];
      if (!f) return null;
      f.nota = a.texto.trim().slice(0, MAX_NOTA);
      return { tipo: "nota", cartas: [siPublica(m, a.uid)], detalle: f.nota };
    }

    case "limpiarTemporales":
      for (const f of Object.values(m.fichas)) f.fuerza = 0;
      return { tipo: "limpiarTemporales", cartas: [] };

    case "mirar":
    case "mostrar": {
      const j = jugador(m, a.jugador);
      if (!j || !Number.isFinite(a.n)) return null;
      const n = Math.min(Math.max(0, Math.floor(a.n)), j.zonas.castillo.length);
      if (n === 0) return null;
      const uids = j.zonas.castillo.slice(0, n);
      const mostrar = a.tipo === "mostrar";
      m.revelado = {
        jugador: j.id,
        zona: "castillo",
        uids,
        para: mostrar ? "todos" : por,
        por,
        modo: a.tipo,
        mostrar: false,
      };
      return {
        tipo: a.tipo,
        cartas: mostrar ? uids.map((u) => m.fichas[u].cartaId) : [],
        cuantas: n,
        objetivo: j.id,
      };
    }

    case "ordenarTope": {
      const r = m.revelado;
      if (!r || r.modo === "buscar") return null;
      const mismas =
        a.uids.length === r.uids.length &&
        new Set(a.uids).size === a.uids.length &&
        a.uids.every((u) => r.uids.includes(u));
      const j = jugador(m, r.jugador);
      if (!mismas || !j) return null;
      j.zonas.castillo = [...a.uids, ...j.zonas.castillo.slice(r.uids.length)];
      m.revelado = null;
      return {
        tipo: "ordenarTope",
        cartas: [],
        cuantas: a.uids.length,
        objetivo: r.jugador,
      };
    }

    case "cerrarRevelado": {
      const r = m.revelado;
      if (!r) return null;
      m.revelado = null;
      const tambienBaraja = r.modo === "buscar" && r.zona === "castillo";
      const j = jugador(m, r.jugador);
      // Abandonar una busqueda en el Castillo tambien lo baraja (DAR §10.8).
      if (tambienBaraja && j) j.zonas.castillo = barajar(j.zonas.castillo, azar);
      return {
        tipo: "cerrarRevelado",
        cartas: [],
        detalle: r.modo,
        desde: r.zona,
        objetivo: r.jugador,
      };
    }

    case "abrirBusqueda": {
      const j = jugador(m, por);
      if (!j || !(ZONAS_BUSCABLES as readonly string[]).includes(a.zona)) return null;
      m.revelado = {
        jugador: por,
        zona: a.zona,
        uids: [...j.zonas[a.zona]],
        para: por,
        por,
        modo: "buscar",
        mostrar: a.mostrar,
      };
      return {
        tipo: "abrirBusqueda",
        cartas: [],
        desde: a.zona,
        detalle: a.mostrar ? "mostrar" : undefined,
      };
    }

    case "buscar": {
      const r = m.revelado;
      const j = jugador(m, por);
      if (!r || r.modo !== "buscar" || !j) return null;
      const lista = j.zonas[r.zona];
      if (a.uid !== null && !lista.includes(a.uid)) return null;
      let carta: string | null = null;
      if (a.uid !== null) {
        carta = r.mostrar ? m.fichas[a.uid].cartaId : siPublica(m, a.uid);
        m.revelado = null;
        mover(m, a.uid, por, "mano", undefined);
      }
      m.revelado = null;
      if (r.zona === "castillo") j.zonas.castillo = barajar(j.zonas.castillo, azar);
      return {
        tipo: "buscar",
        cartas: a.uid === null ? [] : [carta],
        desde: r.zona,
        detalle: a.uid === null ? "nada" : r.mostrar ? "mostrar" : undefined,
      };
    }

    case "barajarDesdeCementerio": {
      const j = jugador(m, a.jugador);
      if (!j) return null;
      const elegidas = [...new Set(a.uids)].filter((u) => j.zonas.cementerio.includes(u));
      if (elegidas.length === 0) return null;
      const cartas = elegidas.map((u) => m.fichas[u].cartaId);
      for (const u of elegidas) mover(m, u, j.id, "castillo", undefined);
      j.zonas.castillo = barajar(j.zonas.castillo, azar);
      return { tipo: "barajarDesdeCementerio", cartas, objetivo: j.id };
    }

    case "fase": {
      if (!FASES.includes(a.fase)) return null;
      cambiarFase(m, a.fase);
      return { tipo: "fase", cartas: [], detalle: a.fase };
    }

    case "siguienteFase": {
      const siguiente = FASES[FASES.indexOf(m.turno.fase) + 1];
      if (!siguiente) return null;
      cambiarFase(m, siguiente);
      return { tipo: "fase", cartas: [], detalle: siguiente };
    }

    case "pasarTurno": {
      const i = m.jugadores.findIndex((j) => j.id === m.turno.activo);
      const siguiente = m.jugadores[(i + 1) % m.jugadores.length];
      if (!siguiente) return null;
      m.turno = {
        numero: m.turno.numero + 1,
        activo: siguiente.id,
        fase: "agrupacion",
        prioridad: null,
      };
      return {
        tipo: "pasarTurno",
        cartas: [],
        cuantas: m.turno.numero,
        objetivo: siguiente.id,
      };
    }

    case "prioridad": {
      if (!jugador(m, a.jugador)) return null;
      m.turno.prioridad = a.jugador;
      return { tipo: "prioridad", cartas: [], objetivo: a.jugador };
    }

    case "sortear": {
      const moneda = azar() < 0.5 ? "cara" : "sello";
      const [uno, otro] = m.jugadores;
      const comienza = otro ? (moneda === "cara" ? uno : otro) : undefined;
      if (comienza) m.turno.activo = comienza.id;
      return { tipo: "sortear", cartas: [], detalle: moneda, objetivo: comienza?.id };
    }
  }
}

function cambiarFase(m: Mesa, fase: Fase): void {
  m.turno.fase = fase;
  if (fase !== "guerraTalismanes") m.turno.prioridad = null;
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
