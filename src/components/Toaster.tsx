"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Info, Trash2, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { dismissToast, useToasts, type Toast } from "./toast";
import { cn } from "@/lib/utils";

/**
 * Como se ve cada tono. El color va en detalles —el icono y un filete a la
 * izquierda—, nunca de fondo: el aviso sigue siendo un panel de la casa. Y
 * cada tono lleva su icono, asi que el color no es el unico indicador.
 * Un `warning` explica algo que no salio y trae mas que leer: dura mas.
 */
const TONOS: Record<Toast["tono"], { Icon: LucideIcon; color: string; ms: number }> = {
  success: { Icon: CircleCheck, color: "text-success border-l-success", ms: 4000 },
  delete: { Icon: Trash2, color: "text-danger border-l-danger", ms: 4500 },
  info: { Icon: Info, color: "text-accent border-l-accent", ms: 4000 },
  warning: { Icon: TriangleAlert, color: "text-warning border-l-warning", ms: 6500 },
};

function ToastItem({ t }: { t: Toast }) {
  // Mientras el cursor o el foco estan encima, el aviso no se va: quien lo
  // esta leyendo decide cuando termina (WCAG 2.2.1).
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || t.saliendo) return;
    const id = setTimeout(() => dismissToast(t.id), TONOS[t.tono].ms);
    return () => clearTimeout(id);
  }, [t.id, t.tono, t.vez, t.saliendo, pausado]);

  const { Icon, color } = TONOS[t.tono];

  return (
    // El <li> es solo el carril que se pliega al salir (`.aviso` en
    // globals.css): el aire entre avisos va dentro, como relleno, para que
    // tambien se pliegue y los de abajo suban sin salto.
    <li className={cn("aviso", t.saliendo && "aviso-saliendo")}>
      <div className="pb-2">
        <div
          onPointerEnter={() => setPausado(true)}
          onPointerLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
          className={cn(
            "border-line bg-panel/95 shadow-panel rounded-card pointer-events-auto flex items-start gap-2.5 border border-l-[3px] py-2.5 pr-1.5 pl-3 backdrop-blur",
            color,
          )}
        >
          {/* El icono hereda el color del tono; el texto se queda en `ink`. */}
          <Icon size={16} aria-hidden="true" className="mt-2 shrink-0" />
          <p className="text-ink min-w-0 flex-1 py-1.5 text-[13px] leading-snug">
            {t.texto}
          </p>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Cerrar el aviso"
            className="text-muted hover:text-ink hover:bg-surface focus-visible:outline-brand-500 rounded-chip flex size-8 shrink-0 items-center justify-center transition-colors"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Donde se pintan los avisos de `toast()`: arriba a la derecha, bajo la navbar.
 * Abajo a la derecha esta el boton de volver arriba, y en el constructor del
 * telefono el borde de abajo es de la barra de la baraja.
 *
 * La region `role="status"` es una sola para todo el sitio y existe siempre,
 * aunque este vacia: un lector de pantalla solo anuncia lo que entra en una
 * region que ya estaba en la pagina. Por eso va aparte y no es la lista que se
 * ve: esa vive en el popover, que esta oculto mientras no hay avisos, y una
 * region que aparece junto con su texto no siempre se anuncia.
 *
 * Va en un popover manual para vivir en la capa superior del navegador: un
 * <dialog> modal abierto (la hoja de la baraja, el detalle de una carta) tapa
 * cualquier z-index, y un aviso que salta mientras la hoja esta abierta tiene
 * que verse encima de ella. El orden de esa capa es el de apertura, asi que si
 * llega un aviso con un modal abierto se vuelve a abrir para quedar arriba.
 */
export function Toaster() {
  const lista = useToasts();
  const ref = useRef<HTMLDivElement>(null);
  const ultimoId = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const abierto = el.matches(":popover-open");
    if (lista.length === 0) {
      if (abierto) el.hidePopover();
      return;
    }

    const nuevo = lista[lista.length - 1].id !== ultimoId.current;
    ultimoId.current = lista[lista.length - 1].id;
    if (!abierto) el.showPopover();
    else if (nuevo && document.querySelector("dialog:modal")) {
      el.hidePopover();
      el.showPopover();
    }
  }, [lista]);

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {lista
          .filter((t) => !t.saliendo)
          .map((t) => (
            <p key={t.id}>{t.texto}</p>
          ))}
      </div>

      <div
        ref={ref}
        popover="manual"
        // El popover trae de fabrica borde, fondo, relleno y centrado: aqui se
        // quitan y se ancla arriba a la derecha. `pointer-events-none` deja
        // pulsar lo que haya debajo del hueco entre avisos.
        className="pointer-events-none fixed top-20 right-4 bottom-auto left-auto m-0 w-[calc(100vw-2rem)] overflow-visible border-0 bg-transparent p-0 sm:right-6 sm:w-[24rem]"
      >
        <ul className="flex flex-col">
          {lista.map((t) => (
            <ToastItem key={t.id} t={t} />
          ))}
        </ul>
      </div>
    </>
  );
}
