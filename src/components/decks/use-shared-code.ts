"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { codeFromHash } from "@/lib/deck-code";

/**
 * El codigo de una baraja compartida: del fragmento (`#d=`) o, en enlaces
 * viejos, de la query string (`?d=`).
 *
 * El fragmento no lo ve Next: `useSearchParams` solo mira la query. Se lee
 * como sistema externo con `useSyncExternalStore`, suscrito a `hashchange`,
 * que es lo que dispara pegar otro enlace en la barra estando en la pagina.
 */

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

const getHash = () => window.location.hash;
/** En el prerender no hay fragmento: el HTML estatico no trae baraja. */
const getServerHash = () => "";

export function useSharedCode(): string | null {
  const params = useSearchParams();
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const deHash = codeFromHash(hash);
  const deQuery = params.get("d");

  // Un enlace viejo ya paso por el servidor: eso no tiene arreglo. Lo que si
  // se puede es mover el codigo al fragmento en la barra de direcciones, para
  // que si se vuelve a copiar de ahi, ya no pase. Next sincroniza su router
  // con replaceState, asi que el componente se vuelve a pintar con la URL
  // nueva y lee el mismo codigo desde el fragmento.
  useEffect(() => {
    if (!deQuery || deHash) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("d");
    url.hash = `d=${deQuery}`;
    window.history.replaceState(null, "", url);
  }, [deQuery, deHash]);

  return deHash ?? deQuery;
}
