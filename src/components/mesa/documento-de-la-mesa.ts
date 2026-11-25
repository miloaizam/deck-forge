/**
 * La CSP de cada pagina la fija el documento que se CARGO, no la ruta que se
 * ve: navegar con el router de Next (la navbar, la vuelta de Google en
 * `/cuenta`) cambia la URL sin cambiar de documento. Y solo las paginas de
 * `/mesa` permiten el `wss://` del tiempo real (decision del proyecto,
 * sesion 5). Una sala abierta en un documento cargado fuera de `/mesa`
 * tendria el websocket bloqueado, en silencio: los dos jugadores se verian
 * desconectados (25-11-2026). La salida es cargar de nuevo la pagina, que
 * esta vez trae la CSP de `/mesa`.
 */

import { rutaDelDocumento, traeLaCspDeLaMesa } from "@/lib/mesa/documento";

const CLAVE = "deckforge-mesa-recarga";
/** Si ya se recargo hace menos que esto, no se vuelve a intentar (sin bucles). */
const ESPERA_MS = 15_000;

/**
 * Recarga la pagina si el documento se cargo fuera de `/mesa`. Devuelve
 * `true` si recargo (quien llama no sigue). No recarga dos veces seguidas.
 */
export function recargarSiHaceFalta(): boolean {
  const nav = performance.getEntriesByType("navigation")[0];
  const ruta = rutaDelDocumento(nav?.name, window.location.href);
  if (traeLaCspDeLaMesa(ruta)) return false;
  let ultima = 0;
  try {
    ultima = Number(sessionStorage.getItem(CLAVE) ?? 0);
  } catch {
    // sin almacenamiento: se recarga igual, una vez
  }
  if (Date.now() - ultima < ESPERA_MS) return false;
  try {
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // sin almacenamiento
  }
  window.location.reload();
  return true;
}
