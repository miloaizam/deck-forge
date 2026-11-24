"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { VentanaMesa } from "./VentanaMesa";
import type { Accion } from "@/lib/mesa/apply";
import { CONTADORES, MAX_NOTA, type Contador, type Ficha } from "@/lib/mesa/table";
import { BOTON_ICONO_COMPACTO, BOTON_SECUNDARIO, TEXT_FIELD } from "@/lib/ui";
import { cn } from "@/lib/utils";

const NOMBRE_CONTADOR: Record<Contador, string> = {
  honor: "Contadores de Honor",
  conquista: "Contadores de Conquista",
  alimento: "Contadores de Alimento",
  generico: "Contadores genéricos",
};

interface DialogoMarcasProps {
  nombre: string;
  ficha: Pick<Ficha, "uid" | "contadores" | "fuerza" | "nota">;
  hacer: (accion: Accion) => void;
  onCerrar: () => void;
}

/**
 * Las marcas de una carta (DAR §10.12): contadores de Honor, Conquista y
 * Alimento y uno generico, el modificador de Fuerza hasta la Fase Final y
 * una nota para lo que cambia la carta (Convertir, Copia, el atributo). Cada
 * − y + es una accion: queda en el registro y se ve en la mesa al instante.
 */
export function DialogoMarcas({ nombre, ficha, hacer, onCerrar }: DialogoMarcasProps) {
  const [nota, setNota] = useState(ficha.nota);
  const fila = (
    clave: string,
    etiqueta: string,
    valor: string,
    menos: () => void,
    mas: () => void,
    puedeBajar: boolean,
  ) => (
    <li key={clave} className="flex items-center justify-between gap-3">
      <span className="text-ink text-[14px]">{etiqueta}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={menos}
          disabled={!puedeBajar}
          aria-label={`${etiqueta}: uno menos`}
          className={BOTON_ICONO_COMPACTO}
        >
          <Minus size={14} aria-hidden="true" />
        </button>
        <span className="text-ink w-8 text-center font-bold tabular-nums">{valor}</span>
        <button
          type="button"
          onClick={mas}
          aria-label={`${etiqueta}: uno más`}
          className={BOTON_ICONO_COMPACTO}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </span>
    </li>
  );

  return (
    <VentanaMesa
      titulo={`Marcas de ${nombre}`}
      onCerrar={onCerrar}
      className="w-[min(26rem,92vw)]"
    >
      <ul className="mt-4 flex flex-col gap-2.5">
        {CONTADORES.map((c) => {
          const n = ficha.contadores[c] ?? 0;
          return fila(
            c,
            NOMBRE_CONTADOR[c],
            String(n),
            () => hacer({ tipo: "contador", uid: ficha.uid, contador: c, delta: -1 }),
            () => hacer({ tipo: "contador", uid: ficha.uid, contador: c, delta: 1 }),
            n > 0,
          );
        })}
        {fila(
          "fuerza",
          "Fuerza hasta la Fase Final",
          ficha.fuerza > 0 ? `+${ficha.fuerza}` : String(ficha.fuerza),
          () => hacer({ tipo: "fuerza", uid: ficha.uid, delta: -1 }),
          () => hacer({ tipo: "fuerza", uid: ficha.uid, delta: 1 }),
          true,
        )}
      </ul>
      <label className="mt-5 flex flex-col gap-1.5">
        <span className="text-muted text-[13px]">
          Nota (Convertir, Copia, el atributo…)
        </span>
        <input
          type="text"
          value={nota}
          maxLength={MAX_NOTA}
          onChange={(e) => setNota(e.target.value)}
          className={cn(TEXT_FIELD, "h-11 rounded-md")}
        />
      </label>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => hacer({ tipo: "nota", uid: ficha.uid, texto: nota })}
          disabled={nota.trim() === ficha.nota}
          className={BOTON_SECUNDARIO}
        >
          Guardar nota
        </button>
      </div>
    </VentanaMesa>
  );
}
