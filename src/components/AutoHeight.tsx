"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Hace que el alto de un bloque cambie con transicion cuando cambia su
 * contenido: el panel de la baraja crece al agregar una carta y se encoge al
 * quitarla, en vez de saltar.
 *
 * CSS solo no alcanza. `height: auto` no se anima (ni con `interpolate-size`,
 * que anima de un valor a otro, y aqui el valor es siempre `auto`), asi que se
 * mide el contenido con un ResizeObserver y el alto se pone en pixeles.
 * La primera medida no se anima: pasa de `auto` al numero, y eso no tiene
 * transicion.
 *
 * El contenido NO se recorta (`overflow` visible): mientras el bloque crece,
 * lo nuevo ya esta ahi y el contenedor de afuera, que es el que scrollea o
 * recorta, lo va descubriendo. Recortar aqui se comeria los anillos de foco de
 * los botones pegados al borde.
 *
 * Con "reducir movimiento" la transicion dura 0,01 ms (globals.css) y el alto
 * cambia de golpe, como sin este componente.
 */
export function AutoHeight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState<number | null>(null);

  // El tamano del contenido es un sistema externo: se suscribe al observer y
  // el estado cambia en su callback, no durante el render.
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(([entrada]) => {
      setAlto(entrada.borderBoxSize[0]?.blockSize ?? el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      style={alto === null ? undefined : { height: alto }}
      className="shrink-0 transition-[height] duration-200 ease-(--ease-out-soft)"
    >
      <div ref={inner} className={cn(className)}>
        {children}
      </div>
    </div>
  );
}
