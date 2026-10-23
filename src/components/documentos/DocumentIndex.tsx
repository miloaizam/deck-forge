"use client";

import { ChevronDown, ListTree } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface EntradaIndice {
  id: string;
  /** "8.1" o "8": va delante, en cifras tabulares. */
  numero?: string;
  etiqueta: string;
  /** Cuantas cartas tiene la seccion (Fe de Erratas, Banlist). */
  cuenta?: number;
  hijos?: EntradaIndice[];
}

/** Cuanto bajo la navbar tiene que haber pasado un titulo para contar como leido. */
const UMBRAL = 120;

/**
 * El indice de un documento, el mismo en los tres. Desde `lg` va al costado y
 * se queda a la vista al bajar, marcando la seccion que se esta leyendo; la
 * seccion marcada despliega sus apartados. Bajo `lg` es una lista plegable
 * sobre el texto, solo con las secciones.
 *
 * Es la unica isla de cliente de las paginas de documentos: lo demas es HTML
 * estatico. La seccion actual sale de mirar, a cada scroll (una vez por
 * cuadro), cual fue el ultimo titulo que paso bajo la navbar.
 */
export function DocumentIndex({ entradas }: { entradas: EntradaIndice[] }) {
  const [actual, setActual] = useState<string | null>(null);
  const plegable = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const ids = entradas.flatMap((e) => [e.id, ...(e.hijos ?? []).map((h) => h.id)]);
    const elementos = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      let ultimo: string | null = null;
      for (const el of elementos) {
        if (el.getBoundingClientRect().top - UMBRAL <= 0) ultimo = el.id;
        else break;
      }
      setActual(ultimo);
    };
    const alMover = () => {
      if (!cuadro) cuadro = requestAnimationFrame(medir);
    };
    cuadro = requestAnimationFrame(medir);
    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
    };
  }, [entradas]);

  // La seccion que contiene al apartado actual.
  const seccionActual =
    entradas.find((e) => e.id === actual || e.hijos?.some((h) => h.id === actual))?.id ??
    null;

  const lista = (enCostado: boolean) => (
    <ol className="flex flex-col gap-0.5 text-[14px]">
      {entradas.map((e) => {
        const abierta = enCostado && e.id === seccionActual;
        return (
          <li key={e.id}>
            <Entrada e={e} actual={actual} />
            {abierta && e.hijos && e.hijos.length > 0 && (
              <ol className="border-line my-1 ml-3 flex flex-col gap-0.5 border-l pl-2 text-[13px]">
                {e.hijos.map((h) => (
                  <li key={h.id}>
                    <Entrada e={h} actual={actual} />
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      {/* Bajo lg: plegable sobre el texto. Elegir una entrada lo cierra. */}
      <details
        ref={plegable}
        className="group border-line bg-panel rounded-card mb-8 border lg:hidden"
        onClick={(ev) => {
          if (ev.target instanceof HTMLAnchorElement && plegable.current) {
            plegable.current.open = false;
          }
        }}
      >
        <summary className="text-ink flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
          <ListTree size={16} aria-hidden="true" className="text-accent" />
          Índice
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="text-muted ml-auto transition-transform group-open:rotate-180"
          />
        </summary>
        <nav aria-label="Índice" className="border-line border-t px-2 py-2">
          {lista(false)}
        </nav>
      </details>

      <nav
        aria-label="Índice"
        className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain pr-1 pb-4 lg:block"
      >
        <p className="text-muted mb-3 px-2 text-[11px] font-semibold tracking-[0.18em] uppercase">
          Índice
        </p>
        {lista(true)}
      </nav>
    </>
  );
}

function Entrada({ e, actual }: { e: EntradaIndice; actual: string | null }) {
  const esta = e.id === actual;
  return (
    <a
      href={`#${e.id}`}
      aria-current={esta ? "location" : undefined}
      className={cn(
        "rounded-chip flex gap-2 px-2 py-1.5 leading-snug transition-colors",
        "hover:outline-brand-500 hover:outline-2 hover:outline-offset-2",
        esta ? "bg-accent-soft text-ink font-medium" : "text-muted hover:text-ink",
      )}
    >
      {e.numero && (
        <span className={cn("shrink-0 tabular-nums", esta && "text-accent")}>
          {e.numero}
        </span>
      )}
      <span>{e.etiqueta}</span>
      {e.cuenta !== undefined && (
        <span className="text-muted ml-auto pl-2 text-[12px] tabular-nums">
          {e.cuenta}
        </span>
      )}
    </a>
  );
}
