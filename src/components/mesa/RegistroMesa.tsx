"use client";

import { ScrollText } from "lucide-react";

import type { EntradaRegistro } from "@/lib/mesa/table";
import { cn } from "@/lib/utils";

interface RegistroMesaProps {
  registro: EntradaRegistro[];
  texto: (e: EntradaRegistro) => string;
  className?: string;
}

/**
 * El registro de acciones, a un costado (GAME.md §2): para que ninguno se
 * pierda. Lo mas nuevo arriba. La ultima linea se anuncia aparte, sola: la
 * lista entera en `aria-live` leeria todo de nuevo con cada accion.
 */
export function RegistroMesa({ registro, texto, className }: RegistroMesaProps) {
  const lineas = [...registro].reverse();
  return (
    <aside
      aria-labelledby="mesa-registro"
      className={cn(
        "border-line bg-panel flex min-h-0 flex-col rounded-[10px] border",
        className,
      )}
    >
      <h2
        id="mesa-registro"
        className="text-muted border-line flex items-center gap-2 border-b px-3 py-2 text-[12px] font-bold tracking-[0.08em] uppercase"
      >
        <ScrollText size={14} aria-hidden="true" className="text-accent" />
        Registro
      </h2>
      <p className="sr-only" role="status">
        {lineas[0] ? texto(lineas[0]) : ""}
      </p>
      <ol className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {lineas.map((e) => (
          <li
            key={e.n}
            className="text-ink border-line/60 border-b py-1.5 text-[13px] leading-snug last:border-b-0"
          >
            <span className="text-muted mr-1.5 tabular-nums">{e.n}.</span>
            {texto(e)}
          </li>
        ))}
      </ol>
    </aside>
  );
}
