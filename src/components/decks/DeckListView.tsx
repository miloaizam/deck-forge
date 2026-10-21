"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  Hammer,
  ImageDown,
  Layers,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";

import { copyShareLink, downloadDeck } from "./actions";
import { descargarImagenDeBaraja } from "./deck-image";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "../toast";
import { DeckTransfer } from "./DeckTransfer";
import { ConCatalogo } from "../ConCatalogo";
import { useCatalogo } from "../use-catalogo";
import { DeckListSkeleton } from "../Skeleton";
import { EstadoPastilla, estadoDeBaraja } from "./DeckIssues";
import { useDecks, useHydrated } from "./use-decks";
import { deckTitle, duplicateDeck } from "@/lib/deck";
import {
  buildCardIndex,
  deckStats,
  resolveDeck,
  validateDeck,
  DECK_TOTAL,
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
import {
  BOTON_ICONO_COMPACTO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO_COMPACTO,
  HOVER_PELIGRO,
  VACIO,
} from "@/lib/ui";
import { cn } from "@/lib/utils";
import { marcarCargada } from "../CardTile";

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

/*
 * Los botones de una tarjeta van en su version COMPACTA (ui.ts): cinco
 * seguidos bajo dos lineas de texto, a 44 px la fila pesaba mas que la baraja
 * que describe. Se ven de 36 y se pulsan de 44.
 */
const ACCION = BOTON_SECUNDARIO_COMPACTO;
const ACCION_ICONO = BOTON_ICONO_COMPACTO;

/** Mis barajas: espera al catalogo, que trae el nombre y el arte de cada carta. */
export function DeckListView() {
  const decks = useDecks();
  const cargado = useHydrated();
  const { cards } = useCatalogo();
  // Sin barajas no hay cartas que mostrar: la lista vacia no espera al
  // catalogo (era lo ultimo en pintarse de la pagina).
  if (cargado && decks.length === 0) return <DeckList cards={cards ?? []} />;
  return (
    <ConCatalogo esqueleto={<DeckListSkeleton />}>
      {(cards) => <DeckList cards={cards} />}
    </ConCatalogo>
  );
}

function DeckList({ cards }: DeckListViewProps) {
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
        <Link href="/constructor" className={BOTON_PRIMARIO}>
          <Plus size={14} aria-hidden="true" />
          Armar una baraja
        </Link>

        <DeckTransfer decks={decks} onImport={importar} />
      </div>

      {!cargado ? (
        // Esqueleto, no spinner: la lista sale de localStorage al montar.
        <DeckListSkeleton />
      ) : decks.length === 0 ? (
        <div className={VACIO}>
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
        // `grid-cols-1` y no una grilla sin columnas: sin ella la unica columna
        // del telefono toma el ancho minimo del contenido y la tarjeta se sale
        // de la pantalla en vez de truncar el titulo y bajar los botones.
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {decks.map((deck) => {
            const res = resolveDeck(deck, index);
            const stats = deckStats(res);
            const estado = estadoDeBaraja(validateDeck(deck, index));
            const portada = deck.portada ? index.porId.get(deck.portada) : undefined;

            return (
              <li
                key={deck.id}
                // Se levanta al pasar el cursor, como las cartas del catalogo:
                // dice que la tarjeta es algo con que se puede hacer cosas.
                // `relative`: el enlace del titulo se estira sobre la tarjeta
                // entera (su ::after), y los botones van por encima con z-10.
                className="aparece border-line bg-panel rounded-panel ease-out-soft hover:outline-brand-500 group relative flex cursor-pointer gap-3 border p-3.5 transition duration-200 focus-within:-translate-y-0.5 hover:-translate-y-0.5 hover:outline-2 hover:outline-offset-2"
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
                    // Tamano fijo en la proporcion de la carta (92 x 131,
                    // CARD_RATIO) y arriba. Estirada al alto de la tarjeta se
                    // recortaba: una nota de dos lineas o los botones en dos
                    // filas la hacian mas alta que la foto, y `object-cover`
                    // se comia los costados del arte. Asi la foto fija el alto
                    // minimo y, si el contenido es mas alto, queda arriba.
                    onLoad={marcarCargada}
                    className="imagen-carga border-line h-[131px] w-[92px] shrink-0 self-start rounded border object-cover"
                  />
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  {/* La pastilla baja bajo el texto cuando la tarjeta es
                      angosta: a su lado dejaba el titulo en «Faerie …» y la
                      fecha partida en cuatro lineas. */}
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
                    <div className="min-w-0 flex-[1_1_11rem]">
                      <Link
                        href={`/baraja/?m=${deck.id}`}
                        // Toda la tarjeta abre la baraja: un solo enlace, con
                        // su ::after cubriendola, en vez de un enlace que
                        // envuelva los botones (no se anida lo interactivo).
                        className="text-ink focus-visible:outline-brand-500 rounded-panel group-hover:text-accent block truncate font-medium transition-colors after:absolute after:inset-0 after:content-['']"
                      >
                        {deckTitle(deck)}
                      </Link>
                      <p className="text-muted mt-0.5 text-[13px] tabular-nums">
                        {stats.totalPrincipal}/{DECK_TOTAL} cartas
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
                    <EstadoPastilla estado={estado} />
                  </div>

                  {/* `mt-auto` los manda al fondo: la portada fija el alto de
                      la tarjeta y los botones cierran contra su borde. */}
                  <div className="relative z-10 mt-auto flex flex-wrap gap-1.5 self-start">
                    <Link href={`/constructor/?m=${deck.id}`} className={ACCION}>
                      <Hammer size={14} aria-hidden="true" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => descargarImagenDeBaraja(deck, res)}
                      aria-label={`Descargar ${deckTitle(deck)} como imagen`}
                      title="Descargar como imagen"
                      className={ACCION_ICONO}
                    >
                      <ImageDown size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareLink(deck)}
                      aria-label={`Copiar enlace de ${deckTitle(deck)}`}
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
                      className={cn(ACCION_ICONO, HOVER_PELIGRO)}
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
