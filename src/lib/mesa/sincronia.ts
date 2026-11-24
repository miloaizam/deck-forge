import type { Azar } from "../hand-test";
import { apply, type Accion } from "./apply";
import {
  cartasDe,
  completar,
  mitadParaElRival,
  otroLado,
  publicar,
  quienLaHace,
  reveladasPara,
  unirMitades,
  type Lado,
  type Mensaje,
} from "./red";
import type { Mesa } from "./table";
import type { MesaVista } from "./vista";

/**
 * Lo que sabe un navegador del 1v1 y como cambia (GAME.md, sesion 5). Logica
 * pura: recibe acciones del jugador y mensajes del otro navegador, y
 * devuelve el estado nuevo y los mensajes a mandar. El componente solo los
 * lleva por el canal.
 *
 * Las versiones: cada cambio publicado sube la version en uno. Si los dos
 * publican la misma version a la vez (movieron casi juntos), gana la de "a"
 * y "b" vuelve a hacer su ultima accion encima, si todavia se puede.
 */
export interface Red {
  yo: Lado;
  /** La version de la mesa publica; 0 mientras no empieza. */
  v: number;
  publica: MesaVista | null;
  /** Las cartas de la baraja propia: su dueno las conoce siempre. */
  mias: Record<string, string>;
  /** Lo que el rival revelo solo a este jugador (lo que mira de su Castillo). */
  conocidas: Record<string, string>;
  /** La mitad propia, entera: con ella "a" arma la mesa. */
  miMitad: Mesa;
  /** La ultima accion publicada desde aqui, por si hay que rehacerla. */
  pendiente: { accion: Accion; v: number; por: Lado } | null;
}

export interface Paso {
  red: Red;
  enviar: Mensaje[];
}

const quieto = (red: Red): Paso => ({ red, enviar: [] });

/** Al entrar a la mesa: saludar y mandar lo que se ve de la mitad propia. */
export function iniciar(yo: Lado, miMitad: Mesa): Paso {
  const red: Red = {
    yo,
    v: 0,
    publica: null,
    mias: cartasDe(miMitad),
    conocidas: {},
    miMitad,
    pendiente: null,
  };
  return {
    red,
    enviar: [
      { t: "hola", de: yo },
      { t: "mitad", de: yo, mesa: mitadParaElRival(miMitad, otroLado(yo)) },
    ],
  };
}

/** La mesa tal como la conoce este navegador, o `null` si todavia no empieza. */
export function mesaDe(red: Red): Mesa | null {
  return red.publica ? completar(red.publica, { ...red.mias, ...red.conocidas }) : null;
}

/** Lo que el rival le revelo deja de valer cuando ya no esta mirando. */
function vigentes(red: Red, publica: MesaVista): Record<string, string> {
  const r = publica.revelado;
  if (!r || r.para !== red.yo) return {};
  return Object.fromEntries(
    r.uids.filter((u) => red.conocidas[u]).map((u) => [u, red.conocidas[u]]),
  );
}

/** Publica una mesa nueva: sube la version y arma el mensaje. */
function publicarNueva(red: Red, nueva: Mesa, hecha: Red["pendiente"]): Paso {
  const publica = publicar(nueva);
  const v = red.v + 1;
  const siguiente: Red = {
    ...red,
    v,
    publica,
    conocidas: vigentes(red, publica),
    pendiente: hecha ? { ...hecha, v } : null,
  };
  return { red: siguiente, enviar: [{ t: "estado", de: red.yo, v, mesa: publica }] };
}

/** Lo que hace el jugador de este navegador. */
export function accionLocal(red: Red, accion: Accion, azar: Azar): Paso {
  const mesa = mesaDe(red);
  if (!mesa) return quieto(red);
  if (quienLaHace(mesa, accion, red.yo)) {
    return { red, enviar: [{ t: "pedido", de: red.yo, accion }] };
  }
  const nueva = apply(mesa, accion, azar, red.yo);
  if (nueva === mesa) return quieto(red);
  return publicarNueva(red, nueva, { accion, v: 0, por: red.yo });
}

/** Lo que llega del otro navegador, ya validado (`leerMensaje`). */
export function recibir(red: Red, msg: Mensaje, azar: Azar): Paso {
  if (msg.de === red.yo) return quieto(red);
  switch (msg.t) {
    case "hola":
      return {
        red,
        enviar: red.publica
          ? [{ t: "estado", de: red.yo, v: red.v, mesa: red.publica }]
          : [
              {
                t: "mitad",
                de: red.yo,
                mesa: mitadParaElRival(red.miMitad, otroLado(red.yo)),
              },
            ],
      };

    case "mitad": {
      // Arma la mesa "a", una sola vez; "b" espera su primera version.
      if (red.yo !== "a" || red.v > 0) return quieto(red);
      const mesa = unirMitades(red.miMitad, completar(msg.mesa, {}));
      return publicarNueva(red, mesa, null);
    }

    case "estado": {
      if (msg.v > red.v) {
        return quieto({
          ...red,
          v: msg.v,
          publica: msg.mesa,
          conocidas: vigentes(red, msg.mesa),
          pendiente: null,
        });
      }
      if (msg.v < red.v || red.yo === "a") return quieto(red);
      // La misma version publicada por los dos: gana "a"; "b" rehace lo suyo.
      const pendiente = red.pendiente?.v === msg.v ? red.pendiente : null;
      const aceptada: Red = {
        ...red,
        publica: msg.mesa,
        conocidas: vigentes(red, msg.mesa),
        pendiente: null,
      };
      if (!pendiente) return quieto(aceptada);
      return pendiente.por === red.yo
        ? accionLocal(aceptada, pendiente.accion, azar)
        : hacerPedido(aceptada, pendiente.accion, pendiente.por, azar);
    }

    case "pedido":
      return hacerPedido(red, msg.accion, msg.de, azar);

    case "privado":
      return msg.para === red.yo
        ? quieto({ ...red, conocidas: { ...msg.cartas } })
        : quieto(red);
  }
}

/**
 * Hace lo que pidio el otro sobre algo de este navegador (botar o mirar el
 * Castillo, mover una carta oculta): al instante y sin preguntar (GAME.md
 * §2). Si lo que pidio era mirar, le manda en privado lo que ve.
 */
function hacerPedido(red: Red, accion: Accion, por: Lado, azar: Azar): Paso {
  const mesa = mesaDe(red);
  if (!mesa) return quieto(red);
  const nueva = apply(mesa, accion, azar, por);
  if (nueva === mesa) return quieto(red);
  const paso = publicarNueva(red, nueva, { accion, v: 0, por });
  const cartas = reveladasPara(nueva, por);
  if (Object.keys(cartas).length > 0) {
    paso.enviar.push({ t: "privado", de: red.yo, para: por, cartas });
  }
  return paso;
}
