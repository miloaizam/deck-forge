"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Inclinacion maxima, en grados, cuando el puntero llega al borde de la carta. */
const MAX_GRADOS = 10;

/** Cuanto se corre la sombra, en px, con la inclinacion maxima. */
const MAX_SOMBRA = 14;

const VARIABLES = ["--rx", "--ry", "--gx", "--gy", "--sx", "--sy"];

/** Devuelve la carta a su sitio: sin variables, `globals.css` la deja plana. */
function reposar(el: HTMLElement | null, cuadro: number) {
  cancelAnimationFrame(cuadro);
  if (!el) return;
  delete el.dataset.activa;
  for (const v of VARIABLES) el.style.removeProperty(v);
}

interface CartaInclinableProps {
  children: ReactNode;
  /**
   * Cuando cambia (la impresion que se ve), la carta vuelve a su sitio: la
   * nueva no hereda la inclinacion de la anterior.
   */
  reinicio: string;
}

/**
 * La carta del detalle en «3D»: se inclina siguiendo el cursor, con un reflejo
 * de luz que se mueve y una sombra que acompana, y vuelve a su sitio al salir.
 * En el telefono, mientras el dedo la arrastra.
 *
 * El movimiento no pasa por React: cada `pointermove` escribe variables CSS
 * en el elemento (`--rx`, `--ry`, `--gx`, `--gy`) dentro de un
 * `requestAnimationFrame`, y `globals.css` («Carta inclinable») las convierte
 * en el giro, el reflejo y la sombra. Sin escala, como pide DESIGN.md.
 *
 * Con «reducir movimiento» no hace nada. Es decorativo: la imagen de adentro
 * conserva su `alt`.
 */
export function CartaInclinable({ children, reinicio }: CartaInclinableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cuadro = useRef(0);

  const soltar = () => reposar(ref.current, cuadro.current);

  useEffect(() => {
    reposar(ref.current, cuadro.current);
  }, [reinicio]);

  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    // El dedo solo inclina mientras toca la carta; el raton, al pasar.
    if (e.pointerType === "touch" && e.buttons === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    cancelAnimationFrame(cuadro.current);
    cuadro.current = requestAnimationFrame(() => {
      el.dataset.activa = "";
      // La esquina bajo el puntero se hunde, como al apretar la carta.
      el.style.setProperty("--rx", `${((0.5 - y) * 2 * MAX_GRADOS).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 2 * MAX_GRADOS).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      // La sombra cae del lado contrario a la esquina que se acerca.
      el.style.setProperty("--sx", `${((0.5 - x) * 2 * MAX_SOMBRA).toFixed(1)}px`);
      el.style.setProperty("--sy", `${((0.5 - y) * 2 * MAX_SOMBRA).toFixed(1)}px`);
    });
  };

  return (
    <div className="carta-3d">
      <div
        ref={ref}
        className="carta-3d-cuerpo rounded-card"
        onPointerMove={mover}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch") return;
          // Sigue al dedo aunque salga de la carta. Si el puntero ya no
          // existe (se solto en el camino), el navegador lanza: no importa.
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          mover(e);
        }}
        onPointerLeave={soltar}
        onPointerUp={(e) => e.pointerType === "touch" && soltar()}
        onPointerCancel={soltar}
      >
        {children}
        <span aria-hidden="true" className="carta-3d-brillo" />
      </div>
    </div>
  );
}
