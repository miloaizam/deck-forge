"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Hammer,
  Layers,
  Link2,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { copyShareLink, downloadDeck } from "./actions";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "../toast";
import { DeckTransfer } from "./DeckTransfer";
import { DeckListSkeleton } from "../Skeleton";
import { useDecks, useHydrated } from "./use-decks";
import { deckTitle, duplicateDeck } from "@/lib/deck";
import {
  buildCardIndex,
  deckStats,
  isLegal,
  resolveDeck,
  validateDeck,
} from "@/lib/deck-rules";
import {
  deleteDeck,
  mensajeNoGuardada,
  mergeImported,
  nombreLibre,
  saveDeck,
  saveDecks,
} from "@/lib/deck-storage";
import type { Card, Deck } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CARD_RATIO } from "../CardTile";

interface DeckListViewProps {
  cards: Card[];
}

const FECHA = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });

/**
 * El esquema ya acota la fecha, pero `format` lanza RangeError con una fecha
 * invalida y eso tumba la lista entera. Una fecha rara no vale ese precio.
 */
function formatFecha(ms: number): string {
  const fecha = new Date(ms);
  return Number.isFinite(fecha.getTime()) ? FECHA.format(fecha) : "—";
}

/**
 * Los botones de una tarjeta, mas compactos que los de una pagina.
 *
 * Aqui van cinco seguidos bajo dos lineas de texto: a la altura de un boton
 * suelto (h-11) la fila pesaba mas que la baraja que describe. A 36px siguen
 * comodos de pulsar y la tarjeta se lee de una.
 */
const ACCION =
  "text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-9 items-center gap-1.5 border px-2.5 text-[13px] transition-colors";
const ACCION_ICONO =
  "text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex size-9 items-center justify-center border transition-colors";

export function DeckListView({ cards }: DeckListViewProps) {
  // La lista sale del store, no de estado propio: asi se mantiene al dia sola
  // cuando se guarda una baraja, aqui o en otra pestana.
  const decks = useDecks();
  const cargado = useHydrated();
  /** Que baraja esta esperando confirmacion de borrado. Borrar no tiene vuelta. */
  const [porBorrar, setPorBorrar] = useState<Deck | null>(null);

  const index = useMemo(() => buildCardIndex(cards), [cards]);

  // Ninguna de estas toca estado local: escriben en el store y la lista se
  // vuelve a leer sola.
  const borrar = (deck: Deck) => {
    deleteDeck(deck.id);
    setPorBorrar(null);
    toast(`Baraja "${deckTitle(deck)}" eliminada.`, "delete");
  };

  const duplicar = (deck: Deck) => {
    // La copia no puede llamarse igual que otra: sale "X (copia)", "X (copia 2)"…
    const copia = duplicateDeck(deck, nombreLibre(deck.nombre, decks));
    const r = saveDeck(copia);
    if (r === "ok") {
      toast(`Baraja duplicada como "${deckTitle(copia)}".`, "success");
    } else toast(mensajeNoGuardada(r, "duplicar"), "warning");
  };

  const importar = (nuevos: Deck[]) => {
    const merge = mergeImported(decks, nuevos);
    // Si no entro ninguna no hay nada que escribir: guardar igual solo
    // reescribiria la misma lista.
    const guardado = merge.entraron === 0 || saveDecks(merge.lista);
    return { ...merge, guardado };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/constructor"
          className="bg-brand-600 hover:bg-brand-500 rounded-chip focus-visible:outline-brand-300 inline-flex h-11 items-center gap-2 px-4 text-sm font-medium text-white transition-colors"
        >
          <Plus size={16} aria-hidden="true" />
          Armar una baraja
        </Link>

        <DeckTransfer decks={decks} onImport={importar} />
      </div>

      {!cargado ? (
        // Esqueleto, no spinner: la lista sale de localStorage al montar.
        <DeckListSkeleton />
      ) : decks.length === 0 ? (
        <div className="border-line rounded-panel border border-dashed px-6 py-20 text-center">
          <Layers
            size={28}
            aria-hidden="true"
            className="text-muted mx-auto mb-4 opacity-60"
          />
          <p className="text-ink text-lg">Todavía no tienes barajas.</p>
          <p className="text-muted mx-auto mt-3 max-w-[46ch] leading-relaxed">
            Las barajas que armes se guardan solo en este navegador. Si cambias de equipo,
            expórtalas a un archivo y vuelve a importarlas allá.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const res = resolveDeck(deck, index);
            const stats = deckStats(res);
            const legal = isLegal(validateDeck(deck, index));
            const portada = deck.portada ? index.porId.get(deck.portada) : undefined;

            return (
              <li
                key={deck.id}
                className="aparece border-line bg-panel rounded-panel flex gap-3 border p-3.5"
              >
                {/* La portada la elige el usuario en /baraja, y va a la izquierda
                    de todo lo demas. Si la carta ya no esta en el catalogo no
                    se dibuja nada: un hueco vacio diria menos que la tarjeta
                    sin foto. */}
                {portada && (
                  <Image
                    src={portada.thumb}
                    alt=""
                    width={64}
                    height={92}
                    loading="lazy"
                    style={{ aspectRatio: CARD_RATIO }}
                    // Del titulo al pie de los botones. El ancho es el que
                    // pide la proporcion de la carta a ese alto (92 por 131): a
                    // 64 el recorte se comia los bordes del arte. Y como la
                    // proporcion tambien da el alto minimo, la tarjeta sin nota
                    // crece hasta la foto en vez de recortarla.
                    className="border-line w-[92px] shrink-0 self-stretch rounded border object-cover"
                  />
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/baraja/?m=${deck.id}`}
                        className="text-ink hover:text-accent focus-visible:outline-brand-500 block truncate rounded font-medium transition-colors"
                      >
                        {deckTitle(deck)}
                      </Link>
                      <p className="text-muted mt-0.5 text-[13px] tabular-nums">
                        {stats.totalPrincipal} cartas
                        {stats.totalSide > 0 && ` · side ${stats.totalSide}`}
                        {" · "}
                        {formatFecha(deck.actualizado)}
                      </p>
                      {/* Dos lineas como mucho: la tarjeta tiene que seguir
                          midiendo lo mismo lleve nota o no. */}
                      {deck.descripcion.trim() !== "" && (
                        <p className="text-muted mt-1 line-clamp-2 text-[13px] leading-snug">
                          {deck.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Icono y texto: el color no puede ser el unico indicador. */}
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 text-[13px]",
                        legal ? "text-accent" : "text-muted",
                      )}
                    >
                      {legal ? (
                        <Check size={14} aria-hidden="true" />
                      ) : (
                        <TriangleAlert size={14} aria-hidden="true" />
                      )}
                      {legal ? "Legal" : "Incompleto"}
                    </span>
                  </div>

                  {/* `mt-auto` los manda al fondo: la portada fija el alto de
                      la tarjeta y los botones cierran contra su borde. */}
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <Link href={`/constructor/?m=${deck.id}`} className={ACCION}>
                      <Hammer size={14} aria-hidden="true" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => void copyShareLink(deck)}
                      aria-label={`Compartir ${deckTitle(deck)}`}
                      title="Copiar enlace"
                      className={ACCION_ICONO}
                    >
                      <Link2 size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDeck(deck)}
                      aria-label={`Exportar ${deckTitle(deck)}`}
                      title="Exportar a un archivo"
                      className={ACCION_ICONO}
                    >
                      <Download size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicar(deck)}
                      aria-label={`Duplicar ${deckTitle(deck)}`}
                      title="Duplicar"
                      className={ACCION_ICONO}
                    >
                      <Copy size={14} aria-hidden="true" />
                    </button>
                    {/* Borrar pide confirmar en un modal: la baraja solo vive
                      aqui y no hay de donde recuperarlo. */}
                    <button
                      type="button"
                      onClick={() => setPorBorrar(deck)}
                      aria-label={`Borrar ${deckTitle(deck)}`}
                      title="Borrar"
                      className={ACCION_ICONO}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={porBorrar !== null}
        titulo="¿Borrar la baraja?"
        mensaje={
          porBorrar
            ? `"${deckTitle(porBorrar)}" se borra de este navegador y no hay de dónde recuperarla.`
            : ""
        }
        confirmar="Borrar la baraja"
        onConfirm={() => porBorrar && borrar(porBorrar)}
        onCancel={() => setPorBorrar(null)}
      />
    </div>
  );
}
