"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type ItemMenu =
  | {
      etiqueta: string;
      accion: () => void;
      deshabilitado?: boolean;
      /** No cierra el menu al elegirlo: la accion abre otro en su lugar. */
      mantiene?: boolean;
    }
  | { separador: string };

interface MenuMesaProps {
  /** Donde se abrio, en pixeles de la pantalla. */
  x: number;
  y: number;
  titulo: string;
  items: ItemMenu[];
  onCerrar: () => void;
}

/**
 * El menu de una carta o de una zona de la mesa. Se abre con un clic (o con
 * Enter sobre la carta, que es un boton) y con el clic derecho. Es un
 * `role="menu"`: el foco entra al primer item, las flechas lo recorren y
 * Escape lo cierra devolviendo el foco a donde estaba.
 */
export function MenuMesa({ x, y, titulo, items, onCerrar }: MenuMesaProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Que no se salga de la ventana: se mide ya pintado y se corre, antes de
  // que el navegador lo muestre.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(x, window.innerWidth - r.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(y, window.innerHeight - r.height - 8))}px`;
  }, [x, y, items]);

  useEffect(() => {
    const previo =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current
      ?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")
      ?.focus();

    const fuera = (e: PointerEvent) => {
      if (e.target instanceof Node && !ref.current?.contains(e.target)) onCerrar();
    };
    document.addEventListener("pointerdown", fuera, true);
    return () => {
      document.removeEventListener("pointerdown", fuera, true);
      // Si el foco quedo en el menu que se va, vuelve a quien lo abrio.
      if (previo?.isConnected && !document.activeElement?.closest("[role=menu]")) {
        previo.focus();
      }
    };
  }, [onCerrar, titulo]);

  function alTeclear(e: React.KeyboardEvent<HTMLDivElement>) {
    const botones = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>(
        "[role=menuitem]:not(:disabled)",
      ) ?? [],
    );
    const i = botones.findIndex((b) => b === document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCerrar();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const paso = e.key === "ArrowDown" ? 1 : -1;
      botones[(i + paso + botones.length) % botones.length]?.focus();
    } else if (e.key === "Tab") {
      onCerrar();
    }
  }

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={titulo}
      onKeyDown={alTeclear}
      className="bg-panel border-line fixed z-[60] flex max-h-[80vh] min-w-52 flex-col overflow-y-auto rounded-[10px] border p-1 shadow-2xl"
      style={{ left: x, top: y }}
    >
      <p className="text-muted truncate px-3 pt-1.5 pb-1 text-[12px] font-bold">
        {titulo}
      </p>
      {items.map((item, i) =>
        "separador" in item ? (
          <p
            key={`s-${i}`}
            role="presentation"
            className="text-muted border-line mt-1 border-t px-3 pt-2 pb-1 text-[11px] tracking-[0.08em] uppercase"
          >
            {item.separador}
          </p>
        ) : (
          <button
            key={`${item.etiqueta}-${i}`}
            type="button"
            role="menuitem"
            disabled={item.deshabilitado}
            onClick={() => {
              item.accion();
              if (!item.mantiene) onCerrar();
            }}
            className={cn(
              "text-ink hover:bg-accent-soft focus-visible:bg-accent-soft rounded-[6px] px-3 py-1.5 text-left text-[14px] focus-visible:outline-none",
              "disabled:text-muted/50 disabled:hover:bg-transparent",
            )}
          >
            {item.etiqueta}
          </button>
        ),
      )}
    </div>
  );
}
