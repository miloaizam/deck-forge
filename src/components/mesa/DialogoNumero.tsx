"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { VentanaMesa } from "./VentanaMesa";
import { BOTON_ICONO, BOTON_PRIMARIO, BOTON_SECUNDARIO } from "@/lib/ui";

interface DialogoNumeroProps {
  titulo: string;
  /** El verbo del boton: «Mirar», «Botar». */
  accion: string;
  maximo: number;
  onAceptar: (n: number) => void;
  onCerrar: () => void;
}

/** Cuantas cartas mirar, mostrar o botar: − n +, entre 1 y lo que queda. */
export function DialogoNumero({
  titulo,
  accion,
  maximo,
  onAceptar,
  onCerrar,
}: DialogoNumeroProps) {
  const [n, setN] = useState(Math.min(1, maximo));
  return (
    <VentanaMesa titulo={titulo} onCerrar={onCerrar} className="w-[min(22rem,92vw)]">
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setN((x) => Math.max(1, x - 1))}
          disabled={n <= 1}
          aria-label="Una menos"
          className={BOTON_ICONO}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <output
          aria-live="polite"
          className="text-ink w-12 text-center text-3xl font-bold tabular-nums"
        >
          {n}
        </output>
        <button
          type="button"
          onClick={() => setN((x) => Math.min(maximo, x + 1))}
          disabled={n >= maximo}
          aria-label="Una más"
          className={BOTON_ICONO}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="text-muted mt-2 text-center text-[13px]">
        Quedan {maximo} en el Castillo.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            onAceptar(n);
            onCerrar();
          }}
          disabled={n < 1}
          className={BOTON_PRIMARIO}
        >
          {accion} {n}
        </button>
      </div>
    </VentanaMesa>
  );
}
