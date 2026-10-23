import { Hash } from "lucide-react";
import type { ReactNode } from "react";

import { CONTADOR } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * El enlace a un ancla que aparece junto a un titulo al pasar el cursor (o con
 * el foco del teclado): para copiar la direccion exacta de una seccion o una
 * regla y citarla.
 */
export function EnlaceAncla({ id, nombre }: { id: string; nombre: string }) {
  return (
    <a
      href={`#${id}`}
      className="text-muted hover:text-accent focus-visible:outline-brand-500 rounded-chip inline-flex size-6 shrink-0 items-center justify-center self-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <Hash size={15} aria-hidden="true" />
      <span className="sr-only">Enlace a {nombre}</span>
    </a>
  );
}

/**
 * Una seccion de documento, igual en los tres (DAR, Fe de Erratas y
 * Banlist): titulo con su numero o su cuenta, bajada opcional y ancla. El
 * `id` es el que sigue el indice lateral (`DocumentIndex`).
 */
export function DocumentSection({
  id,
  numero,
  titulo,
  cuenta,
  bajada,
  tono,
  children,
}: {
  id: string;
  /** "8" en el DAR: va delante del titulo, en violeta. */
  numero?: string;
  titulo: string;
  /** Cuantas cartas tiene, en la Fe de Erratas y la Banlist. */
  cuenta?: number;
  bajada?: string;
  /** Las prohibidas de la Banlist van en rojo. */
  tono?: "peligro";
  children: ReactNode;
}) {
  const nombre = numero ? `${numero}. ${titulo}` : titulo;
  return (
    <section
      id={id}
      aria-labelledby={`t-${id}`}
      className="mt-14 scroll-mt-24 first:mt-0"
    >
      <h2
        id={`t-${id}`}
        className={cn(
          "group text-ink flex items-baseline gap-3 text-2xl font-bold tracking-[-0.01em]",
          tono === "peligro" && "text-danger",
        )}
      >
        {numero && <span className="text-accent tabular-nums">{numero}</span>}
        <span>{titulo}</span>
        {cuenta !== undefined && (
          <span className={cn(CONTADOR, "self-center")}>{cuenta}</span>
        )}
        <EnlaceAncla id={id} nombre={nombre} />
      </h2>
      {bajada && <p className="text-muted mt-1.5 leading-relaxed">{bajada}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
