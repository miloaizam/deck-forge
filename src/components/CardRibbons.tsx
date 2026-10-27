import type { CSSProperties } from "react";

import { estaBaneada, tieneErrata } from "@/lib/erratas";
import type { Card, Formato } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Los lazos de la esquina superior derecha de una carta: "Baneada" si la
 * Banlist del formato la prohibe y "Errata" si la Fe de Erratas o esa Banlist
 * la corrigen. Con las dos cosas van los dos, la baneada por fuera. Es
 * decorado: el texto de la carta ya trae la errata, asi que el lector de
 * pantalla no lo repite.
 *
 * Va dentro de un contenedor `relative` que envuelva la imagen.
 */
export function CardRibbons({
  card,
  formato = "estandar",
  grande = false,
}: {
  card: Card;
  formato?: Formato;
  grande?: boolean;
}) {
  const lazos = [
    estaBaneada(card, formato) && { texto: "Baneada", clase: "lazo-baneada" },
    tieneErrata(card, formato) && { texto: "Errata", clase: "lazo-errata" },
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
