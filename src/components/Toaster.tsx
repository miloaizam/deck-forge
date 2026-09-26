"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";

import { dismissToast, useToasts, type Toast } from "./toast";
import { cn } from "@/lib/utils";

/** Cuanto se queda cada aviso. Un error trae mas que leer y dura mas. */
const DURACION_MS: Record<Toast["tono"], number> = { ok: 4000, error: 6500 };

function ToastItem({ t }: { t: Toast }) {
  // Mientras el cursor o el foco estan encima, el aviso no se va: quien lo
  // esta leyendo decide cuando termina (WCAG 2.2.1).
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || t.saliendo) return;
    const id = setTimeout(() => dismissToast(t.id), DURACION_MS[t.tono]);
    return () => clearTimeout(id);
  }, [t.id, t.tono, t.vez, t.saliendo, pausado]);

  return (
    <li
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className={cn(
        "aviso border-line bg-panel/95 shadow-panel rounded-card pointer-events-auto flex items-start gap-2.5 border py-2.5 pr-1.5 pl-3.5 backdrop-blur",
        t.saliendo && "aviso-saliendo",
      )}
    >
      {/* Icono y texto: el color nunca es el unico indicador. */}
      {t.tono === "ok" ? (
        <CircleCheck size={16} aria-hidden="true" className="text-accent mt-2 shrink-0" />
      ) : (
        <TriangleAlert size={16} aria-hidden="true" className="text-ink mt-2 shrink-0" />
      )}
      <p className="text-ink min-w-0 flex-1 py-1.5 text-[13px] leading-snug">{t.texto}</p>
      <button
        type="button"
        onClick={() => dismissToast(t.id)}
        aria-label="Cerrar el aviso"
        className="text-muted hover:text-ink hover:bg-surface focus-visible:outline-brand-500 rounded-chip flex size-8 shrink-0 items-center justify-center transition-colors"
      >
        <X size={14} aria-hidden="true" />
      </button>
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
        <ul className="flex flex-col gap-2">
          {lista.map((t) => (
            <ToastItem key={t.id} t={t} />
          ))}
        </ul>
      </div>
    </>
  );
}
