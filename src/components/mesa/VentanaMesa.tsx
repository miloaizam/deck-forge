"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { BOTON_ICONO_LIBRE } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface VentanaMesaProps {
  titulo: string;
  /** Escape, la X o el fondo: cada ventana decide que significa cerrarla. */
  onCerrar: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * El `<dialog>` modal de las ventanas de la mesa: mirar, buscar, marcas,
 * cuantas cartas. Se abre al montarse y avisa al cerrarse; quien lo usa lo
 * monta solo mientras hace falta, asi cada vez arranca con su estado limpio.
 */
export function VentanaMesa({ titulo, onCerrar, children, className }: VentanaMesaProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cerrar = useRef(onCerrar);

  useEffect(() => {
    cerrar.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onCancel={(e) => {
        e.preventDefault();
        cerrar.current();
      }}
      className={cn(
        "bg-panel border-line text-ink rounded-panel m-auto max-h-[85vh] w-[min(56rem,92vw)] border p-5 backdrop:bg-black/60",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <button
          type="button"
          onClick={() => cerrar.current()}
          aria-label="Cerrar"
          className={BOTON_ICONO_LIBRE}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
