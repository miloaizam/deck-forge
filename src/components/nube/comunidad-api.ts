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
import { toast } from "../toast";
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
  /** El boton A-Z del buscador; manda sobre `orden`. */
  porNombre: "" | "asc" | "desc" = "",
): Promise<{ filas: FilaPublica[]; total: number }> {
  const datos = await api("rpc/listar_publicas", {
    metodo: "POST",
    cuerpo: {
      orden,
      afinidad,
      q: q.trim() === "" ? null : q.trim().slice(0, 60),
      desde: (pagina - 1) * POR_PAGINA,
      cuantos: POR_PAGINA,
      // Solo si esta puesto: asi una base con el esquema anterior (sin
      // `por_nombre`) sigue listando con el orden de siempre.
      ...(porNombre ? { por_nombre: porNombre } : {}),
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
  // Lo local tambien, para que quien compara no vea diferencia y repita.
  const fin = getEstado();
  const previo = fin.fase === "con-sesion" ? fin.publicas[deckId] : undefined;
  if (fin.fase === "con-sesion" && previo)
    conSesion({ publicas: { ...fin.publicas, [deckId]: { ...previo, afinidad } } });
}

/** La revision en curso de cada baraja: una sola a la vez. */
const revisando = new Map<string, Promise<void>>();

/**
 * Que una baraja publica siga diciendo la verdad tras editarla: si dejo de
 * cumplir, sale de la Comunidad (con un aviso); si cambio de afinidad, se
 * corrige la de la lista. La llaman el constructor al guardar y el detalle de
 * la baraja (por si la edicion llego de otro equipo), que son quienes tienen
 * el catalogo para calcular `legal` y `afinidad`. Si ya hay una en curso para
 * esa baraja, devuelve esa: el detalle la pide de nuevo tras cada
 * sincronizacion. Nunca lanza.
 */
export function revisarPublica(
  deck: Deck,
  legal: boolean,
  afinidad: string | null,
): Promise<void> {
  const estado = getEstado();
  const publico = estado.fase === "con-sesion" ? estado.publicas[deck.id] : undefined;
  if (!publico?.publica) return Promise.resolve();
  if (legal && publico.afinidad === afinidad) return Promise.resolve();
  const enCurso = revisando.get(deck.id);
  if (enCurso) return enCurso;
  const trabajo = (
    legal
      ? actualizarAfinidad(deck.id, afinidad)
      : cambiarPublica(deck, false, null).then(() =>
          toast(
            `"${deck.nombre}" dejó de ser legal y se quitó de la Comunidad.`,
            "warning",
          ),
        )
  )
    .catch(() => undefined)
    .finally(() => revisando.delete(deck.id));
  revisando.set(deck.id, trabajo);
  return trabajo;
}
