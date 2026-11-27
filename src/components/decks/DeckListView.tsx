"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Hammer, ImageDown, Layers, Link2, Plus, Trash2 } from "lucide-react";

import { copyShareLink } from "./actions";
import { descargarImagenDeBaraja } from "./deck-image";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "../toast";
import { ConCatalogo } from "../ConCatalogo";
import { DeckListSkeleton } from "../Skeleton";
import { TarjetaBaraja } from "./TarjetaBaraja";
import { useDecks, useHydrated } from "./use-decks";
import { useNube } from "../nube/nube";
import { deckTitle, duplicateDeck } from "@/lib/deck";
import { indiceDe, resolveDeck } from "@/lib/deck-rules";
import { deleteDeck, mensajeNoGuardada, nombreLibre, saveDeck } from "@/lib/deck-storage";
import type { Card, Deck, Formato } from "@/lib/types";
import { NUBE_ACTIVA } from "@/lib/supabase-config";
import {
  BOTON_ICONO_COMPACTO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO_COMPACTO,
  HOVER_PELIGRO,
  VACIO,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

interface ListaProps {
  /** Las cartas con las erratas de un formato: cada baraja, con las del suyo. */
  deFormato: (f: Formato) => Card[];
  decks: Deck[];
}

/*
 * Los botones de una tarjeta van en su version COMPACTA (ui.ts): cinco
 * seguidos bajo dos lineas de texto, a 44 px la fila pesaba mas que la baraja
 * que describe. Se ven de 36 y se pulsan de 44.
 */
const ACCION = BOTON_SECUNDARIO_COMPACTO;
const ACCION_ICONO = BOTON_ICONO_COMPACTO;

/**
 * Mis barajas. La fila de botones y el aviso de vacio no necesitan el
 * catalogo; la lista si (trae el nombre y el arte de cada carta), y por eso
 * solo ella espera a `ConCatalogo`.
 */
export function DeckListView() {
  // La lista sale del store, no de estado propio: asi se mantiene al dia sola
  // cuando se guarda una baraja, aqui o en otra pestana.
  const decks = useDecks();
  const cargado = useHydrated();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/constructor" className={BOTON_PRIMARIO}>
          <Plus size={14} aria-hidden="true" />
          Armar una baraja
        </Link>
      </div>

      {!cargado ? (
        // Antes de hidratar no se sabe que hay en localStorage, pero el
        // script del layout raiz ya miro: si no hay barajas, `<html>` lleva
        // `data-barajas="0"` y el CSS muestra el aviso en vez del esqueleto
        // (`.solo-sin-barajas`, globals.css). Era el elemento mas grande de
        // la pagina y Lighthouse lo daba como LCP recien tras hidratar.
        <>
          <div className="solo-con-barajas">
            <DeckListSkeleton />
          </div>
          <SinBarajas className="solo-sin-barajas" />
        </>
      ) : decks.length === 0 ? (
        <SinBarajas />
      ) : (
        <ConCatalogo esqueleto={<DeckListSkeleton />}>
          {(_, deFormato) => <ListaDeBarajas deFormato={deFormato} decks={decks} />}
        </ConCatalogo>
      )}
    </div>
  );
}

function SinBarajas({ className }: { className?: string }) {
  return (
    <div className={cn(VACIO, className)}>
      <Layers
        size={28}
        aria-hidden="true"
        className="text-muted mx-auto mb-4 opacity-60"
      />
      <p className="text-ink text-lg">Todavía no tienes barajas.</p>
      <p className="text-muted mx-auto mt-3 max-w-[46ch] leading-relaxed">
        {NUBE_ACTIVA
          ? "Las barajas que armes se guardan en este navegador y, si entras con tu cuenta, también en la nube, para tenerlas en cualquier equipo."
          : "Las barajas que armes se guardan en este navegador."}
      </p>
    </div>
  );
}

function ListaDeBarajas({ deFormato, decks }: ListaProps) {
  /** Que baraja esta esperando confirmacion de borrado. Borrar no tiene vuelta. */
  const [porBorrar, setPorBorrar] = useState<Deck | null>(null);

  // Un indice por formato, y solo de los que hay en la lista (`indiceDe` los
  // guarda): cada baraja se valida con la Banlist del suyo.
  const indice = (f: Formato) => indiceDe(deFormato(f), f);
  const nube = useNube();
  const publicas = nube.fase === "con-sesion" ? nube.publicas : {};
  const conCuenta = nube.fase === "con-sesion";

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

  return (
    <>
      {/* `grid-cols-1` y no una grilla sin columnas: sin ella la unica columna
          del telefono toma el ancho minimo del contenido y la tarjeta se sale
          de la pantalla en vez de truncar el titulo y bajar los botones. */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {decks.map((deck) => (
          <TarjetaBaraja
            key={deck.id}
            deck={deck}
            index={indice(deck.formato)}
            publico={publicas[deck.id]}
            href={`/baraja/?m=${deck.id}`}
            acciones={
              <>
                {/* En una columna de texto bajo 20rem (el telefono, la tableta,
                    con la portada al lado) «Editar» queda solo con su icono:
                    con el texto, «Borrar» bajaba solo a una segunda fila. */}
                <Link
                  href={`/constructor/?m=${deck.id}`}
                  title="Editar"
                  className={cn(ACCION, "@max-xs:w-9 @max-xs:px-0")}
                >
                  <Hammer size={14} aria-hidden="true" />
                  <span className="@max-xs:sr-only">Editar</span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    descargarImagenDeBaraja(deck, resolveDeck(deck, indice(deck.formato)))
                  }
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
                  onClick={() => duplicar(deck)}
                  aria-label={`Duplicar ${deckTitle(deck)}`}
                  title="Duplicar"
                  className={ACCION_ICONO}
                >
                  <Copy size={14} aria-hidden="true" />
                </button>
                {/* Borrar pide confirmar en un modal: la baraja solo vive aqui y
                    no hay de donde recuperarla. */}
                <button
                  type="button"
                  onClick={() => setPorBorrar(deck)}
                  aria-label={`Borrar ${deckTitle(deck)}`}
                  title="Borrar"
                  className={cn(ACCION_ICONO, HOVER_PELIGRO)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </>
            }
          />
        ))}
      </ul>

      <ConfirmDialog
        open={porBorrar !== null}
        titulo="¿Borrar la baraja?"
        mensaje={
          porBorrar
            ? conCuenta
              ? `"${deckTitle(porBorrar)}" se borra de este navegador y de tu cuenta${publicas[porBorrar.id]?.publica ? ", y sale de la Comunidad" : ""}. No hay de dónde recuperarla.`
              : `"${deckTitle(porBorrar)}" se borra de este navegador y no hay de dónde recuperarla.`
            : ""
        }
        confirmar="Borrar la baraja"
        onConfirm={() => porBorrar && borrar(porBorrar)}
        onCancel={() => setPorBorrar(null)}
      />
    </>
  );
}
