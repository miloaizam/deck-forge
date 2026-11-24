"use client";

import { useSyncExternalStore } from "react";

/** Desde `lg`: bajo eso la mesa no se carga (GAME.md §1). */
const ESCRITORIO = "(min-width: 1024px)";

function suscribirAncho(avisar: () => void): () => void {
  const mq = window.matchMedia(ESCRITORIO);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}

/** Si la pantalla es de escritorio. En el servidor, todavia no se sabe. */
export function useEscritorio(): boolean | null {
  return useSyncExternalStore(
    suscribirAncho,
    () => window.matchMedia(ESCRITORIO).matches,
    () => null,
  );
}
