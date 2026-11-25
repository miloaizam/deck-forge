import { api, ErrorNube } from "../nube/api";
import { token } from "../nube/nube";
import {
  leerMisSalas,
  leerSala,
  MENSAJE_ERROR_SALA,
  salaCreadaSchema,
  type MejorDe,
  type Sala,
} from "@/lib/mesa/sala";
import type { Deck, Formato } from "@/lib/types";

/**
 * Las peticiones de las salas del 1v1 (GAME.md, sesion 4), contra las
 * funciones de `supabase/mesa.sql`. Usa `api()` y `token()` de la nube tal
 * como estan; todo lo que vuelve se valida en `src/lib/mesa/sala.ts`.
 */

async function rpc(
  nombre: string,
  cuerpo: Record<string, unknown> = {},
): Promise<unknown> {
  const t = await token();
  if (!t) throw new ErrorNube(401, "MS002", "Sin sesión.");
  return api(`rpc/${nombre}`, { metodo: "POST", cuerpo, token: t });
}

export async function crearSala(
  formato: Formato,
  mejorDe: MejorDe,
): Promise<{ id: string; codigo: string }> {
  const r = salaCreadaSchema.safeParse(
    await rpc("crear_mesa", { p_formato: formato, p_mejor_de: mejorDe }),
  );
  if (!r.success) throw new ErrorNube(200, null, "Respuesta inesperada.");
  return r.data;
}

export async function unirseASala(codigo: string): Promise<string> {
  const id = await rpc("unirse_mesa", { p_codigo: codigo });
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) {
    throw new ErrorNube(200, null, "Respuesta inesperada.");
  }
  return id;
}

export async function verSala(id: string): Promise<Sala | null> {
  return leerSala(await rpc("ver_mesa", { p_mesa: id }));
}

export async function misSalas(): Promise<Sala[]> {
  return leerMisSalas(await rpc("mis_mesas"));
}

/**
 * La baraja elegida va a la fila privada del jugador, que solo el lee (RLS):
 * el rival no ve tu lista. Que cumpla en el formato de la sala lo revisa el
 * sitio antes de llamar, porque la base no tiene el catalogo.
 */
export async function guardarBaraja(
  mesa: string,
  uid: string,
  deck: Deck,
): Promise<void> {
  const t = await token();
  if (!t) throw new ErrorNube(401, "MS002", "Sin sesión.");
  await api("mesas_privado?on_conflict=mesa,jugador", {
    metodo: "POST",
    cuerpo: { mesa, jugador: uid, estado: { baraja: deck } },
    token: t,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export async function marcarLista(mesa: string, lista: boolean): Promise<void> {
  await rpc("marcar_lista", { p_mesa: mesa, p_lista: lista });
}

export async function latido(mesa: string): Promise<void> {
  await rpc("latido_mesa", { p_mesa: mesa });
}

export async function salirDeSala(mesa: string): Promise<void> {
  await rpc("salir_mesa", { p_mesa: mesa });
}

/** Lo que se le dice al jugador cuando algo de la sala falla. */
export function mensajeDeSala(e: unknown): string {
  if (e instanceof ErrorNube) {
    if (e.codigo && MENSAJE_ERROR_SALA[e.codigo]) return MENSAJE_ERROR_SALA[e.codigo];
    if (e.status === 0) return "Sin conexión. Revisa tu red e inténtalo de nuevo.";
    if (e.status === 404) return "Las salas todavía no están instaladas en la base.";
  }
  return "No se pudo completar. Inténtalo de nuevo.";
}

/**
 * Lo privado de este jugador en la sala: la baraja con que entro, la
 * semilla de su barajado, con la que se rearma la misma mitad al volver
 * (sesion 6), y la baraja con los cambios del side que lleva en la serie
 * (sesion 7). Solo el lo lee (RLS).
 */
export async function guardarPrivado(
  mesa: string,
  uid: string,
  estado: { baraja: Deck; semilla: number; actual?: Deck },
): Promise<void> {
  const t = await token();
  if (!t) throw new ErrorNube(401, "MS002", "Sin sesión.");
  await api("mesas_privado?on_conflict=mesa,jugador", {
    metodo: "POST",
    cuerpo: { mesa, jugador: uid, estado },
    token: t,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

/** La fila privada propia, tal cual vino: la valida quien la usa. */
export async function leerPrivado(mesa: string, uid: string): Promise<unknown> {
  const t = await token();
  if (!t) throw new ErrorNube(401, "MS002", "Sin sesión.");
  const filas = await api(
    `mesas_privado?select=estado&mesa=eq.${mesa}&jugador=eq.${uid}`,
    {
      token: t,
    },
  );
  const fila: unknown = Array.isArray(filas) ? filas[0] : null;
  return typeof fila === "object" && fila !== null && "estado" in fila
    ? fila.estado
    : null;
}

/** La foto publica guardada, tal cual vino: la valida quien la usa. */
export async function leerMesaPublica(
  mesa: string,
): Promise<{ version: unknown; estado: unknown } | null> {
  const t = await token();
  if (!t) throw new ErrorNube(401, "MS002", "Sin sesión.");
  const filas = await api(`mesas_publico?select=version,estado&mesa=eq.${mesa}`, {
    token: t,
  });
  const fila: unknown = Array.isArray(filas) ? filas[0] : null;
  if (
    typeof fila !== "object" ||
    fila === null ||
    !("version" in fila) ||
    !("estado" in fila)
  ) {
    return null;
  }
  return { version: fila.version, estado: fila.estado };
}

/** Guarda la foto publica; la base descarta una version que no sea mas nueva. */
export async function guardarMesaPublica(
  mesa: string,
  ronda: number,
  version: number,
  estado: unknown,
): Promise<void> {
  await rpc("guardar_mesa_publico", {
    p_mesa: mesa,
    p_ronda: ronda,
    p_version: version,
    p_estado: estado,
  });
}

/** Pasados los dos minutos de gracia, la serie para quien siguio conectado. */
export async function reclamarAbandono(mesa: string): Promise<void> {
  await rpc("reclamar_abandono", { p_mesa: mesa });
}

/** Declara quien gano el juego en curso ("a", "b") o que fue empate. */
export async function declararResultado(
  mesa: string,
  ganador: "a" | "b" | "empate",
): Promise<void> {
  await rpc("declarar_resultado", { p_mesa: mesa, p_ganador: ganador });
}

/** Responde al resultado que declaro el rival: de acuerdo, o se anula el juego. */
export async function responderResultado(mesa: string, acepta: boolean): Promise<void> {
  await rpc("responder_resultado", { p_mesa: mesa, p_acepta: acepta });
}

/** Rendirse: el juego en curso es del rival, en el acto. */
export async function rendirse(mesa: string): Promise<void> {
  await rpc("rendirse", { p_mesa: mesa });
}

/** Abandonar la serie a proposito: es del rival en el acto y la sala se cierra. */
export async function abandonarSala(mesa: string): Promise<void> {
  await rpc("abandonar_mesa", { p_mesa: mesa });
}
