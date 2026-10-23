import type { CartaDoc } from "@/lib/dar";
import { CARD_RATIO } from "@/lib/ui";
import { ENLACE_EN_TEXTO } from "./Marcado";

/**
 * Las partes de una carta (seccion 1 del DAR), sobre Wyrm de la Plaga de
 * Escuelas Elementales: una letra encima de cada parte, la misma de su regla.
 * El original la dibuja con flechas y rotulos encima del arte; aqui los
 * rotulos van en una leyenda al costado, que es texto y enlaza a la regla.
 */
const PARTES: { letra: string; parte: string; x: number; y: number }[] = [
  // x, y: el centro de la letra, en % del ancho y el alto de la carta (420×602).
  { letra: "A", parte: "Nombre", x: 8.5, y: 30 },
  { letra: "B", parte: "Coste de Oro", x: 91, y: 7.5 },
  { letra: "C", parte: "Símbolo de carta", x: 7.5, y: 7.5 },
  { letra: "D", parte: "Caja de texto", x: 8, y: 73 },
  { letra: "E", parte: "Código de coleccionista", x: 92, y: 93 },
  { letra: "F", parte: "Raza", x: 9.5, y: 14.5 },
  { letra: "G", parte: "Texto épico", x: 71, y: 66 },
  { letra: "H", parte: "Símbolo de Frecuencia", x: 83, y: 82.5 },
  { letra: "I", parte: "Ilustrador", x: 15, y: 50 },
];

export function AnatomiaCarta({ carta }: { carta: CartaDoc }) {
  return (
    <figure className="my-6 flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="relative w-[240px] shrink-0 self-center sm:w-[280px] sm:self-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={carta.imagen}
          alt={`${carta.nombre}, con sus partes marcadas`}
          loading="lazy"
          decoding="async"
          style={{ aspectRatio: CARD_RATIO }}
          className="rounded-card border-line block w-full border shadow-lg"
        />
        {PARTES.map((p) => (
          <span
            key={p.letra}
            aria-hidden="true"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="bg-brand-600 ring-bg absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-lg ring-2"
          >
            {p.letra}
          </span>
        ))}
      </div>
      <figcaption className="min-w-0 flex-1">
        <p className="text-muted mb-3 text-[13px] leading-relaxed">
          Las partes de una carta, sobre {carta.nombre}. Cada letra es la de su regla.
        </p>
        <ol className="grid gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-2">
          {[...PARTES]
            .sort((a, b) => a.letra.localeCompare(b.letra))
            .map((p) => (
              <li key={p.letra} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="bg-accent-soft text-accent flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                >
                  {p.letra}
                </span>
                <a href={`#1-${p.letra}`} className={ENLACE_EN_TEXTO}>
                  {p.parte}
                </a>
              </li>
            ))}
        </ol>
      </figcaption>
    </figure>
  );
}
