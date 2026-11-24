import Image from "next/image";

import { marcarCargada } from "../CardTile";
import type { Card } from "@/lib/types";
import { CARD_RATIO } from "@/lib/ui";

/** La cara de una carta, o su dorso con el isotipo si va boca abajo u oculta. */
export function CaraOdorso({
  card,
  bocaAbajo,
}: {
  card: Card | undefined;
  bocaAbajo: boolean;
}) {
  if (bocaAbajo || !card) {
    return (
      <span
        className="from-brand-600 to-brand-800 flex size-full items-center justify-center bg-linear-to-br"
        style={{ aspectRatio: CARD_RATIO }}
      >
        <Image
          src="/brand/icon-white.svg"
          alt=""
          width={40}
          height={40}
          className="opacity-70"
          draggable={false}
        />
      </span>
    );
  }
  return (
    <Image
      src={card.thumb}
      alt=""
      width={200}
      height={286}
      onLoad={marcarCargada}
      draggable={false}
      className="imagen-carga pointer-events-none size-full object-cover"
    />
  );
}
