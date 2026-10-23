import Link from "next/link";

import { claveDeNombre } from "@/lib/documentos";
import type { CartaDoc, CartasDoc } from "@/lib/dar";
import { CARD_RATIO, CONTORNO_CARTA } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Una carta de ejemplo del DAR: la imagen del catalogo, que lleva a la carta.
 * Las que no son del formato no tienen imagen y van como un hueco con su
 * nombre, del mismo tamaño, para que la fila no cambie de forma.
 */
export function CartaEjemplo({
  nombre,
  carta,
  className,
}: {
  nombre: string;
  carta: CartaDoc | undefined;
  /** El ancho: lo pone quien la usa. */
  className: string;
}) {
  if (!carta) {
    return (
      <span
        style={{ aspectRatio: CARD_RATIO }}
        className={cn(
          "border-line bg-surface rounded-card flex flex-col items-center justify-center gap-1 border border-dashed p-2 text-center",
          className,
        )}
      >
        <span className="text-ink text-[13px] font-semibold">{nombre}</span>
        <span className="text-muted text-[11px] leading-snug">Fuera del formato</span>
      </span>
    );
  }
  return (
    <Link
      href={`/catalogo?q=${encodeURIComponent(carta.nombre)}`}
      prefetch={false}
      className={cn(
        "border-line bg-panel block overflow-hidden border shadow-lg",
        CONTORNO_CARTA,
        className,
      )}
    >
      <span className="sr-only">Ver en el catálogo: </span>
      {/* <img> y no next/image, como en CardTile: con `unoptimized` pisa el srcSet. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={carta.thumb}
        srcSet={`${carta.thumb} 200w, ${carta.imagen} 420w`}
        sizes="150px"
        alt={carta.nombre}
        loading="lazy"
        decoding="async"
        style={{ aspectRatio: CARD_RATIO }}
        className="block w-full"
      />
    </Link>
  );
}

/** Una fila de cartas de ejemplo con su pie, como las figuras del original. */
export function CartasEjemplo({
  nombres,
  pie,
  cartas,
}: {
  nombres: string[];
  pie?: string;
  cartas: CartasDoc;
}) {
  return (
    <figure className="my-6">
      <ul className="flex flex-wrap gap-3 sm:gap-4">
        {nombres.map((n) => (
          <li key={n}>
            <CartaEjemplo
              nombre={n}
              carta={cartas[claveDeNombre(n)]}
              className="w-[104px] sm:w-[132px]"
            />
          </li>
        ))}
      </ul>
      {pie && (
        <figcaption className="text-muted mt-2.5 text-[13px] leading-relaxed">
          {pie}
        </figcaption>
      )}
    </figure>
  );
}
