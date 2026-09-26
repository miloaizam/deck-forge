"use client";

import { useEffect, useRef, useState } from "react";

interface ConfirmDialogProps {
  /** Cerrado cuando es `false`. El texto del cuerpo lo pone quien lo abre. */
  open: boolean;
  titulo: string;
  /** Lo que se va a hacer, en una frase. */
  mensaje: string;
  /** Texto del boton que ejecuta la accion. */
  confirmar: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Pide confirmar algo que no tiene vuelta atras.
 *
 * Usa el <dialog> nativo por lo mismo que CardModal: trae foco atrapado, cierre
 * con Esc y devolucion del foco al boton que lo abrio, sin librerias. La
 * diferencia es que aqui el foco arranca en Cancelar, que es la salida segura,
 * y que el backdrop NO cierra: un clic al lado no debe parecerse a un borrado.
 */
export function ConfirmDialog({
  open,
  titulo,
  mensaje,
  confirmar,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Quien lo abre suele vaciar el mensaje al cerrar (en /barajas sale de la
  // baraja por borrar, que vuelve a null): se conserva el ultimo para que la
  // salida no se desvanezca con el texto ya borrado.
  const [texto, setTexto] = useState(mensaje);
  if (open && mensaje !== texto) setTexto(mensaje);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Esc dispara `close`, y de ahi sale el unico camino de cancelacion: asi
      // el estado de quien lo abrio nunca se queda creyendo que sigue abierto.
      onClose={onCancel}
      aria-labelledby="confirm-titulo"
      className="panel-anim panel-crece bg-surface border-line text-ink shadow-panel rounded-panel m-auto w-[min(26rem,calc(100vw-2rem))] border p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-2 p-5 sm:p-6">
        <h2 id="confirm-titulo" className="text-ink text-lg font-bold">
          {titulo}
        </h2>
        <p className="text-muted text-[13px] leading-relaxed">{texto}</p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            // El foco entra aqui: la salida segura es la que queda bajo la mano.
            autoFocus
            onClick={() => ref.current?.close()}
            className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center px-4 text-[13px] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="border-brand-600 bg-accent-soft text-accent hover:bg-brand-600 focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center border px-4 text-[13px] font-medium transition-colors hover:text-white"
          >
            {confirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
