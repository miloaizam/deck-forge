"use client";

import { useSyncExternalStore } from "react";

import {
  getColeccionSnapshot,
  getServerColeccionSnapshot,
  subscribeColeccion,
  type Coleccion,
} from "@/lib/coleccion";

/** La coleccion guardada, leida como sistema externo (ver `use-decks.ts`). */
export function useColeccion(): Coleccion {
  return useSyncExternalStore(
    subscribeColeccion,
    getColeccionSnapshot,
    getServerColeccionSnapshot,
  );
}
