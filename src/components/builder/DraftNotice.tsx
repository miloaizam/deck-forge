import { History } from "lucide-react";

import type { DraftState } from "./DeckParamLoader";
import { deckTitle } from "@/lib/deck";
import { HOVER_AVISO } from "@/lib/ui";
import { cn } from "@/lib/utils";

const BOTON =
  "inline-flex h-9 items-center rounded-chip border border-line px-3.5 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

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
          <button type="button" onClick={onRecuperar} className={BOTON}>
            Recuperar
          </button>
          <button type="button" onClick={onDescartar} className={cn(BOTON, HOVER_AVISO)}>
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
