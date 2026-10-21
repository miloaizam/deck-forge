"use client";

import { useEffect, useMemo, useState } from "react";

import { CardGrid } from "./CardGrid";
import { CardModal } from "./CardModal";
import { Filters } from "./Filters";
import { Pagination } from "./Pagination";
import { CardGridSkeleton } from "./Skeleton";
import { reintentarCatalogo, useCatalogo } from "./use-catalogo";
import {
  applyFilters,
  buildSearchIndex,
  EMPTY_FILTERS,
  filtersFromSearch,
  filtersToSearch,
  hasActiveFilters,
  pageCount,
  pageRange,
  paginate,
  type CatalogFilters,
  type Facets,
} from "@/lib/catalog";
import { agruparImpresiones, ordenarCartas } from "@/lib/card-order";
import type { Card } from "@/lib/types";
import { ENLACE, VACIO } from "@/lib/ui";
import { irArriba } from "@/lib/scroll";
import { cn } from "@/lib/utils";

interface CatalogViewProps {
  /**
   * La primera pagina sin filtros, que sale en el HTML estatico: es lo que se
   * ve mientras baja el catalogo entero (`useCatalogo`).
   */
  inicial: Card[];
  /** Cuantas cartas hay en total en esta vista. */
  total: number;
  /** Las facetas de esta vista, calculadas en el build. */
  facets: Facets;
  /** Solo las cartas de esta edicion. Sin ella, el catalogo entero. */
  edicion?: string;
}

/**
 * Isla interactiva del catalogo. La busqueda y los filtros corren en memoria:
 * no hay servidor al que preguntarle.
 *
 * El catalogo no viaja en el HTML: la pagina trae solo su primera pagina
 * (`inicial`) y el resto llega de `/data/cards.json`. Hasta entonces se ve
 * esa primera pagina si no hay filtros, y el esqueleto de la grilla si los
 * hay (la URL puede traerlos).
 */
export function CatalogView({ inicial, total, facets, edicion }: CatalogViewProps) {
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);

  const catalogo = useCatalogo();
  const cards = useMemo(
    () =>
      catalogo.cards && edicion
        ? catalogo.cards.filter((c) => c.edicion === edicion)
        : catalogo.cards,
    [catalogo.cards, edicion],
  );

  // El indice es caro de construir y el catalogo no cambia en runtime.
  const index = useMemo(() => (cards ? buildSearchIndex(cards) : null), [cards]);
  // Del catalogo entero: en la pagina de una edicion, el selector de
  // impresiones del modal ofrece tambien las de otras ediciones.
  const impresiones = useMemo(
    () => agruparImpresiones(catalogo.cards ?? inicial),
    [catalogo.cards, inicial],
  );

  // Los filtros viven tambien en la URL: se leen una vez al montar (el HTML
  // estatico no conoce la query) y se escriben con replaceState, que no suma
  // entradas al historial por cada letra tecleada. Hasta leerla no se escribe:
  // el primer render trae los filtros vacios y borraria la URL que llego.
  const [leidaUrl, setLeidaUrl] = useState(false);
  useEffect(() => {
    const { filters: f, page: p } = filtersFromSearch(window.location.search, facets);
    // Sincroniza con un sistema externo (la URL) una sola vez, al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(f);
    setPage(p);
    setLeidaUrl(true);
  }, [facets]);
  useEffect(() => {
    if (!leidaUrl) return;
    const url = `${window.location.pathname}${filtersToSearch(filters, page)}`;
    history.replaceState(history.state, "", url);
  }, [leidaUrl, filters, page]);

  // Con un orden elegido, manda sobre el de relevancia de la busqueda. Sin el
  // catalogo, la primera pagina sin filtros es `inicial`: lo mismo que
  // saldria de filtrar y ordenar, ya calculado en el build.
  const sinFiltros = !hasActiveFilters(filters);
  const results = useMemo(
    () =>
      cards && index
        ? ordenarCartas(applyFilters(cards, filters, index), filters.orden)
        : null,
    [cards, filters, index],
  );

  const update = (next: CatalogFilters) => {
    setFilters(next);
    setPage(1);
  };

  const goTo = (next: number) => {
    setPage(next);
    irArriba();
  };

  const cuantos = results ? results.length : total;
  const totalPages = pageCount(cuantos);
  // Si los filtros achican el resultado, la pagina actual puede quedar fuera
  // de rango; la acotamos al vuelo en vez de guardar estado derivado.
  const currentPage = Math.min(page, totalPages);
  // `null`: todavia no se sabe que va en esta pagina.
  const visible = results
    ? paginate(results, currentPage)
    : sinFiltros && currentPage === 1
      ? inicial
      : null;

  return (
    <div className="flex flex-col gap-5">
      <Filters
        filters={filters}
        facets={facets}
        onChange={update}
        onReset={() => update(EMPTY_FILTERS)}
      />

      {total === 0 ? (
        <p className={cn(VACIO, "text-muted")}>Esta edición todavía no está cargada.</p>
      ) : catalogo.error && !visible ? (
        <div className={VACIO}>
          <p className="text-ink">No se pudo cargar el catálogo.</p>
          <button
            type="button"
            onClick={reintentarCatalogo}
            className={cn(ENLACE, "mt-3 text-[15px]")}
          >
            Reintentar
          </button>
        </div>
      ) : !visible ? (
        <CardGridSkeleton />
      ) : cuantos === 0 ? (
        <div className={VACIO}>
          <p className="text-ink">Ninguna carta coincide con esa búsqueda.</p>
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => update(EMPTY_FILTERS)}
              className={cn(ENLACE, "mt-3 text-[15px]")}
            >
              Limpiar los filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <CardGrid cards={visible} onSelect={setSelected} />
          <Pagination
            page={currentPage}
            total={totalPages}
            range={pageRange(currentPage, cuantos)}
            results={cuantos}
            onChange={goTo}
          />
        </>
      )}
      <CardModal
        card={selected}
        onClose={() => setSelected(null)}
        impresiones={selected ? impresiones.get(selected.identidad) : undefined}
        onChangeCard={setSelected}
      />
    </div>
  );
}
