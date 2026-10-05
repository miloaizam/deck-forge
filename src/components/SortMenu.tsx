"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpDown, Check } from "lucide-react";

import { ETIQUETA_ORDEN, ORDENES, type Orden } from "@/lib/card-order";
import { cn } from "@/lib/utils";

interface SortMenuProps {
  value: Orden | "";
  onChange: (orden: Orden | "") => void;
}

const OPCIONES: (Orden | "")[] = ["", ...ORDENES];

/**
 * El orden de la grilla del catalogo, junto al boton de filtros.
 *
 * Un boton con menu y no un `Select`: el selector lleva su etiqueta encima y
 * en la fila del buscador no cabe, menos en el telefono, donde este boton
 * queda en su icono. Es un menu de opciones excluyentes (`menuitemradio`):
 * flechas para recorrerlo, Enter para elegir, Esc para cerrar y el foco
 * vuelve al boton.
 */
export function SortMenu({ value, onChange }: SortMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Un clic fuera lo cierra.
  useEffect(() => {
    if (!open) return;
    const fuera = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false); // Node: el target de un evento del DOM
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [open]);

  // Al abrir, el foco va a la opcion elegida.
  useEffect(() => {
    if (open) itemsRef.current[Math.max(0, OPCIONES.indexOf(value))]?.focus();
  }, [open, value]);

  const cerrar = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = itemsRef.current.findIndex((el) => el === document.activeElement);
    const ir = (n: number) => {
      e.preventDefault();
      itemsRef.current[(n + OPCIONES.length) % OPCIONES.length]?.focus();
    };
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(OPCIONES.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      cerrar();
    } else if (e.key === "Tab") setOpen(false);
  };

  const elegido = value !== "";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Ordenar: ${ETIQUETA_ORDEN[value]}`}
        className={cn(
          "focus-visible:outline-brand-500 rounded-chip inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 border px-3 text-sm whitespace-nowrap transition-colors sm:px-4",
          open || elegido
            ? "border-brand-600 bg-accent-soft text-ink"
            : "border-line text-muted hover:border-brand-500 hover:text-ink",
        )}
      >
        <ArrowUpDown size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Ordenar</span>
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label="Ordenar las cartas"
        hidden={!open}
        onKeyDown={onKeyDown}
        className="border-line bg-panel rounded-card shadow-glow absolute top-full right-0 z-20 mt-2 w-64 border p-1.5"
      >
        {OPCIONES.map((o, i) => (
          <button
            key={o || "catalogo"}
            ref={(el) => {
              itemsRef.current[i] = el;
            }}
            type="button"
            role="menuitemradio"
            aria-checked={value === o}
            tabIndex={-1}
            onClick={() => {
              onChange(o);
              cerrar();
            }}
            className={cn(
              "rounded-chip focus-visible:outline-brand-500 hover:bg-surface focus:bg-surface flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] outline-none",
              value === o ? "text-ink font-medium" : "text-muted",
            )}
          >
            <Check
              size={15}
              aria-hidden="true"
              className={cn("text-accent shrink-0", value !== o && "invisible")}
            />
            {ETIQUETA_ORDEN[o]}
          </button>
        ))}
      </div>
    </div>
  );
}
