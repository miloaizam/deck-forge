import { History } from "lucide-react";

import type { DraftState } from "./DeckParamLoader";
import { deckTitle } from "@/lib/deck";
import { cn } from "@/lib/utils";

/*
 * Botones rellenos y no de contorno: sobre el fondo violeta del aviso uno
 * transparente no se distinguia. Recuperar es la accion principal (violeta);
 * Descartar va en el color del panel y se pone ambar al apuntar, como todo lo
 * que descarta algo (HOVER_AVISO, pero sin su fondo traslucido).
 */
const BOTON =
  "inline-flex h-9 items-center rounded-chip border px-3.5 text-[13px] font-medium shadow-panel transition-colors focus-visible:outline-brand-500";
const RECUPERAR =
  "border-brand-600 bg-brand-600 text-white hover:outline-2 hover:outline-offset-2 hover:outline-brand-500 hover:bg-brand-500";
const DESCARTAR =
  "border-line bg-panel text-ink hover:outline-2 hover:outline-offset-2 hover:outline-warning hover:text-warning";

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
    <div
      role="status"
      className={cn(
        "aparece border-brand-500/50 bg-accent-soft rounded-card flex gap-3 border p-3",
        className,
      )}
    >
      <History size={16} aria-hidden="true" className="text-accent mt-0.5 shrink-0" />
      <div className="min-w-0 text-[13px]">
        <p className="text-ink font-semibold">¿Recuperar baraja sin guardar?</p>
        <p className="text-muted break-words">«{titulo}»</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" onClick={onRecuperar} className={cn(BOTON, RECUPERAR)}>
            Recuperar
          </button>
          <button type="button" onClick={onDescartar} className={cn(BOTON, DESCARTAR)}>
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
