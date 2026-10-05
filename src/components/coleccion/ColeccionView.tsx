"use client";

import { useEffect, useMemo, useState } from "react";

import { CardModal } from "../CardModal";
import { Filters } from "../Filters";
import { useHydrated } from "../decks/use-decks";
import { toast } from "../toast";
import { ColeccionAcciones } from "./ColeccionAcciones";
import { ColeccionLista, type VistaColeccion } from "./ColeccionLista";
import { useColeccion } from "./use-coleccion";
import { ColeccionSkeleton } from "@/components/Skeleton";
import { agruparImpresiones } from "@/lib/card-order";
import {
  applyFilters,
  buildFacets,
  buildSearchIndex,
  EMPTY_FILTERS,
  filtersFromSearch,
  filtersToSearch,
  hasActiveFilters,
  type CatalogFilters,
} from "@/lib/catalog";
import {
  alternarQuiero,
  coleccionComoTexto,
  conCopias,
  saveColeccion,
  type Coleccion,
} from "@/lib/coleccion";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

const VISTAS: { valor: VistaColeccion; titulo: string }[] = [
  { valor: "tengo", titulo: "Tengo" },
  { valor: "faltan", titulo: "Me faltan" },
  { valor: "agregar", titulo: "Agregar cartas" },
];

const esVista = (v: string | null): v is VistaColeccion =>
  VISTAS.some((x) => x.valor === v);

/**
 * La coleccion: las cartas que el usuario tiene y las que le faltan (las que
 * quiere conseguir). Las dos primeras pestanas son sus listas; la tercera es
 * el catalogo entero, para sumar cartas a cualquiera de las dos.
 *
 * Reutiliza el buscador y los filtros del catalogo, y los guarda en la URL
 * de la misma forma, junto con la pestana (`?ver=`).
 */
export function ColeccionView({ cards }: { cards: Card[] }) {
  const coleccion = useColeccion();
  const hidratada = useHydrated();
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [vista, setVista] = useState<VistaColeccion>("tengo");
  const [selected, setSelected] = useState<Card | null>(null);

  const index = useMemo(() => buildSearchIndex(cards), [cards]);
  const facets = useMemo(() => buildFacets(cards), [cards]);
  const impresiones = useMemo(() => agruparImpresiones(cards), [cards]);

  // La URL, como en el catalogo: se lee una vez al montar y se escribe con
  // replaceState despues de leerla, para no borrar la que llego.
  const [leidaUrl, setLeidaUrl] = useState(false);
  useEffect(() => {
    const { filters: f } = filtersFromSearch(window.location.search, facets);
    const ver = new URLSearchParams(window.location.search).get("ver");
    // Sincroniza con un sistema externo (la URL) una sola vez, al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(f);
    if (esVista(ver)) setVista(ver);
    setLeidaUrl(true);
  }, [facets]);
  useEffect(() => {
    if (!leidaUrl) return;
    const params = new URLSearchParams(filtersToSearch(filters, 1));
    if (vista !== "tengo") params.set("ver", vista);
    const s = params.toString();
    history.replaceState(
      history.state,
      "",
      `${window.location.pathname}${s ? `?${s}` : ""}`,
    );
  }, [leidaUrl, filters, vista]);

  const filtradas = useMemo(
    () => applyFilters(cards, filters, index),
    [cards, filters, index],
  );
  const tengo = useMemo(
    () => filtradas.filter((c) => (coleccion.tengo[c.id] ?? 0) > 0),
    [filtradas, coleccion],
  );
  const faltan = useMemo(() => {
    const ids = new Set(coleccion.quiero);
    return filtradas.filter((c) => ids.has(c.id));
  }, [filtradas, coleccion]);
  const lista = vista === "tengo" ? tengo : vista === "faltan" ? faltan : filtradas;
  const cuenta: Record<VistaColeccion, number | null> = {
    tengo: tengo.length,
    faltan: faltan.length,
    agregar: null,
  };

  const guardar = (siguiente: Coleccion) => {
    if (!saveColeccion(siguiente)) {
      toast(
        "No se pudo guardar la colección: el almacenamiento del navegador está lleno.",
        "warning",
      );
    }
  };
  const ponerCopias = (card: Card, n: number) =>
    guardar(conCopias(coleccion, card.id, n));
  const alternar = (card: Card) => guardar(alternarQuiero(coleccion, card.id));

  if (!hidratada) return <ColeccionSkeleton />;

  const textoDeLista = () =>
    coleccionComoTexto(
      vista === "tengo" ? "Tengo" : "Me faltan",
      lista,
      coleccion,
      vista === "tengo",
    );

  return (
    <div className="flex flex-col gap-6">
      <Filters
        filters={filters}
        facets={facets}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Qué cartas mostrar"
          className="border-line bg-panel rounded-chip inline-flex max-w-full overflow-x-auto border p-1"
        >
          {VISTAS.map(({ valor, titulo }) => (
            <button
              key={valor}
              type="button"
              onClick={() => setVista(valor)}
              aria-pressed={vista === valor}
              className={cn(
                "rounded-chip focus-visible:outline-brand-500 inline-flex h-9 shrink-0 items-center gap-2 px-3.5 text-[14px] whitespace-nowrap transition-colors sm:px-4",
                vista === valor
                  ? "bg-brand-600 font-medium text-white"
                  : "text-muted hover:text-ink",
              )}
            >
              {titulo}
              {cuenta[valor] !== null && (
                <span
                  className={cn(
                    "text-[12px] tabular-nums",
                    vista === valor ? "text-white/80" : "text-muted",
                  )}
                >
                  {cuenta[valor]}
                </span>
              )}
            </button>
          ))}
        </div>
        <ColeccionAcciones
          coleccion={coleccion}
          lista={vista === "agregar" ? null : textoDeLista}
          enLista={lista.length}
        />
      </div>

      {lista.length > 0 ? (
        <ColeccionLista
          key={`${vista}${filtersToSearch(filters, 1)}`}
          cards={lista}
          coleccion={coleccion}
          vista={vista}
          onSelect={setSelected}
          onCopias={ponerCopias}
          onQuiero={alternar}
        />
      ) : (
        <div className="border-line rounded-panel border border-dashed px-6 py-14 text-center">
          <p className="text-ink">
            {hasActiveFilters(filters)
              ? "Ninguna carta de esta lista coincide con la búsqueda."
              : vista === "tengo"
                ? "Todavía no marcaste ninguna carta que tengas."
                : "No hay cartas en tu lista de las que te faltan."}
          </p>
          {hasActiveFilters(filters) ? (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-accent focus-visible:outline-brand-500 mt-3 rounded text-[15px] underline underline-offset-4 transition-opacity hover:opacity-75"
            >
              Limpiar los filtros
            </button>
          ) : (
            <p className="text-muted mt-2 text-[14px]">
              Búscalas en{" "}
              <button
                type="button"
                onClick={() => setVista("agregar")}
                className="text-accent focus-visible:outline-brand-500 rounded underline underline-offset-4"
              >
                Agregar cartas
              </button>{" "}
              {vista === "tengo"
                ? "y márcalas con «Tengo»."
                : "y márcalas con el corazón."}
            </p>
          )}
        </div>
      )}

      <CardModal
        card={selected}
        onClose={() => setSelected(null)}
        impresiones={selected ? impresiones.get(selected.identidad) : undefined}
        onChangeCard={setSelected}
        destino="coleccion"
        copies={selected ? (coleccion.tengo[selected.id] ?? 0) : 0}
        onAdd={
          selected
            ? () => ponerCopias(selected, (coleccion.tengo[selected.id] ?? 0) + 1)
            : undefined
        }
        onRemove={
          selected
            ? () => ponerCopias(selected, (coleccion.tengo[selected.id] ?? 0) - 1)
            : undefined
        }
        copiasDe={(id) => coleccion.tengo[id] ?? 0}
      />
    </div>
  );
}
