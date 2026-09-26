"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  /** Nombre de la carta, para las etiquetas del lector de pantalla. */
  nombre: string;
  value: number;
  onChange: (value: number) => void;
  /** Por que no se puede sumar una copia mas, si es que no se puede. */
  addBlocked?: string;
  /** Se avisa al usuario cuando pulsa un boton que no puede hacer nada. */
  onBlocked?: (mensaje: string) => void;
}

/**
 * El area que se pulsa: 44x44, como pide DESIGN.md, y transparente.
 *
 * El tamano tactil y el tamano VISIBLE de un boton son dos cosas distintas, y
 * antes eran la misma: tres cajas con borde de 44px por fila pesaban mas que la
 * carta que acompanan. El area se queda en 44 —el minimo no se toca— y lo que
 * se ve es la caja de dentro, que mide la mitad.
 *
 * Lo usa tambien el boton de oro inicial, que va en la misma fila.
 */
export const BOTON_FILA =
  "group/b flex size-11 shrink-0 items-center justify-center rounded-chip focus-visible:outline-brand-500";

/**
 * La caja que si se ve. En reposo es solo el icono: el borde y el fondo entran
 * al apuntar el boton, que es cuando hace falta saber donde se va a pulsar.
 */
export const CAJA_FILA =
  "flex size-7 items-center justify-center rounded-full border border-transparent transition-colors";

/**
 * Los botones de mas y menos de una fila del mazo.
 *
 * DESIGN.md marca este componente como el punto donde mas se rompe el tamano
 * minimo tactil, asi que los dos botones son de 44x44 (`size-11`) y no se
 * encogen, aunque en reposo no se les vea la caja.
 */
export function QuantityStepper({
  nombre,
  value,
  onChange,
  addBlocked,
  onBlocked,
}: QuantityStepperProps) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label={`Quitar una copia de ${nombre}`}
        className={BOTON_FILA}
      >
        <span
          className={cn(
            CAJA_FILA,
            "text-muted group-hover/b:border-line group-hover/b:bg-surface group-hover/b:text-ink",
          )}
        >
          <Minus size={14} aria-hidden="true" />
        </span>
      </button>

      <span
        aria-hidden="true"
        className="text-ink min-w-5 text-center text-sm font-semibold tabular-nums"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => (addBlocked ? onBlocked?.(addBlocked) : onChange(value + 1))}
        // aria-disabled y no disabled: asi sigue enfocable y al pulsarlo puede
        // decir por que no se puede, en vez de quedarse mudo.
        aria-disabled={addBlocked ? true : undefined}
        title={addBlocked}
        aria-label={addBlocked ?? `Agregar una copia de ${nombre}`}
        className={cn(BOTON_FILA, addBlocked && "cursor-not-allowed")}
      >
        <span
          className={cn(
            CAJA_FILA,
            addBlocked
              ? "text-muted/30"
              : // Sumar es LA accion de la fila, asi que al apuntarla se pinta
                // entera: distingue el boton que agrega del que deshace.
                "text-muted group-hover/b:border-brand-500 group-hover/b:bg-brand-600 group-hover/b:text-white",
          )}
        >
          <Plus size={14} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
