import { Minus, Plus, Sparkles } from "lucide-react";

import { CardRibbons } from "./CardRibbons";
import { claseDeOro, PASTILLA_ORO, subtituloDeCarta } from "@/lib/oros";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Apaga el latido de `.imagen-carga` cuando la imagen llego. Es un atributo
 * que React no maneja, asi que tocarlo en el DOM no pelea con el render; y
 * next/image dispara `onLoad` tambien con las que ya estaban en cache.
 */
export function marcarCargada(e: React.SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.dataset.cargada = "";
}

/** Proporcion real del arte de las cartas MyL: 512 x 732. */
export const CARD_RATIO = "512 / 732";

interface CardTileProps {
  card: Card;
  onSelect: (card: Card) => void;
  /** Copias en la baraja. Solo el constructor las pasa. */
  copies?: number;
  /** Si viene, la carta muestra un boton para sumarla a la baraja. */
  onAdd?: (card: Card) => void;
  /** Si viene, y hay copias, la carta muestra un boton para quitar una. */
  onRemove?: (card: Card) => void;
  /** Por que no se puede agregar. Si viene, pulsar el boton llama a `onBlocked`. */
  addBlocked?: string;
  /** Explica el bloqueo al pulsar un boton bloqueado (un aviso, en el constructor). */
  onBlocked?: (mensaje: string) => void;
}

export function CardTile({
  card,
  onSelect,
  copies = 0,
  onAdd,
  onRemove,
  addBlocked,
  onBlocked,
}: CardTileProps) {
  const clase = claseDeOro(card);
  const pastilla = clase ? PASTILLA_ORO[clase] : undefined;
  return (
    // El boton de agregar va superpuesto y aparte: un <button> no puede anidar
    // otro <button>. Mismo apano que en Select.tsx con el boton de limpiar.
    <div className="group border-line bg-panel ease-out-soft hover:border-brand-500 hover:shadow-glow rounded-card relative overflow-hidden border transition duration-200 focus-within:-translate-y-1 hover:-translate-y-1">
      <button
        type="button"
        onClick={() => onSelect(card)}
        aria-label={`Ver detalle de ${card.nombre}`}
        className="focus-visible:outline-brand-500 block w-full text-left"
      >
        <span className="relative block">
          {/* <img> y no next/image: con `unoptimized` (no hay servidor),
              next/image pisa el srcSet. La miniatura de 200 px se ve borrosa
              en una pantalla 2x, que pide ~370 px fisicos: ahi baja la imagen
              de 420. Una pagina de 35 cartas pasa de ~0,5 MB a ~2,2 MB solo
              en esas pantallas, y con carga diferida. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.thumb}
            srcSet={`${card.thumb} 1x, ${card.imagen} 2x`}
            alt={`Carta: ${card.nombre}`}
            width={200}
            height={286}
            loading="lazy"
            decoding="async"
            // Mientras baja la imagen, su hueco late (`.imagen-carga`).
            onLoad={marcarCargada}
            // Si la imagen llego antes de hidratar, onLoad ya no salta.
            ref={(el) => {
              if (el?.complete && el.naturalWidth) el.dataset.cargada = "";
            }}
            className="imagen-carga w-full"
            style={{ aspectRatio: CARD_RATIO }}
          />
          {/* Los Oros iniciales de edicion y de raza se lucen: son la carta
              que se elige por gusto. La pastilla es adorno; el texto de abajo
              ya dice la clase para el lector de pantalla. */}
          <CardRibbons card={card} />
          {pastilla && (
            <span
              aria-hidden="true"
              className="bg-surface/85 text-accent rounded-chip absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium backdrop-blur"
            >
              <Sparkles size={12} />
              {pastilla}
            </span>
          )}
        </span>
        <span className="block px-2.5 py-2">
          <span className="text-ink group-hover:text-accent block truncate text-[13px] leading-tight font-medium transition-colors">
            {card.nombre}
          </span>
          <span className="text-muted mt-0.5 block truncate text-[11px]">
            {subtituloDeCarta(card)}
          </span>
        </span>
      </button>

      {/* Los controles del constructor van al pie, bajo el nombre, y no
          encima del arte: en las esquinas tapaban el coste, la Fuerza y el
          lazo de errata, que es justo lo que se mira para elegir. */}
      {onAdd && (
        <div
          className={cn(
            "border-line flex items-center justify-between border-t",
            copies > 0 && "bg-accent-soft",
          )}
        >
          <button
            type="button"
            onClick={() => onRemove?.(card)}
            disabled={copies === 0 || !onRemove}
            aria-label={`Quitar una copia de ${card.nombre}`}
            className="text-muted hover:text-ink focus-visible:outline-brand-500 flex size-11 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-0"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          {/* El numero tambien va como texto para el lector de pantalla: el
              color no puede ser el unico indicador. */}
          <span
            aria-live="polite"
            className={cn(
              "text-[15px] tabular-nums",
              copies > 0 ? "text-accent font-bold" : "text-muted/50",
            )}
          >
            {copies}
            <span className="sr-only"> en la baraja</span>
          </span>
          <button
            type="button"
            // Bloqueado, el clic explica el motivo. Antes se tragaba aqui y el
            // motivo quedaba solo en el `title`, que en un telefono no se ve.
            onClick={() => (addBlocked ? onBlocked?.(addBlocked) : onAdd(card))}
            // aria-disabled y no disabled: el boton sigue enfocable y al pulsarlo
            // puede EXPLICAR por que no se puede. Un disabled no dice nada.
            aria-disabled={addBlocked ? true : undefined}
            title={addBlocked}
            aria-label={addBlocked ?? `Agregar ${card.nombre} a la baraja`}
            className={cn(
              "focus-visible:outline-brand-500 flex size-11 items-center justify-center transition-colors",
              addBlocked
                ? "text-muted/40 cursor-not-allowed"
                : "text-accent hover:bg-brand-600 hover:text-white",
            )}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
