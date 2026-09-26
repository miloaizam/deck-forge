"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/** Cuanto hay que bajar para que aparezca: en lo alto de la pagina estorba. */
const UMBRAL = 600;

// La posicion del scroll es un sistema externo: se lee con
// useSyncExternalStore y no con un efecto que llame a setState. La instantanea
// es un booleano, asi que React solo repinta cuando cruza el umbral.
function subscribe(cb: () => void): () => void {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
const lejosDelInicio = () => window.scrollY > UMBRAL;
const enElServidor = () => false;

/**
 * Boton para volver arriba de una vez, abajo a la derecha.
 *
 * En el constructor, bajo `lg`, el borde inferior ya lo ocupa la barra que abre
 * la hoja de la baraja (h-14 mas el area segura), asi que ahi se sube por
 * encima de ella. Queda debajo del aviso de rechazos (z-30 contra z-20): el
 * aviso dura unos segundos y tiene que leerse.
 */
export function ScrollTopButton() {
  const visible = useSyncExternalStore(subscribe, lejosDelInicio, enElServidor);
  const enConstructor = usePathname().startsWith("/constructor");

  const subir = () => {
    // Con "reducir movimiento" el salto es instantaneo (DESIGN.md, movimiento).
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducir ? "auto" : "smooth" });
    // El boton desaparece arriba: el foco va al principio de la pagina (el
    // logotipo de la navbar) para que el teclado siga desde ahi.
    document.querySelector<HTMLElement>("header a")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={subir}
      aria-label="Volver arriba"
      title="Volver arriba"
      // Invisible saca el boton del orden de tabulacion cuando no se ve.
      className={cn(
        "border-line bg-panel/90 text-muted hover:text-ink hover:border-brand-500 focus-visible:outline-brand-500 shadow-panel fixed right-4 z-20 flex size-11 items-center justify-center rounded-full border backdrop-blur transition-[opacity,transform,visibility,color,border-color] duration-200 sm:right-6",
        enConstructor
          ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-6"
          : "bottom-6",
        visible
          ? "visible translate-y-0 opacity-100"
          : "invisible translate-y-2 opacity-0",
      )}
    >
      <ArrowUp size={17} aria-hidden="true" />
    </button>
  );
}
