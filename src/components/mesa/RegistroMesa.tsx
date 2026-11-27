"use client";

import { ScrollText } from "lucide-react";

import type { EntradaRegistro } from "@/lib/mesa/table";
import { cn } from "@/lib/utils";

interface RegistroMesaProps {
  registro: EntradaRegistro[];
  texto: (e: EntradaRegistro) => string;
  /** Los jugadores en el orden en que se sentaron: el 1 y el 2. */
  jugadores: { id: string; nombre: string }[];
  className?: string;
}

/**
 * Cada jugador con su color (tokens `jugador-1` y `jugador-2`): un filete a la
 * izquierda, un fondo suave y el numero. El texto sigue en `ink`.
 */
const COLOR = [
  {
    linea: "border-l-jugador-1 bg-jugador-1-soft",
    numero: "text-jugador-1",
    punto: "bg-jugador-1",
  },
  {
    linea: "border-l-jugador-2 bg-jugador-2-soft",
    numero: "text-jugador-2",
    punto: "bg-jugador-2",
  },
] as const;

/**
 * El registro de acciones, a un costado (GAME.md §2): para que ninguno se
 * pierda. Lo mas nuevo arriba, con alto fijo y scroll por dentro (lo da el
 * `className` de quien lo pone). La ultima linea se anuncia aparte, sola: la
 * lista entera en `aria-live` leeria todo de nuevo con cada accion.
 */
export function RegistroMesa({
  registro,
  texto,
  jugadores,
  className,
}: RegistroMesaProps) {
  const lineas = [...registro].reverse();
  const indice = new Map(jugadores.map((j, i) => [j.id, i]));
  const color = (por: string) => COLOR[Math.min(indice.get(por) ?? 0, 1)];
  return (
    <aside
      aria-labelledby="mesa-registro"
      className={cn(
        "border-line bg-panel flex min-h-0 flex-col rounded-[10px] border",
        className,
      )}
    >
      <div className="border-line flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-3 py-2">
        <h2
          id="mesa-registro"
          className="text-muted flex items-center gap-2 text-[12px] font-bold tracking-[0.08em] uppercase"
        >
          <ScrollText size={14} aria-hidden="true" className="text-accent" />
          Registro
        </h2>
        {/* Que color es de quien, sin adivinar. */}
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {/* Sin lista a proposito: los items del registro son sus lineas. */}
          {jugadores.slice(0, 2).map((j, i) => (
            <span
              key={j.id}
              className="text-muted flex min-w-0 items-center gap-1.5 text-[12px]"
            >
              <span
                aria-hidden="true"
                className={cn("size-2 shrink-0 rounded-full", COLOR[i].punto)}
              />
              <span className="truncate">{j.nombre}</span>
            </span>
          ))}
        </p>
      </div>
      <p className="sr-only" role="status">
        {lineas[0] ? texto(lineas[0]) : ""}
      </p>
      <ol className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {lineas.map((e) => (
          <li
            key={e.n}
            className={cn(
              "text-ink mb-1 rounded-r-[6px] border-l-[3px] px-2 py-1.5 text-[13px] leading-snug last:mb-0",
              color(e.por).linea,
            )}
          >
            <span
              className={cn("mr-1.5 font-semibold tabular-nums", color(e.por).numero)}
            >
              {e.n}.
            </span>
            {texto(e)}
          </li>
        ))}
      </ol>
    </aside>
  );
}
