"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChartColumn } from "lucide-react";

import { costCurve } from "@/lib/deck-rules";
import { cn } from "@/lib/utils";

interface CostCurveProps {
  curva: Map<number, number>;
  /** Oros del principal: no tienen coste y van aparte, junto al titulo. */
  oros: number;
  /**
   * `panel`: un tramo mas del panel del constructor, con la raya de arriba y la
   * nota de los Oros. `tarjeta`: la del detalle de la baraja, con icono y
   * titulo centrados como su vecina (probar una mano), sin la nota.
   */
  variante?: "panel" | "tarjeta";
  className?: string;
  /**
   * Alto del carril de las barras. En el detalle va `flex-1` con un minimo, y
   * el carril llena la tarjeta.
   */
  barras?: string;
}

const cartas = (n: number) => `${n} ${n === 1 ? "carta" : "cartas"}`;

/** Lo que tarda cada barra en crecer, y el desfase entre una y la siguiente. */
const CRECER_MS = 700;
const DESFASE_MS = 70;

/**
 * Cuantas cartas del principal hay de cada coste, en barras. La usan el panel
 * del constructor y el detalle de una baraja.
 *
 * La altura es relativa a la columna mas alta, no a las 50 cartas: una baraja
 * normal no pasa de quince o veinte en un coste, y medido contra 50 todas las
 * barras quedarian aplastadas abajo.
 *
 * **Las barras crecen desde abajo la primera vez que el grafico se ve**, una
 * tras otra, de izquierda a derecha. Se espera a que entre en pantalla (un
 * IntersectionObserver) porque en el detalle va al final de la pagina: animar
 * al montar seria animar para nadie. Crecen con `scale` y no con `height`,
 * que ya lleva el valor en linea y es el que se anima despues, al sumar o
 * quitar una copia. Con "reducir movimiento" aparecen ya puestas.
 *
 * El numero va escrito sobre cada barra, asi que la altura nunca es el unico
 * dato. Para el lector de pantalla cada columna es una frase ("Coste 2: 12
 * cartas") y lo dibujado queda oculto.
 */
export function CostCurve({
  curva,
  oros,
  variante = "panel",
  className = "border-line border-t pt-3",
  barras = "h-14",
}: CostCurveProps) {
  // El panel se pinta dos veces (al costado en escritorio y en la hoja del
  // telefono): un id fijo saldria repetido.
  const titulo = useId();
  const puntos = costCurve(curva);
  const max = Math.max(1, ...puntos.map((p) => p.n));

  const grafico = useRef<HTMLUListElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = grafico.current;
    if (!el || visto) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisto(true);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visto]);

  const tarjeta = variante === "tarjeta";

  return (
    <section className={className} aria-labelledby={titulo}>
      {tarjeta ? (
        <h2
          id={titulo}
          className="text-ink mb-4 flex items-center justify-center gap-2 text-sm font-bold tracking-[0.1em] uppercase"
        >
          <ChartColumn size={16} aria-hidden="true" className="text-accent" />
          Curva de coste
        </h2>
      ) : (
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
      )}

      {/* `flex-1`: dentro de una tarjeta flex (el detalle de la baraja) la
          curva ocupa todo el alto que sobra y las barras crecen con ella. */}
      <ul ref={grafico} className="grid flex-1 grid-cols-7 gap-1.5">
        {puntos.map((p, i) => {
          const retraso = `${i * DESFASE_MS}ms`;
          return (
            <li key={p.etiqueta} className="flex flex-col items-center gap-1">
              <span className="sr-only">
                Coste {p.etiqueta}: {cartas(p.n)}
              </span>
              {/* El numero aparece cuando su barra termina de subir. */}
              <span
                aria-hidden="true"
                style={{
                  transitionDelay: visto ? `${i * DESFASE_MS + CRECER_MS / 2}ms` : "0ms",
                }}
                className={cn(
                  "text-[11px] tabular-nums transition-opacity duration-300",
                  p.n > 0 ? "text-ink" : "text-muted/50",
                  visto ? "opacity-100" : "opacity-0",
                )}
              >
                {p.n}
              </span>
              {/* El carril fija la altura maxima y la barra crece desde abajo. */}
              <span aria-hidden="true" className={cn("flex w-full items-end", barras)}>
                <span
                  className={cn(
                    "w-full origin-bottom rounded-t-[4px] ease-(--ease-out-soft)",
                    p.n > 0 ? "bg-brand-600" : "bg-line",
                    visto ? "scale-y-100" : "scale-y-0",
                  )}
                  style={{
                    height: p.n > 0 ? `${(p.n / max) * 100}%` : "2px",
                    // Dos transiciones con su propio ritmo: la de entrada,
                    // lenta y escalonada; la de despues, corta y sin retraso.
                    transition: `scale ${CRECER_MS}ms var(--ease-out-soft) ${retraso}, height 200ms var(--ease-out-soft)`,
                  }}
                />
              </span>
              <span aria-hidden="true" className="text-muted text-[11px] tabular-nums">
                {p.etiqueta}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
