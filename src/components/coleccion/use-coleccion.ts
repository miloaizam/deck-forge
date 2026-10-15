"use client";

import { useSyncExternalStore } from "react";

import {
  getColeccionSnapshot,
  getServerColeccionSnapshot,
  subscribeColeccion,
  type Coleccion,
} from "@/lib/coleccion";
import { codigoDeColeccion } from "@/lib/coleccion-code";

/** La coleccion guardada, leida como sistema externo (ver `use-decks.ts`). */
export function useColeccion(): Coleccion {
  return useSyncExternalStore(
    subscribeColeccion,
    getColeccionSnapshot,
    getServerColeccionSnapshot,
  );
}

function suscribirHash(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/**
 * El codigo de una coleccion compartida (`/coleccion/#c=…`), o `null`. Como el
 * de una baraja (`use-shared-code.ts`), vive en el fragmento, que Next no ve:
 * se lee como sistema externo, suscrito a `hashchange`.
 */
export function useCodigoCompartido(): string | null {
  const hash = useSyncExternalStore(
    suscribirHash,
    () => window.location.hash,
    () => "",
  );
  return codigoDeColeccion(hash);
}
