import Link from "next/link";
import type { ReactNode } from "react";
import { Swords } from "lucide-react";

import { NOMBRE_FORMATO } from "@/lib/formatos";
import type { Formato } from "@/lib/types";
import { PASTILLA } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface CabeceraSalaProps {
  /** El `h1`: «Sala ABC234» o el marcador entre juegos. */
  titulo: ReactNode;
  formato: Formato;
  /** La linea bajo el titulo (14 px, como los conteos del detalle). */
  subtitulo: ReactNode;
  /** Los botones, a la altura del titulo y a la derecha. */
  acciones: ReactNode;
  /** Lo que va bajo el subtitulo (el detalle de la serie, entre juegos). */
  children?: ReactNode;
}

/**
 * La cabecera de una sala de la Mesa, con la forma de la del detalle de una
 * baraja (`DeckDetailView`): el eyebrow es el enlace a la seccion, el titulo
 * lleva la pastilla del formato y las acciones van a su altura, a la derecha.
 * El `h1` lleva `id="sala-titulo"`, que nombra la seccion de la sala.
 */
export function CabeceraSala({
  titulo,
  formato,
  subtitulo,
  acciones,
  children,
}: CabeceraSalaProps) {
  return (
    <header className="sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6">
      <p className="eyebrow mb-3 sm:col-start-1 sm:row-start-1">
        <Link href="/mesa/" className="hover:text-ink">
          Mesa
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:col-start-1 sm:row-start-2">
        <h1
          id="sala-titulo"
          className="text-3xl font-bold tracking-[-0.02em] tabular-nums"
        >
          {titulo}
        </h1>
        <span
          className={cn(
            PASTILLA,
            "bg-accent-soft text-accent px-2.5 py-1 text-[13px] font-semibold",
          )}
        >
          <Swords size={14} aria-hidden="true" />
          <span className="sr-only">Formato</span>
          {NOMBRE_FORMATO[formato]}
        </span>
      </div>

      <div className="mt-1.5 min-w-0 text-[14px] sm:col-start-1 sm:row-start-3">
        {subtitulo}
        {children}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 sm:col-start-2 sm:row-start-2 sm:mt-0 sm:justify-end">
        {acciones}
      </div>
    </header>
  );
}
