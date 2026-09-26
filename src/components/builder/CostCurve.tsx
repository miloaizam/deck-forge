import { useId } from "react";

import { costCurve } from "@/lib/deck-rules";
import { cn } from "@/lib/utils";

interface CostCurveProps {
  curva: Map<number, number>;
  /** Oros del principal: no tienen coste y van aparte, bajo el titulo. */
  oros: number;
}

const cartas = (n: number) => `${n} ${n === 1 ? "carta" : "cartas"}`;

/**
 * Cuantas cartas del principal hay de cada coste, en barras.
 *
 * La altura es relativa a la columna mas alta, no a las 50 cartas: una baraja
 * normal no pasa de quince o veinte en un coste, y medido contra 50 todas las
 * barras quedarian aplastadas abajo.
 *
 * El numero va escrito sobre cada barra, asi que la altura nunca es el unico
 * dato. Para el lector de pantalla cada columna es una frase ("Coste 2: 12
 * cartas") y lo dibujado queda oculto.
 */
export function CostCurve({ curva, oros }: CostCurveProps) {
  // El panel se pinta dos veces (al costado en escritorio y en la hoja del
  // telefono): un id fijo saldria repetido.
  const titulo = useId();
  const puntos = costCurve(curva);
  const max = Math.max(1, ...puntos.map((p) => p.n));

  return (
    <section className="border-line border-t pt-3" aria-labelledby={titulo}>
      <h3
        id={titulo}
        className="text-ink mb-2 flex items-baseline justify-between gap-2 text-sm font-bold tracking-[0.1em] uppercase"
      >
        Curva de coste
        {oros > 0 && (
          <span className="text-muted text-[12px] font-normal tracking-normal normal-case">
            + {oros} {oros === 1 ? "Oro" : "Oros"}, sin coste
          </span>
        )}
      </h3>

      <ul className="grid grid-cols-7 gap-1.5">
        {puntos.map((p) => (
          <li key={p.etiqueta} className="flex flex-col items-center gap-1">
            <span className="sr-only">
              Coste {p.etiqueta}: {cartas(p.n)}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "text-[11px] tabular-nums",
                p.n > 0 ? "text-ink" : "text-muted/50",
              )}
            >
              {p.n}
            </span>
            {/* El carril fija la altura maxima y la barra crece desde abajo. La
                transicion acompana el cambio al sumar o quitar una copia. */}
            <span aria-hidden="true" className="flex h-14 w-full items-end">
              <span
                className={cn(
                  "w-full rounded-t-[4px] transition-[height] duration-200 ease-(--ease-out-soft)",
                  p.n > 0 ? "bg-brand-600" : "bg-line",
                )}
                style={{ height: p.n > 0 ? `${(p.n / max) * 100}%` : "2px" }}
              />
            </span>
            <span aria-hidden="true" className="text-muted text-[11px] tabular-nums">
              {p.etiqueta}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
