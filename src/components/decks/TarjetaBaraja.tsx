"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { EyeOff, Globe } from "lucide-react";

import { marcarCargada } from "../CardTile";
import { EstadoPastilla, estadoDeBaraja } from "./DeckIssues";
import { deckTitle, portadaPorDefecto } from "@/lib/deck";
import {
  deckStats,
  resolveDeck,
  validateDeck,
  DECK_TOTAL,
  type CardIndex,
} from "@/lib/deck-rules";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import type { Deck } from "@/lib/types";
import { PASTILLA } from "@/lib/ui";
import { cn } from "@/lib/utils";

const FECHA = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });

/**
 * El esquema ya acota la fecha, pero `format` lanza RangeError con una fecha
 * invalida y eso tumba la lista entera. Una fecha rara no vale ese precio.
 */
function formatFecha(ms: number): string {
  const fecha = new Date(ms);
  return Number.isFinite(fecha.getTime()) ? FECHA.format(fecha) : "—";
}

/** Lo de la Comunidad que se pinta en la tarjeta (de `useNube`). */
interface Publico {
  publica: boolean;
  oculta: boolean;
  likes: number;
}

/** Que hace el clic en la tarjeta: abrir una pagina o elegir la baraja. */
type Destino =
  { href: string; onElegir?: never } | { onElegir: () => void; href?: never };

type TarjetaBarajaProps = Destino & {
  deck: Deck;
  /** El indice de reglas del formato de la baraja (`indiceDe`). */
  index: CardIndex;
  publico?: Publico;
  /** La fila de botones del pie (Mis barajas); sin ella, solo se elige. */
  acciones?: ReactNode;
};

// Toda la tarjeta responde al clic: un solo enlace o boton, con su ::after
// cubriendola, en vez de envolver los botones (no se anida lo interactivo).
const ESTIRADO =
  "text-ink focus-visible:outline-brand-500 rounded-panel group-hover:text-accent block w-full truncate text-left font-medium transition-colors after:absolute after:inset-0 after:content-['']";

/**
 * La tarjeta de una baraja: la de Mis barajas y la de elegir baraja en la
 * mesa de practica, para que se vean igual en las dos.
 */
export function TarjetaBaraja({
  deck,
  index,
  publico,
  acciones,
  href,
  onElegir,
}: TarjetaBarajaProps) {
  const res = resolveDeck(deck, index);
  const stats = deckStats(res);
  const estado = estadoDeBaraja(validateDeck(deck, index));
  // La elegida en /baraja o, si no hay, su Aliado con mas copias: la misma
  // regla que la Comunidad.
  const portadaId =
    (deck.portada && index.porId.has(deck.portada) ? deck.portada : null) ??
    portadaPorDefecto(deck.principal, (id) => index.porId.get(id)?.tipo);
  const portada = portadaId ? index.porId.get(portadaId) : undefined;

  return (
    <li
      // Se levanta al pasar el cursor, como las cartas del catalogo: dice que
      // la tarjeta es algo con que se puede hacer cosas. `relative`: el enlace
      // del titulo se estira sobre la tarjeta entera (su ::after), y los
      // botones van por encima con z-10. `@container`: lo de adentro se
      // acomoda al ancho de la tarjeta, no al de la pantalla.
      className="aparece border-line bg-panel rounded-panel ease-out-soft hover:outline-brand-500 group @container relative flex cursor-pointer gap-3 border p-3.5 transition duration-200 focus-within:-translate-y-0.5 hover:-translate-y-0.5 hover:outline-2 hover:outline-offset-2"
    >
      {/* La portada va a la izquierda de todo lo demas. Solo una baraja vacia
          queda sin foto: un hueco vacio diria menos que la tarjeta sin ella. */}
      {portada && (
        <Image
          src={portada.thumb}
          alt=""
          width={64}
          height={92}
          loading="lazy"
          // Tamano fijo en la proporcion de la carta (92 x 131, CARD_RATIO) y
          // arriba. Estirada al alto de la tarjeta se recortaba: una nota de
          // dos lineas o los botones en dos filas la hacian mas alta que la
          // foto, y `object-cover` se comia los costados del arte. Asi la foto
          // fija el alto minimo y, si el contenido es mas alto, queda arriba.
          onLoad={marcarCargada}
          // En una tarjeta angosta (el telefono) la foto se achica y le deja
          // ese sitio al titulo.
          className="imagen-carga border-line h-[92px] w-[64px] shrink-0 self-start rounded border object-cover @sm:h-[131px] @sm:w-[92px]"
        />
      )}

      <div className="@container flex min-w-0 flex-1 flex-col gap-2.5">
        {/* La pastilla va bajo el texto cuando la columna de texto (sin la
            portada: es su propio `@container`) mide menos de 20rem: a su lado
            dejaba el titulo en «Faerie …» y la fecha partida en cuatro
            lineas. */}
        <div className="flex flex-col items-start gap-x-2 gap-y-1.5 @xs:flex-row @xs:justify-between">
          <div className="w-full min-w-0 @xs:w-auto @xs:flex-1">
            {href !== undefined ? (
              <Link href={href} className={ESTIRADO}>
                {deckTitle(deck)}
              </Link>
            ) : (
              <button type="button" onClick={onElegir} className={ESTIRADO}>
                {deckTitle(deck)}
              </button>
            )}
            <p className="text-muted mt-0.5 text-[13px] tabular-nums">
              {stats.totalPrincipal}/{DECK_TOTAL} cartas
              {stats.totalSide > 0 && ` · side ${stats.totalSide}`}
              {` · ${NOMBRE_FORMATO[deck.formato]} · `}
              {formatFecha(deck.actualizado)}
            </p>
            {/* Dos lineas como mucho: la tarjeta tiene que seguir midiendo lo
                mismo lleve nota o no. */}
            {deck.descripcion.trim() !== "" && (
              <p className="text-muted mt-1 line-clamp-2 text-[13px] leading-snug">
                {deck.descripcion}
              </p>
            )}
          </div>

          {/* Icono y texto: el color no puede ser el unico indicador. */}
          <div className="flex shrink-0 flex-wrap gap-1.5 @xs:flex-col @xs:items-end">
            <EstadoPastilla estado={estado} />
            {publico?.publica &&
              (publico.oculta ? (
                <span className={cn(PASTILLA, "bg-warning-soft text-warning")}>
                  <EyeOff size={12} aria-hidden="true" />
                  Oculta por moderación
                </span>
              ) : (
                <span className={cn(PASTILLA, "bg-accent-soft text-accent tabular-nums")}>
                  <Globe size={12} aria-hidden="true" />
                  Pública · {publico.likes} {publico.likes === 1 ? "like" : "likes"}
                </span>
              ))}
          </div>
        </div>

        {/* `mt-auto` los manda al fondo: la portada fija el alto de la tarjeta
            y los botones cierran contra su borde. */}
        {acciones && (
          <div className="relative z-10 mt-auto flex flex-wrap gap-1.5 self-start">
            {acciones}
          </div>
        )}
      </div>
    </li>
  );
}
