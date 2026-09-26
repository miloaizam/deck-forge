import { History, X } from "lucide-react";

import type { DraftState } from "./DeckParamLoader";
import { deckTitle } from "@/lib/deck";
import { cn } from "@/lib/utils";

const BOTON =
  "inline-flex h-9 items-center rounded-chip border border-line px-3 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

/**
 * El aviso del borrador, sobre el panel de la baraja.
 *
 * `recuperada` cuenta que la baraja en pantalla se retomo sola y deja
 * descartarla; `en-espera`, que hay OTRA sin guardar y deja retomarla o
 * descartarla. Es un aviso en linea y no un toast porque lleva acciones y
 * tiene que quedarse hasta que se decida.
 */
export function DraftNotice({
  estado,
  onRetomar,
  onDescartar,
  onCerrar,
  className,
}: {
  estado: DraftState;
  onRetomar: () => void;
  onDescartar: () => void;
  onCerrar: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "aparece border-brand-500/50 bg-accent-soft rounded-card relative flex gap-3 border p-3 pr-10",
        className,
      )}
    >
      <History size={16} aria-hidden="true" className="text-accent mt-0.5 shrink-0" />
      <div className="min-w-0 text-[13px]">
        {estado.tipo === "recuperada" ? (
          <p className="text-ink">
            <strong className="font-semibold">Baraja sin guardar recuperada.</strong>{" "}
            <span className="text-muted">Se retomó donde quedó.</span>
          </p>
        ) : (
          <p className="text-ink">
            <strong className="font-semibold">Hay otra baraja sin guardar:</strong>{" "}
            <span className="break-words">«{deckTitle(estado.draft.deck)}»</span>
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {estado.tipo === "en-espera" && (
            <button type="button" onClick={onRetomar} className={BOTON}>
              Retomar
            </button>
          )}
          <button type="button" onClick={onDescartar} className={BOTON}>
            Descartar
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar el aviso"
        className="text-muted hover:text-ink focus-visible:outline-brand-500 rounded-chip absolute top-2 right-2 inline-flex size-7 items-center justify-center"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
