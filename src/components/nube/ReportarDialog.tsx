"use client";

import { useEffect, useId, useRef, useState } from "react";

import { toast } from "../toast";
import { mensajeDeError } from "./api";
import { reportar } from "./comunidad-api";
import { MAX_NOTA_REPORTE, MOTIVOS_REPORTE, type MotivoReporte } from "@/lib/comunidad";
import { BOTON_CONFIRMAR, BOTON_SECUNDARIO, DECK_NOTE_FIELD } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface ReportarDialogProps {
  open: boolean;
  publicId: string;
  nombre: string;
  onClose: () => void;
}

/**
 * Reportar una baraja publica: un motivo de una lista cerrada y una nota
 * opcional. Lo lee quien administra el sitio en el panel de Supabase
 * (`docs/cuentas.md`, «Cómo moderar»). Reportar otra vez reemplaza el
 * reporte anterior: cuenta uno por persona.
 *
 * Es un <dialog> nativo como ConfirmDialog: foco atrapado, Esc y foco de
 * vuelta al boton que lo abrio.
 */
export function ReportarDialog({ open, publicId, nombre, onClose }: ReportarDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [motivo, setMotivo] = useState<MotivoReporte>("nombre");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-titulo`}
      className="panel-anim panel-crece bg-surface border-line text-ink shadow-panel rounded-panel m-auto w-[min(30rem,calc(100vw-2rem))] border p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <form
        className="flex flex-col gap-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setEnviando(true);
          reportar(publicId, motivo, nota.trim())
            .then(
              () => {
                toast("Reporte enviado. Gracias por avisar.", "info");
                setNota("");
                ref.current?.close();
              },
              (err: unknown) =>
                toast(`No se pudo reportar. ${mensajeDeError(err)}`, "warning"),
            )
            .finally(() => setEnviando(false));
        }}
      >
        <h2 id={`${id}-titulo`} className="text-lg font-bold">
          Reportar «{nombre}»
        </h2>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-muted mb-1.5 text-[13px]">
            ¿Qué pasa con esta baraja?
          </legend>
          {MOTIVOS_REPORTE.map((m) => (
            <label key={m.valor} className="flex min-h-9 items-center gap-2.5 text-sm">
              <input
                type="radio"
                name={`${id}-motivo`}
                value={m.valor}
                checked={motivo === m.valor}
                onChange={() => setMotivo(m.valor)}
                className="accent-brand-600 size-4"
              />
              {m.texto}
            </label>
          ))}
        </fieldset>
        <label htmlFor={`${id}-nota`} className="text-muted text-[13px]">
          Algo más (opcional)
        </label>
        <textarea
          id={`${id}-nota`}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={MAX_NOTA_REPORTE}
          rows={3}
          className={DECK_NOTE_FIELD}
        />
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => ref.current?.close()}
            className={BOTON_SECUNDARIO}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className={cn(BOTON_SECUNDARIO, "font-medium", BOTON_CONFIRMAR.aviso)}
          >
            {enviando ? "Enviando…" : "Reportar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
