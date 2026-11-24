"use client";

import { ChevronRight, RotateCw } from "lucide-react";

import { FASES, NOMBRE_FASE, type Fase, type Turno } from "@/lib/mesa/table";
import { BOTON_SECUNDARIO_COMPACTO } from "@/lib/ui";
import { cn } from "@/lib/utils";

/** El nombre corto de cada paso, para que los ocho quepan en una fila. */
const CORTO: Record<Fase, string> = {
  agrupacion: "Agrupación",
  vigilia: "Vigilia",
  ataque: "Ataque",
  bloqueo: "Bloqueo",
  guerraTalismanes: "Talismanes",
  dano: "Daño",
  final: "Final",
  robar: "Robar",
};

interface MarcadorTurnoProps {
  turno: Turno;
  onFase: (fase: Fase) => void;
  onSiguiente: () => void;
  onPasar: () => void;
}

/**
 * El marcador de turno y fase (GAME.md §4): no obliga a nada, ordena la
 * conversacion. Las ocho fases y pasos del DAR §9 en fila; se salta a
 * cualquiera con un clic, o se avanza de a una.
 */
export function MarcadorTurno({
  turno,
  onFase,
  onSiguiente,
  onPasar,
}: MarcadorTurnoProps) {
  const ultima = turno.fase === FASES[FASES.length - 1];
  return (
    <nav aria-label="Turno y fase" className="flex flex-wrap items-center gap-2">
      <p className="text-ink text-[14px] font-bold tabular-nums">Turno {turno.numero}</p>
      <ol className="border-line flex flex-wrap rounded-[10px] border p-0.5">
        {FASES.map((f) => (
          <li key={f}>
            <button
              type="button"
              onClick={() => onFase(f)}
              aria-current={turno.fase === f ? "step" : undefined}
              title={NOMBRE_FASE[f]}
              className={cn(
                "rounded-[8px] px-2.5 py-1.5 text-[12px]",
                turno.fase === f
                  ? "bg-brand-600 font-medium text-white"
                  : "text-muted hover:text-ink",
              )}
            >
              {CORTO[f]}
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onSiguiente}
        disabled={ultima}
        className={BOTON_SECUNDARIO_COMPACTO}
      >
        <ChevronRight size={14} aria-hidden="true" />
        Siguiente fase
      </button>
      <button type="button" onClick={onPasar} className={BOTON_SECUNDARIO_COMPACTO}>
        <RotateCw size={14} aria-hidden="true" />
        Pasar turno
      </button>
    </nav>
  );
}
