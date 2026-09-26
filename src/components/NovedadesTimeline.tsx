"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Megaphone, Sparkles, TrendingUp, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { NOVEDADES, type Novedad, type TipoNovedad } from "@/lib/novedades";
import { cn } from "@/lib/utils";

/**
 * Cuantas entradas trae cada tanda. La linea de tiempo solo crece: con el
 * sitio vivo la lista pasa de treinta y la pagina se hacia eterna. Se muestra
 * una tanda y "Ver mas" suma la siguiente, no el resto de golpe.
 */
const POR_TANDA = 6;

/** Icono y texto de cada tipo: el color nunca es el unico indicador. */
const ESTILO: Record<TipoNovedad, { Icon: LucideIcon; clase: string }> = {
  Novedad: { Icon: Sparkles, clase: "text-accent bg-accent-soft border-transparent" },
  Mejora: { Icon: TrendingUp, clase: "text-ink border-line" },
  Arreglo: { Icon: Wrench, clase: "text-muted border-line" },
  Aviso: { Icon: Megaphone, clase: "text-ink border-brand-500" },
};

// La fecha se lee como mediodia UTC y se formatea en UTC: asi "2026-09-26" no
// se corre al 25 por la zona horaria de la maquina que construye.
const FECHA = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" });
const formatear = (fecha: string) => FECHA.format(new Date(`${fecha}T12:00:00Z`));

/** Agrupa por fecha conservando el orden: de la mas nueva a la mas antigua. */
function porFecha(lista: Novedad[]): [string, Novedad[]][] {
  const grupos = new Map<string, Novedad[]>();
  for (const n of lista) grupos.set(n.fecha, [...(grupos.get(n.fecha) ?? []), n]);
  return [...grupos];
}

/**
 * La linea de tiempo de /novedades, por tandas.
 *
 * Es una isla de cliente solo por el "Ver mas": la primera tanda sale en el
 * HTML estatico, como antes. Las fechas se agrupan sobre lo que esta a la
 * vista, asi que una fecha partida entre dos tandas se completa sola al
 * cargar la siguiente, sin repetir su titulo.
 */
export function NovedadesTimeline() {
  const [visibles, setVisibles] = useState(POR_TANDA);
  const lista = useRef<HTMLOListElement>(null);
  /** Desde que entrada hay que enfocar tras cargar una tanda; null al inicio. */
  const [enfocar, setEnfocar] = useState<number | null>(null);

  const indice = useMemo(() => new Map(NOVEDADES.map((n, i) => [n, i])), []);
  const grupos = porFecha(NOVEDADES.slice(0, visibles));
  const quedan = NOVEDADES.length - visibles;

  // El foco va a la primera entrada nueva: con teclado o lector de pantalla,
  // "Ver mas" no deja a nadie al final de la lista sin saber que aparecio.
  useEffect(() => {
    if (enfocar === null) return;
    lista.current
      ?.querySelector<HTMLElement>(`[data-n="${enfocar}"]`)
      ?.focus({ preventScroll: false });
  }, [enfocar]);

  return (
    <>
      {/* La linea es el borde izquierdo de la lista; cada fecha lleva un punto
          encima de ella. El primero, el mas reciente, es el unico con brillo. */}
      <ol ref={lista} className="border-line mt-10 ml-2 max-w-[760px] border-l">
        {grupos.map(([fecha, entradas], i) => (
          <li key={fecha} className="relative pb-10 pl-7 last:pb-0">
            <span
              aria-hidden="true"
              className={cn(
                "ring-bg absolute top-1 -left-[7px] size-3.5 rounded-full ring-4",
                i === 0 ? "bg-brand-600 shadow-glow" : "bg-line",
              )}
            />
            <h2 className="text-ink text-lg font-semibold tracking-[-0.01em]">
              <time dateTime={fecha}>{formatear(fecha)}</time>
            </h2>

            <ul className="mt-4 flex flex-col gap-3">
              {entradas.map((n) => {
                const { Icon, clase } = ESTILO[n.tipo];
                // La mas reciente de todas lleva el borde violeta y su
                // etiqueta: el color solo no puede ser el unico indicador.
                const ultima = n === NOVEDADES[0];
                return (
                  <li
                    key={n.titulo}
                    data-n={indice.get(n)}
                    // Enfocable por codigo: al pulsar "Ver mas" el foco salta
                    // a la primera entrada nueva.
                    tabIndex={-1}
                    className={cn(
                      "aparece bg-panel rounded-card border p-4 sm:p-5",
                      ultima ? "border-brand-500 shadow-glow" : "border-line",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-chip inline-flex items-center gap-1.5 border px-2 py-0.5 text-[12px] font-medium",
                          clase,
                        )}
                      >
                        <Icon size={13} aria-hidden="true" />
                        {n.tipo}
                      </span>
                      {ultima && (
                        <span className="text-accent text-[12px] font-medium">
                          Lo más reciente
                        </span>
                      )}
                    </div>
                    <h3 className="text-ink mt-2 text-[16px] font-semibold">
                      {n.titulo}
                    </h3>
                    <div className="text-muted mt-1.5 flex flex-col gap-2 text-[14px] leading-relaxed">
                      {n.texto.map((parrafo) => (
                        <p key={parrafo}>{parrafo}</p>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      {quedan > 0 && (
        <div className="mt-8 flex max-w-[760px] flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEnfocar(visibles);
              setVisibles((v) => v + POR_TANDA);
            }}
            className="border-line text-muted hover:text-ink hover:border-brand-500 focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-5 text-[13px] transition-colors"
          >
            <ChevronDown size={15} aria-hidden="true" />
            Ver más
          </button>
          <p className="text-muted text-[12px] tabular-nums">
            Mostrando {visibles} de {NOVEDADES.length}
          </p>
        </div>
      )}
    </>
  );
}
