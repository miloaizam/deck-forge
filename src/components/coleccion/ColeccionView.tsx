"use client";

import { useEffect, useMemo, useState } from "react";

import { CardModal } from "../CardModal";
import { Filters } from "../Filters";
import { useHydrated } from "../decks/use-decks";
import { toast } from "../toast";
import { ColeccionAcciones } from "./ColeccionAcciones";
import { ColeccionLista } from "./ColeccionLista";
import { ColeccionResumen } from "./ColeccionResumen";
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
import { coleccionComoTexto, conCopias, resumir, saveColeccion } from "@/lib/coleccion";
import { editionTitle } from "@/lib/editions";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

type Vista = "obtenidas" | "faltantes";

const VISTAS: { valor: Vista; titulo: string }[] = [
  { valor: "obtenidas", titulo: "Obtenidas" },
  { valor: "faltantes", titulo: "Faltantes" },
];

/**
 * La coleccion: que impresiones tiene el usuario y cuales le faltan.
 *
 * Reutiliza el buscador y los filtros del catalogo, que valen igual aqui, y
 * los guarda en la URL de la misma forma, junto con la pestana (`?ver=`).
 */
export function ColeccionView({ cards }: { cards: Card[] }) {
  const coleccion = useColeccion();
  const hidratada = useHydrated();
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [vista, setVista] = useState<Vista>("obtenidas");
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
    setVista(ver === "faltantes" ? "faltantes" : "obtenidas");
    setLeidaUrl(true);
  }, [facets]);
  useEffect(() => {
    if (!leidaUrl) return;
    const params = new URLSearchParams(filtersToSearch(filters, 1));
    if (vista === "faltantes") params.set("ver", "faltantes");
    const s = params.toString();
    history.replaceState(
      history.state,
      "",
      `${window.location.pathname}${s ? `?${s}` : ""}`,
    );
  }, [leidaUrl, filters, vista]);

  const resumen = useMemo(() => resumir(cards, coleccion), [cards, coleccion]);
  const filtradas = useMemo(
    () => applyFilters(cards, filters, index),
    [cards, filters, index],
  );
  const obtenidas = useMemo(
    () => filtradas.filter((c) => (coleccion[c.id] ?? 0) > 0),
    [filtradas, coleccion],
  );
  const faltantes = useMemo(
    () => filtradas.filter((c) => !((coleccion[c.id] ?? 0) > 0)),
    [filtradas, coleccion],
  );
  const lista = vista === "obtenidas" ? obtenidas : faltantes;

  const ponerCopias = (card: Card, n: number) => {
    if (!saveColeccion(conCopias(coleccion, card.id, n))) {
      toast(
        "No se pudo guardar la colección: el almacenamiento del navegador está lleno.",
        "warning",
      );
    }
  };

  const textoDeLista = () => {
    const ed = filters.edicion ? ` de ${editionTitle(filters.edicion)}` : "";
    return coleccionComoTexto(
      vista === "obtenidas" ? `Tengo${ed}` : `Me faltan${ed}`,
      lista,
      coleccion,
      vista === "obtenidas",
    );
  };

  if (!hidratada) return <ColeccionSkeleton />;

  const sinNada = Object.keys(coleccion).length === 0;

  return (
    <div className="flex flex-col gap-6">
      <ColeccionResumen
        resumen={resumen}
        edicion={filters.edicion}
        onEdicion={(slug) =>
          setFilters({ ...filters, edicion: filters.edicion === slug ? "" : slug })
        }
      />

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
          className="border-line bg-panel rounded-chip inline-flex border p-1"
        >
          {VISTAS.map(({ valor, titulo }) => {
            const n = valor === "obtenidas" ? obtenidas.length : faltantes.length;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => setVista(valor)}
                aria-pressed={vista === valor}
                className={cn(
                  "rounded-chip focus-visible:outline-brand-500 inline-flex h-9 items-center gap-2 px-4 text-[14px] transition-colors",
                  vista === valor
                    ? "bg-brand-600 font-medium text-white"
                    : "text-muted hover:text-ink",
                )}
              >
                {titulo}
                <span
                  className={cn(
                    "text-[12px] tabular-nums",
                    vista === valor ? "text-white/80" : "text-muted",
                  )}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <ColeccionAcciones
          coleccion={coleccion}
          lista={textoDeLista}
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
        />
      ) : (
        <div className="border-line rounded-panel border border-dashed px-6 py-14 text-center">
          <p className="text-ink">
            {vista === "obtenidas"
              ? sinNada
                ? "Todavía no marcaste ninguna carta."
                : "No tienes ninguna carta que coincida con esta búsqueda."
              : filtradas.length === 0
                ? "Ninguna carta coincide con esta búsqueda."
                : "No te falta ninguna: las tienes todas."}
          </p>
          {vista === "obtenidas" && sinNada ? (
            <p className="text-muted mt-2 text-[14px]">
              En{" "}
              <button
                type="button"
                onClick={() => setVista("faltantes")}
                className="text-accent focus-visible:outline-brand-500 rounded underline underline-offset-4"
              >
                Faltantes
              </button>{" "}
              está todo el catálogo: marca con «Tengo» las cartas que tienes.
            </p>
          ) : (
            hasActiveFilters(filters) && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-accent focus-visible:outline-brand-500 mt-3 rounded text-[15px] underline underline-offset-4 transition-opacity hover:opacity-75"
              >
                Limpiar los filtros
              </button>
            )
          )}
        </div>
      )}

      <CardModal
        card={selected}
        onClose={() => setSelected(null)}
        impresiones={selected ? impresiones.get(selected.identidad) : undefined}
        onChangeCard={setSelected}
        destino="coleccion"
        copies={selected ? (coleccion[selected.id] ?? 0) : 0}
        onAdd={
          selected
            ? () => ponerCopias(selected, (coleccion[selected.id] ?? 0) + 1)
            : undefined
        }
        onRemove={
          selected
            ? () => ponerCopias(selected, (coleccion[selected.id] ?? 0) - 1)
            : undefined
        }
        copiasDe={(id) => coleccion[id] ?? 0}
      />
    </div>
  );
}
