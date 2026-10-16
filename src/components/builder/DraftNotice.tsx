import { History } from "lucide-react";

import type { DraftState } from "./DeckParamLoader";
import { deckTitle } from "@/lib/deck";
import {
  AVISO_EN_LINEA,
  BOTON_PRIMARIO_COMPACTO,
  BOTON_SECUNDARIO_COMPACTO,
  HOVER_AVISO,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

/*
 * Botones compactos y rellenos: sobre el fondo violeta del aviso uno
 * transparente no se distinguia. Recuperar es la accion principal (violeta);
 * Descartar va en el color del panel, que se queda lleno tambien al apuntar
 * (`hover:bg-panel` pisa el fondo traslucido de HOVER_AVISO), y su anillo y
 * su texto se ponen ambar, como todo lo que descarta algo.
 */
const RECUPERAR = BOTON_PRIMARIO_COMPACTO;
const DESCARTAR = cn(
  BOTON_SECUNDARIO_COMPACTO,
  "bg-panel text-ink font-medium",
  HOVER_AVISO,
  "hover:bg-panel",
);

/**
 * El aviso del borrador, sobre el panel de la baraja: pregunta si recuperar la
 * baraja sin guardar y deja dos salidas, Recuperar y Descartar.
 *
 * `recuperada`: la baraja en pantalla ya es el borrador (se retomo sola), asi
 * que Recuperar solo confirma y cierra el aviso. `en-espera`: hay OTRA sin
 * guardar y Recuperar la trae. Es un aviso en linea y no un toast porque lleva
 * acciones y tiene que quedarse hasta que se decida.
 */
export function DraftNotice({
  estado,
  nombre,
  onRecuperar,
  onDescartar,
  className,
}: {
  estado: DraftState;
  /** El nombre de la baraja recuperada, cuando es la que esta en pantalla. */
  nombre: string;
  onRecuperar: () => void;
  onDescartar: () => void;
  className?: string;
}) {
  const titulo = estado.tipo === "en-espera" ? deckTitle(estado.draft.deck) : nombre;
  return (
    <div role="status" className={cn(AVISO_EN_LINEA, "flex-nowrap", className)}>
      <History size={16} aria-hidden="true" className="text-accent mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-ink font-semibold">¿Recuperar baraja sin guardar?</p>
        <p className="text-muted break-words">«{titulo}»</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" onClick={onRecuperar} className={RECUPERAR}>
            Recuperar
          </button>
          <button type="button" onClick={onDescartar} className={DESCARTAR}>
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
