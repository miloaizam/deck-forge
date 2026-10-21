"use client";

import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";

import { CardModal } from "../CardModal";
import { Filters } from "../Filters";
import { useHydrated } from "../decks/use-decks";
import { toast } from "../toast";
import { ColeccionAcciones } from "./ColeccionAcciones";
import { ColeccionLista, type VistaColeccion } from "./ColeccionLista";
import { useCodigoCompartido, useColeccion } from "./use-coleccion";
import { ConfirmDialog } from "../ConfirmDialog";
import {
  compartirArchivos,
  descargarArchivos,
  generarPlancha,
  puedeCompartir,
} from "../card-sheet-image";
import { ColeccionSkeleton } from "@/components/Skeleton";
import { agruparImpresiones, ordenarCartas } from "@/lib/card-order";
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
  coleccionComoTexto,
  conCopias,
  conFaltantes,
  conseguiUna,
  porTipo,
  saveColeccion,
  type Coleccion,
} from "@/lib/coleccion";
import { decodeColeccion } from "@/lib/coleccion-code";
import { editionTitle, origenTitle } from "@/lib/editions";
import type { Card } from "@/lib/types";
import {
  AVISO_EN_LINEA,
  ENLACE,
  SEGMENTO,
  SEGMENTOS,
  SEGMENTO_ACTIVO,
  SEGMENTO_INACTIVO,
  VACIO,
} from "@/lib/ui";
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
 *
 * Con un enlace compartido (`#c=`) muestra la coleccion de otra persona, de
 * solo lectura: sus dos listas, sin «Agregar cartas» y sin tocar la propia.
 */
export function ColeccionView({ cards }: { cards: Card[] }) {
  const propia = useColeccion();
  const codigo = useCodigoCompartido();
  const compartida = useMemo(() => decodeColeccion(codigo), [codigo]);
  const coleccion = compartida ?? propia;
  const hidratada = useHydrated();
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [vista, setVista] = useState<VistaColeccion>("tengo");
  const [selected, setSelected] = useState<Card | null>(null);
  const [generando, setGenerando] = useState(false);
  // Una lista larga sale en varias imagenes: se guardan hasta que el usuario
  // elige compartirlas o bajarlas, con un clic nuevo (compartir lo exige).
  const [partes, setPartes] = useState<{ archivos: File[]; cartas: number } | null>(null);
  // Aparte de `partes`, para que el dialogo no se quede sin texto mientras sale.
  const [verPartes, setVerPartes] = useState(false);

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
    // El fragmento se conserva: ahi viaja la coleccion compartida.
    history.replaceState(
      history.state,
      "",
      `${window.location.pathname}${s ? `?${s}` : ""}${window.location.hash}`,
    );
  }, [leidaUrl, filters, vista]);

  const filtradas = useMemo(
    () => ordenarCartas(applyFilters(cards, filters, index), filters.orden),
    [cards, filters, index],
  );
  const tengo = useMemo(
    () => filtradas.filter((c) => (coleccion.tengo[c.id] ?? 0) > 0),
    [filtradas, coleccion],
  );
  const faltan = useMemo(
    () => filtradas.filter((c) => (coleccion.quiero[c.id] ?? 0) > 0),
    [filtradas, coleccion],
  );
  // En una compartida no hay «Agregar cartas»: si el enlace la pedia, se ve
  // «Tengo».
  const vistaReal: VistaColeccion = compartida && vista === "agregar" ? "tengo" : vista;
  const lista =
    vistaReal === "tengo" ? tengo : vistaReal === "faltan" ? faltan : filtradas;
  const cuenta: Record<VistaColeccion, number | null> = {
    tengo: tengo.length,
    faltan: faltan.length,
    agregar: null,
  };
  const vistas = compartida ? VISTAS.filter((v) => v.valor !== "agregar") : VISTAS;

  // Un enlace roto no rompe la pagina: se avisa y se ve la coleccion propia.
  useEffect(() => {
    if (codigo && !compartida) {
      toast("El enlace de la colección no se pudo leer.", "warning");
    }
  }, [codigo, compartida]);

  const guardar = (siguiente: Coleccion) => {
    if (!saveColeccion(siguiente)) {
      toast(
        "No se pudo guardar la colección: el almacenamiento del navegador está lleno.",
        "warning",
      );
    }
  };
  const ponerCopias = (card: Card, n: number) => guardar(conCopias(propia, card.id, n));
  const acciones = {
    onCopias: ponerCopias,
    onFaltantes: (card: Card, n: number) => guardar(conFaltantes(propia, card.id, n)),
    onConsegui: (card: Card) => guardar(conseguiUna(propia, card.id)),
  };

  if (!hidratada) return <ColeccionSkeleton />;

  // La lista que se ve como texto, con sus filtros y su orden, como la imagen.
  const listaTexto = () => {
    const copias = vistaReal === "faltan" ? coleccion.quiero : coleccion.tengo;
    const nombre = vistaReal === "faltan" ? "Me faltan" : "Tengo";
    return {
      texto: coleccionComoTexto(nombre, lista, copias),
      archivo: vistaReal === "faltan" ? "coleccion-me-faltan" : "coleccion-tengo",
    };
  };

  // La imagen de la lista que se ve, con sus filtros y su orden.
  const imagen = async () => {
    const copias = vistaReal === "faltan" ? coleccion.quiero : coleccion.tengo;
    const nombre = vistaReal === "faltan" ? "Me faltan" : "Tengo";
    setGenerando(true);
    const generada = generarPlancha({
      etiqueta: "Colección · Escuelas Elementales",
      titulo: compartida ? `Colección compartida: ${nombre.toLowerCase()}` : nombre,
      tramos: porTipo(lista).map((g) => ({
        titulo: g.titulo,
        cuenta: g.cards.reduce((s, c) => s + (copias[c.id] ?? 0), 0),
        cartas: g.cards.map((c) => ({
          thumb: c.thumb,
          etiqueta: `×${copias[c.id] ?? 0}`,
          pie: [
            c.nombre,
            c.origen ? `Arte de ${origenTitle(c.origen)}` : editionTitle(c.edicion),
            c.frecuencia,
          ],
        })),
      })),
      archivo: vistaReal === "faltan" ? "coleccion-me-faltan" : "coleccion-tengo",
    });
    try {
      const archivos = await generada;
      if (archivos.length === 1) {
        await descargarArchivos(archivos);
        toast("Imagen de la colección descargada.", "info");
      } else {
        setPartes({ archivos, cartas: lista.length });
        setVerPartes(true);
      }
    } catch {
      toast("No se pudo generar la imagen de la colección.", "warning");
    } finally {
      setGenerando(false);
    }
  };

  const entregarPartes = async () => {
    if (!partes) return;
    const { archivos } = partes;
    setVerPartes(false);
    if (puedeCompartir(archivos)) {
      const r = await compartirArchivos(archivos);
      if (r === "descargadas") {
        toast(`${archivos.length} imágenes de la colección descargadas.`, "info");
      }
    } else {
      await descargarArchivos(archivos);
      toast(`${archivos.length} imágenes de la colección descargadas.`, "info");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {compartida && (
        <div role="status" className={cn(AVISO_EN_LINEA, "items-center")}>
          <Share2 size={16} aria-hidden="true" className="text-accent shrink-0" />
          <p className="text-ink min-w-0 flex-1">
            <strong className="font-semibold">Colección compartida.</strong>{" "}
            <span className="text-muted">
              Estás viendo lo que otra persona tiene y le falta. Tu colección no cambia.
            </span>
          </p>
          {/* Un boton y no un Link: navegar con el router no dispara
              `hashchange`, y la vista seguiria leyendo el enlace. Vaciar el
              fragmento si lo dispara; despues se limpia el "#" que queda. */}
          <button
            type="button"
            onClick={() => {
              window.location.hash = "";
              history.replaceState(
                history.state,
                "",
                `${window.location.pathname}${window.location.search}`,
              );
            }}
            className={ENLACE}
          >
            Ver mi colección
          </button>
        </div>
      )}
      <Filters
        filters={filters}
        facets={facets}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Qué cartas mostrar" className={SEGMENTOS}>
          {vistas.map(({ valor, titulo }) => (
            <button
              key={valor}
              type="button"
              onClick={() => setVista(valor)}
              aria-pressed={vistaReal === valor}
              className={cn(
                SEGMENTO,
                vistaReal === valor ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO,
              )}
            >
              {titulo}
              {cuenta[valor] !== null && (
                <span
                  className={cn(
                    "text-[12px] tabular-nums",
                    vistaReal === valor ? "text-white/90" : "text-muted",
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
          onImagen={
            vistaReal === "agregar" || lista.length === 0 ? null : () => void imagen()
          }
          onLista={vistaReal === "agregar" || lista.length === 0 ? null : listaTexto}
          generandoImagen={generando}
          soloLectura={compartida !== null}
        />
      </div>

      {lista.length > 0 ? (
        <ColeccionLista
          key={`${vistaReal}${filtersToSearch(filters, 1)}`}
          cards={lista}
          coleccion={coleccion}
          vista={vistaReal}
          onSelect={setSelected}
          acciones={compartida ? undefined : acciones}
        />
      ) : (
        <div className={VACIO}>
          <p className="text-ink">
            {hasActiveFilters(filters)
              ? "Ninguna carta de esta lista coincide con la búsqueda."
              : compartida
                ? "Esta lista está vacía."
                : vistaReal === "tengo"
                  ? "Todavía no marcaste ninguna carta que tengas."
                  : "No hay cartas en tu lista de las que te faltan."}
          </p>
          {compartida ? null : hasActiveFilters(filters) ? (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className={cn(ENLACE, "mt-3 text-[15px]")}
            >
              Limpiar los filtros
            </button>
          ) : (
            <p className="text-muted mt-2 text-[14px]">
              Búscalas en{" "}
              <button
                type="button"
                onClick={() => setVista("agregar")}
                className={ENLACE}
              >
                Agregar cartas
              </button>{" "}
              {vistaReal === "tengo"
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
          selected && !compartida
            ? () => ponerCopias(selected, (propia.tengo[selected.id] ?? 0) + 1)
            : undefined
        }
        onRemove={
          selected && !compartida
            ? () => ponerCopias(selected, (propia.tengo[selected.id] ?? 0) - 1)
            : undefined
        }
        copiasDe={(id) => coleccion.tengo[id] ?? 0}
      />

      <ConfirmDialog
        open={verPartes}
        titulo={`Imagen en ${partes?.archivos.length ?? 0} partes`}
        mensaje={`La lista tiene ${partes?.cartas ?? 0} cartas: para que se vean bien, va en ${partes?.archivos.length ?? 0} imágenes.`}
        confirmar={
          partes && puedeCompartir(partes.archivos)
            ? `Compartir las ${partes.archivos.length}`
            : `Descargar las ${partes?.archivos.length ?? 0}`
        }
        tono="normal"
        onConfirm={() => void entregarPartes()}
        onCancel={() => setVerPartes(false)}
      />
    </div>
  );
}
