"use client";

import { RotateCw } from "lucide-react";

import type { Turno } from "@/lib/mesa/table";
import { BOTON_SECUNDARIO_COMPACTO } from "@/lib/ui";

interface MarcadorTurnoProps {
  turno: Turno;
  onPasar: () => void;
}

/**
 * El turno en curso y «Pasar turno», al comienzo de la fila de acciones.
 * Las fases se conversan entre los jugadores y no se marcan (decision del
 * proyecto, 27-11-2026): `turno.fase` sigue en el modelo para leer partidas
 * guardadas, pero ya no se ofrece.
 */
export function MarcadorTurno({ turno, onPasar }: MarcadorTurnoProps) {
  return (
    <nav aria-label="Turno" className="flex items-center gap-2">
      <p className="text-ink text-[14px] font-bold tabular-nums">Turno {turno.numero}</p>
      <button type="button" onClick={onPasar} className={BOTON_SECUNDARIO_COMPACTO}>
        <RotateCw size={14} aria-hidden="true" />
        Pasar turno
      </button>
    </nav>
  );
}
