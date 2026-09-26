"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { decodeDeck } from "@/lib/deck-code";
import { readDraft, type Draft } from "@/lib/deck-draft";
import { readDeck } from "@/lib/deck-storage";
import { useSharedCode } from "@/components/decks/use-shared-code";
import type { Deck } from "@/lib/types";

/**
 * Que pasa con el borrador al cargar (`deck-draft.ts`):
 * - `recuperada`: la baraja que se carga ES el borrador, retomado solo.
 * - `en-espera`: se cargo otra baraja (un `?m=` o un enlace) y el borrador,
 *   que es de otra, queda a un lado hasta que se retome o se descarte.
 */
export type DraftState = { tipo: "recuperada" } | { tipo: "en-espera"; draft: Draft };

interface DeckParamLoaderProps {
  onLoad: (deck: Deck, borrador: DraftState | null) => void;
  onError: (mensaje: string) => void;
  /**
   * Ya se decidio que baraja mostrar. Hasta entonces el constructor no escribe
   * el borrador: el primer render trae una baraja vacia y la pisaria.
   */
  onReady: () => void;
}

/**
 * Lee `?m=` (una baraja guardada) o `#d=` / `?d=` (una compartida) y, sin
 * ninguno, el borrador de la baraja en curso, y entrega arriba lo que toca.
 *
 * No pinta nada: existe solo para aislar `useSearchParams` detras de su propio
 * <Suspense>. Si el gancho se llamara desde la isla entera, todo lo que hay por
 * encima —filtros, grilla, paginacion— dejaria de prerenderizarse y se perderia
 * el HTML estatico, que es justo lo caro de esta pagina.
 *
 * Se usa el gancho y no `window.location.search` porque navegar de
 * `/constructor/?m=a` a `/constructor/?m=b` no remonta la isla: leyendo `window` una
 * sola vez la baraja se quedaria pegado en el primero.
 */
export function DeckParamLoader({ onLoad, onError, onReady }: DeckParamLoaderProps) {
  const params = useSearchParams();
  const m = params.get("m");
  const d = useSharedCode();

  // Cada combinacion de parametros se carga una sola vez: sin esto, cualquier
  // render volveria a pisar lo que el usuario lleve editado.
  const cargado = useRef<string | null>(null);

  useEffect(() => {
    const clave = `${m ?? ""}|${d ?? ""}`;
    if (cargado.current === clave) return;
    const primera = cargado.current === null;
    cargado.current = clave;

    const borrador = readDraft();
    const enEspera: DraftState | null = borrador
      ? { tipo: "en-espera", draft: borrador }
      : null;

    // Un enlace roto no puede costar el borrador: se avisa y se retoma este.
    const fallo = (mensaje: string) => {
      onError(mensaje);
      if (primera && borrador) onLoad(borrador.deck, { tipo: "recuperada" });
    };

    if (!m && !d) {
      // Solo al entrar: si despues se quitan los parametros, la baraja en
      // pantalla ya es la que se esta armando.
      if (primera && borrador) onLoad(borrador.deck, { tipo: "recuperada" });
    } else if (d) {
      // El codigo compartido manda: si vienen los dos, es un enlace recibido.
      const r = decodeDeck(d);
      if (r.ok) onLoad(r.deck, enEspera);
      else fallo(r.mensaje);
    } else if (borrador && borrador.base === m) {
      // Se refresco (o se volvio) mientras se editaba esta misma baraja.
      onLoad(borrador.deck, { tipo: "recuperada" });
    } else {
      const guardado = readDeck(m!);
      if (guardado) onLoad(guardado, enEspera);
      else fallo("No se encontró esa baraja en este navegador.");
    }
    onReady();
  }, [m, d, onLoad, onError, onReady]);

  return null;
}
