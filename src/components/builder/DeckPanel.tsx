"use client";

import Image from "next/image";
import { Check, Coins, Trash2, TriangleAlert } from "lucide-react";

import { CostCurve } from "../CostCurve";
import { BOTON_FILA, CAJA_FILA, QuantityStepper } from "./QuantityStepper";
import { CARD_RATIO } from "../CardTile";
import type { DeckZone } from "@/lib/deck";
import {
  canAdd,
  isLegal,
  type CardIndex,
  type DeckIssue,
  type DeckStats,
  type ResolvedDeck,
  type ResolvedEntry,
  DECK_TOTAL,
} from "@/lib/deck-rules";
import { SECCIONES_DE_LA_BARAJA, type Deck, type Tipo } from "@/lib/types";
import { ETIQUETA_ORO } from "@/lib/oros";
import { cn } from "@/lib/utils";

interface DeckPanelProps {
  deck: Deck;
  res: ResolvedDeck;
  stats: DeckStats;
  issues: DeckIssue[];
  index: CardIndex;
  onSetQuantity: (cardId: string, zone: DeckZone, n: number) => void;
  onSetStartingGold: (cardId: string | null) => void;
  onVer: (cardId: string) => void;
  onBlocked: (mensaje: string) => void;
}

/**
 * El interruptor de oro inicial vive en la fila de su Oro.
 *
 * Antes era una caja aparte que repetia los nombres de los Oros de la baraja; aqui
 * ocupa el ancho de un boton y se elige donde ya esta la carta.
 */
function OroInicialToggle({
  nombre,
  activo,
  bloqueo,
  onToggle,
  onBlocked,
}: {
  nombre: string;
  activo: boolean;
  /** Por que no se puede elegir, si es que no se puede. */
  bloqueo?: string;
  onToggle: () => void;
  onBlocked: (mensaje: string) => void;
}) {
  const etiqueta = activo
    ? `${nombre} es el oro inicial. Quitarlo de ese puesto`
    : (bloqueo ?? `Usar ${nombre} como oro inicial`);

  return (
    <button
      type="button"
      onClick={() => (bloqueo ? onBlocked(bloqueo) : onToggle())}
      aria-pressed={activo}
      // aria-disabled y no disabled, igual que en el boton de sumar: sigue
      // enfocable y al pulsarlo dice por que no se puede, en vez de callarse.
      aria-disabled={bloqueo ? true : undefined}
      title={activo ? "Es el oro inicial" : (bloqueo ?? "Usar como oro inicial")}
      aria-label={etiqueta}
      className={cn(BOTON_FILA, bloqueo && !activo && "cursor-not-allowed")}
    >
      <span
        className={cn(
          CAJA_FILA,
          // El activo si lleva caja fija: no es una accion que se ofrece al
          // apuntar, es el estado de la baraja y tiene que verse sin tocarlo.
          activo
            ? "border-brand-600 bg-accent-soft text-accent"
            : bloqueo
              ? "text-muted/25"
              : "text-muted/60 group-hover/b:border-brand-500 group-hover/b:bg-accent-soft group-hover/b:text-accent",
        )}
      >
        <Coins size={14} aria-hidden="true" />
      </span>
    </button>
  );
}

function Fila({
  entry,
  zone,
  deck,
  index,
  esOroInicial,
  onSetQuantity,
  onSetStartingGold,
  onVer,
  onBlocked,
}: {
  entry: ResolvedEntry;
  zone: DeckZone;
  deck: Deck;
  index: CardIndex;
  esOroInicial: boolean;
  onSetQuantity: (cardId: string, zone: DeckZone, n: number) => void;
  onSetStartingGold: (cardId: string | null) => void;
  onVer: (cardId: string) => void;
  onBlocked: (mensaje: string) => void;
}) {
  const check = canAdd(deck, entry.card, zone, index);
  // El oro inicial sale de las 50 del principal: un Oro del side no sirve.
  const puedeSerOroInicial = zone === "principal" && entry.card.oroSinHabilidad;
  // Y tiene que ser una carta concreta, no una de varias iguales: con dos o mas
  // copias en la baraja no se sabria cual es la que se aparta al empezar.
  const bloqueoOro =
    !esOroInicial && entry.n > 1
      ? `${entry.card.nombre} no puede ser el oro inicial: llevas ${entry.n} copias y tiene que ser un Oro con una sola.`
      : undefined;

  return (
    // `fila-entra`: la carta nueva aparece con un fundido (globals.css).
    <li className="fila-entra flex items-center gap-2 py-1.5">
      {/* La carta se abre desde su nombre y su miniatura, que es lo que el
          usuario ya mira; los botones de la derecha quedan fuera. */}
      <button
        type="button"
        onClick={() => onVer(entry.card.id)}
        aria-label={`Ver ${entry.card.nombre}`}
        className="focus-visible:outline-brand-500 group flex min-w-0 flex-1 items-center gap-2.5 rounded text-left"
      >
        <Image
          src={entry.card.thumb}
          alt=""
          width={28}
          height={40}
          loading="lazy"
          className="border-line shrink-0 rounded border"
          style={{ aspectRatio: CARD_RATIO }}
        />
        <span className="min-w-0 flex-1">
          <span className="text-ink group-hover:text-accent block truncate text-[13px] leading-tight transition-colors">
            {entry.card.nombre}
          </span>
          <span className="text-muted block truncate text-[11px]">
            {/* El rol en la baraja manda sobre la clase de la carta. */}
            {esOroInicial
              ? "Oro inicial"
              : entry.card.claseOro
                ? ETIQUETA_ORO[entry.card.claseOro]
                : (entry.card.raza ?? entry.card.tipo)}
            {entry.card.unica && " · Única"}
          </span>
        </span>
      </button>
      {puedeSerOroInicial && (
        <OroInicialToggle
          nombre={entry.card.nombre}
          activo={esOroInicial}
          bloqueo={bloqueoOro}
          onToggle={() => onSetStartingGold(esOroInicial ? null : entry.card.id)}
          onBlocked={onBlocked}
        />
      )}
      <QuantityStepper
        nombre={entry.card.nombre}
        value={entry.n}
        onChange={(n) => onSetQuantity(entry.card.id, zone, n)}
        addBlocked={check.ok ? undefined : check.mensaje}
        onBlocked={onBlocked}
      />
    </li>
  );
}

function Seccion({
  titulo,
  filas,
  ...resto
}: {
  titulo: string;
  filas: ResolvedEntry[];
  zone: DeckZone;
  deck: Deck;
  index: CardIndex;
  oroInicial: string | null;
  onSetQuantity: (cardId: string, zone: DeckZone, n: number) => void;
  onSetStartingGold: (cardId: string | null) => void;
  onVer: (cardId: string) => void;
  onBlocked: (mensaje: string) => void;
}) {
  if (filas.length === 0) return null;
  const total = filas.reduce((s, f) => s + f.n, 0);

  return (
    <section className="border-line border-t pt-3">
      {/* Es lo unico que corta la lista en tramos, asi que tiene que leerse de
          un vistazo. El total va en pastilla LLENA y no en una suave: al tamano
          de un contador, un fondo tenue con letra del mismo tono se pierde
          contra el panel, que es lo que pasaba antes. */}
      <h3 className="text-ink mb-2 flex items-center justify-between gap-2 text-sm font-bold tracking-[0.1em] uppercase">
        {titulo}
        <span className="bg-brand-600 rounded-chip min-w-7 px-2 py-0.5 text-center text-xs font-bold tracking-normal text-white tabular-nums">
          {total}
        </span>
      </h3>
      <ul className="divide-line divide-y">
        {filas.map((f) => (
          <Fila
            key={f.card.id}
            entry={f}
            esOroInicial={resto.oroInicial === f.card.id}
            zone={resto.zone}
            deck={resto.deck}
            index={resto.index}
            onSetQuantity={resto.onSetQuantity}
            onSetStartingGold={resto.onSetStartingGold}
            onVer={resto.onVer}
            onBlocked={resto.onBlocked}
          />
        ))}
      </ul>
    </section>
  );
}

export function DeckPanel({
  deck,
  res,
  stats,
  issues,
  index,
  onSetQuantity,
  onSetStartingGold,
  onVer,
  onBlocked,
}: DeckPanelProps) {
  const legal = isLegal(issues);
  const errores = issues.filter((i) => i.gravedad === "error");
  const avisos = issues.filter((i) => i.gravedad === "aviso");

  const porTipo = (t: Tipo) => res.principal.filter((e) => e.card.tipo === t);
  const comun = {
    deck,
    index,
    oroInicial: deck.oroInicial,
    onSetQuantity,
    onSetStartingGold,
    onVer,
    onBlocked,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Estado siempre a la vista: si la baraja es legal y cuantas cartas lleva.
          Van en la misma fila y la cuenta a la derecha, alineada con los totales
          de cada tramo: asi ocupa un solo sitio, lo diga lo que diga el estado.
          Antes iba encima y en su propia linea, y el numero se corria hacia
          abajo segun cuantas cosas hubiera por corregir. */}
      <div className="flex items-center justify-between gap-3">
        {/* El color nunca es el unico indicador: siempre icono y texto. */}
        <p
          className={cn(
            "flex items-center gap-2 text-[13px]",
            legal ? "text-accent" : "text-muted",
          )}
        >
          {legal ? (
            <Check size={15} aria-hidden="true" className="shrink-0" />
          ) : (
            <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
          )}
          {legal
            ? "La baraja cumple las reglas del formato"
            : errores.length === 1
              ? "1 cosa por corregir"
              : `${errores.length} cosas por corregir`}
        </p>

        <p className="text-ink shrink-0 text-2xl leading-none font-bold tabular-nums">
          {stats.totalPrincipal}
          <span className="text-muted text-base font-normal">/{DECK_TOTAL}</span>
        </p>
      </div>

      {(errores.length > 0 || avisos.length > 0) && (
        <ul className="text-muted flex flex-col gap-1.5 text-[13px] leading-snug">
          {[...errores, ...avisos].map((i, n) => (
            <li key={`${i.code}-${n}`} className="aparece flex gap-2">
              <span aria-hidden="true" className="text-muted/60">
                ·
              </span>
              {i.mensaje}
            </li>
          ))}
        </ul>
      )}

      {res.principal.length === 0 && res.side.length === 0 ? (
        <p className="text-muted border-line rounded-card border border-dashed px-4 py-10 text-center text-[13px] leading-relaxed">
          La baraja está vacía. Agrega cartas desde el catálogo con el botón
          <span className="text-accent"> + </span>
          de cada una.
        </p>
      ) : (
        <>
          {/* Solo del principal, como los contadores: el side no se juega de
              salida. Con el side solo no hay curva que mirar. */}
          {res.principal.length > 0 && (
            <CostCurve curva={stats.curva} oros={stats.porTipo.Oro} />
          )}

          {SECCIONES_DE_LA_BARAJA.map(({ tipo, titulo }) => (
            <Seccion
              key={tipo}
              titulo={titulo}
              filas={porTipo(tipo)}
              zone="principal"
              {...comun}
            />
          ))}

          <Seccion titulo="Side deck" filas={res.side} zone="side" {...comun} />
        </>
      )}
    </div>
  );
}

/** Boton para vaciar, aparte del panel porque no se usa casi nunca. */
export function DeckClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-4 text-[13px] transition-colors"
    >
      <Trash2 size={14} aria-hidden="true" />
      Vaciar la baraja
    </button>
  );
}
