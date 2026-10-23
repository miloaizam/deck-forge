"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowDownAZ, ArrowDownZA, ArrowUpDown, Funnel, Search, X } from "lucide-react";

import { Select } from "./Select";
import type { CatalogFilters, Facets } from "@/lib/catalog";
import { etiquetaDeTipo } from "@/lib/oros";
import { countActiveFilters } from "@/lib/catalog";
import { ETIQUETA_ORDEN, esOrden, siguienteOrden } from "@/lib/card-order";
import { editionTitle } from "@/lib/editions";
import {
  BOTON_ICONO_LIBRE_COMPACTO,
  BOTON_SECUNDARIO,
  CONTADOR,
  TEXT_FIELD,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

interface FiltersProps {
  filters: CatalogFilters;
  facets: Facets;
  onChange: (next: CatalogFilters) => void;
  onReset: () => void;
  /**
   * Botones de la vista que van a la derecha de «Filtros», en la misma fila:
   * la zona del constructor, las acciones de la coleccion.
   */
  acciones?: ReactNode;
}

/**
 * Busqueda siempre a la vista y el resto de los filtros detras de un boton.
 *
 * Nueve selectores desplegados de entrada empujaban la grilla fuera de la
 * pantalla, sobre todo en el telefono; plegados, la primera cosa que se ve al
 * entrar al catalogo son las cartas.
 */
export function Filters({ filters, facets, onChange, onReset, acciones }: FiltersProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buscador = useRef<HTMLInputElement>(null);

  // "/" lleva al buscador, como en la mayoria de los sitios con busqueda. No
  // se roba la tecla si ya se esta escribiendo en un campo.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      ) {
        return;
      }
      e.preventDefault();
      buscador.current?.focus();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const set = (key: keyof CatalogFilters) => (value: string) =>
    onChange({ ...filters, [key]: value });

  const activos = countActiveFilters(filters);

  return (
    <section aria-label="Buscar y filtrar" className="flex flex-col gap-4">
      {/* Una sola fila tambien en el telefono: ahi los botones quedan solo con
          su icono, y la primera carta sube los ~60 px que costaba la segunda
          fila. Las medidas miran el ancho de esta fila (`@container`) y no el
          de la pantalla: en el constructor la grilla comparte la pantalla con
          el panel, y a 1024 px el buscador quedaba en 245 px con el texto
          cortado. Hasta 42rem ocupa todo lo que dejan los botones. El
          contenedor es la fila y no la seccion: un contenedor crea un
          contexto de apilamiento, y los desplegables del panel quedarian
          debajo de la grilla. */}
      <div className="@container flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Con `acciones` la fila puede no caber: bajo 12rem de buscador, los
            botones pasan a una segunda linea, a la derecha. */}
        <div className="relative min-w-48 flex-1 @2xl:flex-none @2xl:basis-1/2">
          <Search
            size={17}
            aria-hidden="true"
            className="text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            ref={buscador}
            type="search"
            value={filters.query}
            onChange={(e) => set("query")(e.target.value)}
            placeholder="Nombre o habilidad…"
            aria-keyshortcuts="/"
            aria-label="Buscar cartas"
            className={cn(TEXT_FIELD, "pr-12 pl-10")}
          />
          {/* El orden va dentro del buscador: cada pulsacion pasa al siguiente
              (catalogo, A-Z, Z-A) y el icono dice cual esta puesto. Es un
              boton aparte del campo, superpuesto, como el de limpiar de Select. */}
          <button
            type="button"
            onClick={() => set("orden")(siguienteOrden(filters.orden))}
            aria-label={`Ordenar: ${ETIQUETA_ORDEN[esOrden(filters.orden) ? filters.orden : ""]}. Pulsa para cambiar.`}
            title={ETIQUETA_ORDEN[esOrden(filters.orden) ? filters.orden : ""]}
            className={cn(
              BOTON_ICONO_LIBRE_COMPACTO,
              "absolute top-1/2 right-1 -translate-y-1/2",
              filters.orden && "bg-accent-soft text-accent hover:text-accent",
            )}
          >
            {filters.orden === "nombre" ? (
              <ArrowDownAZ size={16} aria-hidden="true" />
            ) : filters.orden === "nombre-desc" ? (
              <ArrowDownZA size={16} aria-hidden="true" />
            ) : (
              <ArrowUpDown size={16} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 @md:gap-3">
          {(activos > 0 || filters.query !== "" || filters.orden !== "") && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Limpiar filtros"
              className={cn(BOTON_SECUNDARIO, "min-w-11 px-3 whitespace-nowrap @md:px-4")}
            >
              <X size={14} aria-hidden="true" />
              <span className="hidden @md:inline">Limpiar filtros</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className={cn(
              BOTON_SECUNDARIO,
              "min-w-11 px-3 whitespace-nowrap @md:px-4",
              // Abierto o con filtros puestos queda marcado, como un segmento activo.
              (open || activos > 0) && "border-brand-600 bg-accent-soft text-ink",
            )}
          >
            <Funnel size={14} aria-hidden="true" />
            <span className="sr-only @md:not-sr-only">Filtros</span>
            {activos > 0 && (
              <span aria-label={`${activos} filtros aplicados`} className={CONTADOR}>
                {activos}
              </span>
            )}
          </button>
          {acciones}
        </div>
      </div>

      {/* Montado siempre: se despliega hacia abajo y empuja la grilla con
          transicion, en vez de aparecer de golpe (`.pliegue` en globals.css).
          Cerrado queda inerte. El `-mt-4` / `pt-4` mueve el hueco del `gap` a
          dentro del pliegue, para que cerrado no deje 16 px de aire. */}
      <div id={panelId} inert={!open} className={cn("pliegue -mt-4", open && "abierto")}>
        <div>
          <div className="pt-4">
            <div className="border-line bg-surface rounded-panel border p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {/* Dos filas de cuatro en pantalla ancha, en el orden en que se
                suele filtrar. Los tres tipos de Oro van dentro de Tipo. La
                edicion solo aparece en /catalogo: en la
                pagina de una edicion la faceta viene vacia y el Select no se
                dibuja. Luz y Oscuridad no tienen selector propio: son
                keywords impresas y salen en Habilidad. */}
                <Select
                  label="Edición"
                  value={filters.edicion}
                  options={facets.ediciones}
                  onChange={set("edicion")}
                  format={editionTitle}
                />
                <Select
                  label="Frecuencia"
                  value={filters.frecuencia}
                  options={facets.frecuencias}
                  onChange={set("frecuencia")}
                />
                <Select
                  label="Escuela elemental"
                  value={filters.escuela}
                  options={facets.escuelas}
                  onChange={set("escuela")}
                />
                <Select
                  label="Tipo"
                  value={filters.tipo}
                  options={facets.tipos}
                  onChange={set("tipo")}
                  format={etiquetaDeTipo}
                />
                <Select
                  label="Raza"
                  value={filters.raza}
                  options={facets.razas}
                  onChange={set("raza")}
                />
                <Select
                  label="Habilidad"
                  value={filters.habilidad}
                  options={facets.habilidades}
                  onChange={set("habilidad")}
                  placeholder="Todas"
                />
                <Select
                  label="Fuerza"
                  value={filters.fuerza}
                  options={facets.fuerzas}
                  onChange={set("fuerza")}
                />
                <Select
                  label="Coste"
                  value={filters.coste}
                  options={facets.costes}
                  onChange={set("coste")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
