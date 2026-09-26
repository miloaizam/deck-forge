"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronDown, CircleHelp, Sparkles, X } from "lucide-react";

import { FAQ } from "@/lib/faq";

/**
 * Ayuda del sitio: un signo de pregunta en la navbar que abre un panel lateral
 * con las preguntas frecuentes.
 *
 * El panel es un <dialog> nativo, como CardModal y ConfirmDialog: trae foco
 * atrapado, cierre con Esc y devolucion del foco al boton que lo abrio, sin
 * librerias. Cada pregunta es un <details>, que se despliega con teclado y
 * lector de pantalla sin codigo propio.
 *
 * Solo esta en la navbar: la portada no la lleva, a proposito.
 */
export function HelpButton() {
  const ref = useRef<HTMLDialogElement>(null);
  const cerrar = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        aria-label="Ayuda y preguntas frecuentes"
        title="Ayuda"
        // Mismo trato que el boton de tema, que va justo al lado: sin caja en
        // reposo, el aro solo al apuntar o enfocar.
        className="text-muted hover:text-ink hover:border-line focus-visible:outline-brand-500 active:border-brand-500 active:text-ink flex size-11 shrink-0 items-center justify-center rounded-full border border-transparent transition-colors"
      >
        <CircleHelp size={17} aria-hidden="true" />
      </button>

      <dialog
        ref={ref}
        aria-labelledby="ayuda-titulo"
        // Un clic en el fondo oscuro cierra: el contenido llena el dialogo
        // entero, asi que el target solo es el dialogo fuera del panel.
        onClick={(e) => {
          if (e.target === ref.current) cerrar();
        }}
        className="bg-surface border-line text-ink shadow-panel sm:rounded-l-panel m-0 ml-auto h-dvh max-h-dvh w-[min(30rem,100vw)] max-w-none border-l p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex h-full flex-col">
          {/* Un <div> y no un <header>: el panel vive dentro de la navbar, y un
              <header> ahi seria un segundo landmark "banner" anidado. */}
          <div className="border-line flex items-center justify-between gap-3 border-b px-5 py-3">
            <div>
              <p className="eyebrow text-[11px]">Preguntas frecuentes</p>
              <h2 id="ayuda-titulo" className="text-xl font-semibold tracking-[-0.01em]">
                Ayuda
              </h2>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar la ayuda"
              className="text-muted hover:text-ink hover:bg-panel focus-visible:outline-brand-500 rounded-chip flex size-11 items-center justify-center transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-4">
            {FAQ.map((seccion) => (
              <section key={seccion.titulo} className="mb-6">
                <h3 className="text-muted mb-1 text-[12px] font-medium tracking-[0.22em] uppercase">
                  {seccion.titulo}
                </h3>
                <div className="divide-line divide-y">
                  {seccion.items.map((item) => (
                    <details key={item.pregunta} className="group">
                      <summary className="focus-visible:outline-brand-500 hover:text-accent flex cursor-pointer list-none items-center justify-between gap-3 rounded py-3 text-[15px] font-medium transition-colors [&::-webkit-details-marker]:hidden">
                        {item.pregunta}
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className="text-muted shrink-0 transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <div className="text-muted flex flex-col gap-2 pb-4 text-[14px] leading-relaxed">
                        {item.respuesta.map((parrafo) => (
                          <p key={parrafo}>{parrafo}</p>
                        ))}
                        {item.lista && (
                          <ul className="flex list-disc flex-col gap-1 pl-5">
                            {item.lista.map((linea) => (
                              <li key={linea}>{linea}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            <Link
              href="/novedades"
              onClick={cerrar}
              className="border-line hover:border-brand-500 focus-visible:outline-brand-500 rounded-card text-muted hover:text-ink flex items-center gap-2 border px-4 py-3 text-[14px] transition-colors"
            >
              <Sparkles size={15} aria-hidden="true" className="text-accent" />
              ¿Qué cambió últimamente? Mira las novedades
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
