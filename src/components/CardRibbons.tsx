import type { CSSProperties } from "react";

import { estaBaneada, tieneErrata } from "@/lib/erratas";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Los lazos de la esquina superior derecha de una carta: "Baneada" si la
 * Banlist la prohibe y "Errata" si la Fe de Erratas o la Banlist la corrigen.
 * Con las dos cosas van los dos, la baneada por fuera. Es decorado: el modal
 * dice lo mismo en texto, asi que el lector de pantalla no lo repite.
 *
 * Va dentro de un contenedor `relative` que envuelva la imagen.
 */
export function CardRibbons({ card, grande = false }: { card: Card; grande?: boolean }) {
  const lazos = [
    estaBaneada(card) && { texto: "Baneada", clase: "lazo-baneada" },
    tieneErrata(card) && { texto: "Errata", clase: "lazo-errata" },
  ].filter((l) => l !== false);
  if (lazos.length === 0) return null;
  return (
    <span aria-hidden="true" className={cn("lazos", grande && "lazos-grande")}>
      {lazos.map((l, i) => (
        <span
          key={l.texto}
          className={cn("lazo", l.clase)}
          // La posicion de cada banda sale de su indice (`.lazo` en globals.css).
          // El `as` es seguro: CSSProperties no tipa las propiedades
          // personalizadas (`--paso`), y el valor es un numero.
          style={{ "--paso": i } as CSSProperties}
        >
          {l.texto}
        </span>
      ))}
    </span>
  );
}
