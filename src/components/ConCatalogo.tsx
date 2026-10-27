"use client";

import type { ReactNode } from "react";

import { cartasDelFormato, reintentarCatalogo, useCatalogo } from "./use-catalogo";
import type { Card, Formato } from "@/lib/types";
import { ENLACE, VACIO } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface ConCatalogoProps {
  /** Lo que se ve mientras baja el catalogo: la silueta de la vista. */
  esqueleto: ReactNode;
  /**
   * El catalogo Estandar, y como pedir el de otro formato: Mis barajas y el
   * detalle validan cada baraja con las erratas del suyo.
   */
  children: (cards: Card[], deFormato: (f: Formato) => Card[]) => ReactNode;
}

/**
 * Las cartas de un formato, una vez bajado el catalogo. Fuera del componente
 * para que sea siempre la misma funcion: las vistas la tienen en las
 * dependencias de sus `useMemo`.
 */
function deFormato(f: Formato): Card[] {
  return cartasDelFormato(f) ?? [];
}

/**
 * Pinta `children` cuando el catalogo ya esta en el navegador
 * (`useCatalogo`), y mientras tanto `esqueleto`. Es para las vistas que no
 * tienen nada que mostrar sin el: Mis barajas, el detalle de una baraja y la
 * coleccion, que ademas leen `localStorage` y ya esperaban al navegador.
 */
export function ConCatalogo({ esqueleto, children }: ConCatalogoProps) {
  const { cards, error } = useCatalogo();
  if (cards) return children(cards, deFormato);
  if (!error) return esqueleto;
  return (
    <div className={VACIO}>
      <p className="text-ink">No se pudo cargar el catálogo.</p>
      <p className="text-muted mt-2 text-[14px]">
        Revisa la conexión. Tus barajas y tu colección siguen guardadas.
      </p>
      <button
        type="button"
        onClick={reintentarCatalogo}
        className={cn(ENLACE, "mt-3 text-[15px]")}
      >
        Reintentar
      </button>
    </div>
  );
}
