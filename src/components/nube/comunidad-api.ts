import {
  leerBarajaPublica,
  leerListaPublica,
  POR_PAGINA,
  type BarajaPublica,
  type FilaPublica,
  type MotivoReporte,
  type OrdenComunidad,
} from "@/lib/comunidad";
import type { Deck } from "@/lib/types";
import { api } from "./api";
import { conSesion, getEstado, sincronizar, token } from "./nube";

/**
 * Las peticiones de la Comunidad. Todo lo publico pasa por funciones de la
 * base (`supabase/esquema.sql`): leer la lista o una baraja no necesita
 * sesion; dar like, guardar una copia y reportar si.
 */

export async function listarPublicas(
  orden: OrdenComunidad,
  afinidad: string | null,
  q: string,
  pagina: number,
): Promise<{ filas: FilaPublica[]; total: number }> {
  const datos = await api("rpc/listar_publicas", {
    metodo: "POST",
    cuerpo: {
      orden,
      afinidad,
      q: q.trim() === "" ? null : q.trim().slice(0, 60),
      desde: (pagina - 1) * POR_PAGINA,
      cuantos: POR_PAGINA,
    },
    token: await token(),
  });
  return leerListaPublica(datos);
}

export async function leerPublica(publicId: string): Promise<BarajaPublica | null> {
  const datos = await api("rpc/leer_publica", {
    metodo: "POST",
    cuerpo: { pid: publicId },
    token: await token(),
  });
  return leerBarajaPublica(datos);
}

/** Da o quita el like. Devuelve el conteo nuevo. */
export async function darLike(publicId: string, si: boolean): Promise<number> {
  const n = await api("rpc/dar_like", {
    metodo: "POST",
    cuerpo: { pid: publicId, si },
    token: await token(),
  });
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

/** Cuenta que se guardo una copia. Sin sesion no cuenta: no hace nada. */
export async function registrarCopia(publicId: string): Promise<void> {
  const t = await token();
  if (!t) return;
  await api("rpc/registrar_copia", {
    metodo: "POST",
    cuerpo: { pid: publicId },
    token: t,
  });
}

export async function reportar(
  publicId: string,
  motivo: MotivoReporte,
  nota: string,
): Promise<void> {
  await api("rpc/reportar", {
    metodo: "POST",
    cuerpo: { pid: publicId, motivo, nota: nota.slice(0, 280) },
    token: await token(),
  });
}

/**
 * Publica o despublica una baraja propia. Primero sincroniza, para que la
 * nube tenga la version de este navegador: lo que se publica es la fila de
 * la nube. `afinidad` la calcula quien llama, que tiene el catalogo.
 */
export async function cambiarPublica(
  deck: Deck,
  publica: boolean,
  afinidad: string | null,
): Promise<void> {
  await sincronizar();
  const estado = getEstado();
  if (estado.fase !== "con-sesion") throw new Error("Sin sesión");
  await api(`barajas?user_id=eq.${estado.usuario.id}&id=eq.${deck.id}`, {
    metodo: "PATCH",
    cuerpo: publica ? { publica: true, afinidad } : { publica: false },
    prefer: "return=minimal",
    token: await token(),
  });
  // Lo publico (public_id, likes) lo trae la proxima vuelta; se pide ya.
  const previo = estado.publicas[deck.id];
  if (previo)
    conSesion({ publicas: { ...estado.publicas, [deck.id]: { ...previo, publica } } });
  await sincronizar();
  // `sincronizar` no lanza (deja el error en el estado): se comprueba aqui
  // que la nube quedo como se pidio.
  const fin = getEstado();
  if (
    fin.fase !== "con-sesion" ||
    (fin.publicas[deck.id]?.publica ?? false) !== publica
  ) {
    throw new Error("La nube no confirmó el cambio");
  }
}

/**
 * Pone al dia la afinidad de una baraja que ya es publica, tras editarla. La
 * llama el detalle de la baraja, que tiene el catalogo: la sincronizacion no
 * lo tiene y no puede calcularla.
 */
export async function actualizarAfinidad(
  deckId: string,
  afinidad: string | null,
): Promise<void> {
  const estado = getEstado();
  if (estado.fase !== "con-sesion") return;
  await api(`barajas?user_id=eq.${estado.usuario.id}&id=eq.${deckId}`, {
    metodo: "PATCH",
    cuerpo: { afinidad },
    prefer: "return=minimal",
    token: await token(),
  });
}
