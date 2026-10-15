import { useState } from "react";
import { Check, Heart, Minus, Plus } from "lucide-react";

import { marcarCargada } from "../CardTile";
import { MAX_COPIAS_COLECCION, porTipo, type Coleccion } from "@/lib/coleccion";
import { editionTitle, origenTitle } from "@/lib/editions";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ColeccionListaProps {
  cards: Card[];
  coleccion: Coleccion;
  vista: VistaColeccion;
  onSelect: (card: Card) => void;
  /** Sin esto la lista es de solo lectura: una coleccion compartida. */
  acciones?: {
    /** Copias que tiene. */
    onCopias: (card: Card, n: number) => void;
    /** Copias que le faltan (0 la saca de la lista). */
    onFaltantes: (card: Card, n: number) => void;
    /** «Ya la tengo»: pasa de las que faltan a las que tiene. */
    onYaLaTengo: (card: Card) => void;
  };
}

/** Las tres pestanas: lo que tiene, lo que le falta y el catalogo para sumar. */
export type VistaColeccion = "tengo" | "faltan" | "agregar";

/** Filas por tipo antes de pedir mas. */
const TANDA = 150;

const MAS =
  "inline-flex h-10 items-center rounded-chip border border-line px-4 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

const PASO =
  "inline-flex size-9 items-center justify-center rounded-chip text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-brand-500 disabled:opacity-40 disabled:hover:bg-transparent";

const BOTON =
  "inline-flex h-9 shrink-0 items-center gap-1 rounded-chip border border-line px-3 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

/**
 * La coleccion como lista: por tipo, en el orden del catalogo (o el que se
 * elija en el buscador), una fila por impresion. Es una lista y no la grilla
 * del catalogo porque aqui se recorren muchas cartas marcando: importa leer el
 * nombre, no ver el arte en grande (para eso la fila abre la carta).
 *
 * En «Agregar cartas» son hasta 2652 filas: cada tipo pinta las primeras
 * `TANDA` y el resto se pide con un boton al pie del grupo (pintarlas todas de
 * una tardaba casi un segundo al cambiar de pestana). Cada fila lleva ademas
 * `content-visibility: auto` (`.fila-coleccion`), asi el navegador solo pinta
 * las que estan a la vista, y la miniatura carga diferida. Quien la usa le
 * pone una `key` por pestana y filtros, para que las tandas vuelvan a cero.
 */
export function ColeccionLista({
  cards,
  coleccion,
  vista,
  onSelect,
  acciones,
}: ColeccionListaProps) {
  const [mostradas, setMostradas] = useState<Record<string, number>>({});
  return (
    <div className="flex flex-col gap-8">
      {porTipo(cards).map((g) => (
        <section key={g.tipo} aria-labelledby={`coleccion-${g.tipo}`}>
          <h3
            id={`coleccion-${g.tipo}`}
            className="border-line mb-3 flex items-baseline gap-2 border-b pb-2 text-lg font-bold"
          >
            {g.titulo}
            <span className="text-muted text-[13px] font-normal tabular-nums">
              {g.cards.length}
            </span>
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {g.cards.slice(0, mostradas[g.tipo] ?? TANDA).map((c) => (
              <li
                key={c.id}
                className="fila-coleccion bg-panel border-line rounded-card hover:border-brand-500 flex items-center gap-2 border p-1.5 pr-2 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  aria-label={`Ver detalle de ${c.nombre}`}
                  className="focus-visible:outline-brand-500 flex min-w-0 flex-1 items-center gap-3 rounded text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumb}
                    alt=""
                    width={36}
                    height={51}
                    loading="lazy"
                    decoding="async"
                    onLoad={marcarCargada}
                    ref={(el) => {
                      if (el?.complete && el.naturalWidth) el.dataset.cargada = "";
                    }}
                    className={cn(
                      "imagen-carga w-9 shrink-0 rounded-[3px]",
                      vista === "faltan" && "opacity-60 grayscale",
                    )}
                  />
                  {/* Edicion y frecuencia, sin el codigo: el jugador busca la
                      carta por su nombre y su edicion, no por su numero. */}
                  <span className="min-w-0">
                    <span className="text-ink block truncate text-[14px] font-medium">
                      {c.nombre}
                    </span>
                    <span className="text-muted block truncate text-[12px]">
                      {c.origen
                        ? `Arte de ${origenTitle(c.origen)}`
                        : editionTitle(c.edicion)}{" "}
                      · {c.frecuencia}
                    </span>
                  </span>
                </button>

                {acciones ? (
                  <Controles card={c} coleccion={coleccion} vista={vista} {...acciones} />
                ) : (
                  <span className="text-ink rounded-chip bg-surface shrink-0 px-2.5 py-1 text-[13px] font-semibold tabular-nums">
                    ×
                    {(vista === "faltan" ? coleccion.quiero : coleccion.tengo)[c.id] ?? 0}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {g.cards.length > (mostradas[g.tipo] ?? TANDA) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMostradas({
                    ...mostradas,
                    [g.tipo]: (mostradas[g.tipo] ?? TANDA) + TANDA,
                  })
                }
                className={MAS}
              >
                Ver {Math.min(TANDA, g.cards.length - (mostradas[g.tipo] ?? TANDA))} más
              </button>
              <button
                type="button"
                onClick={() => setMostradas({ ...mostradas, [g.tipo]: g.cards.length })}
                className={MAS}
              >
                Ver {g.titulo.toLowerCase()}: las {g.cards.length}
              </button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

/** − n +, con su tope. */
function Contador({
  card,
  n,
  max,
  que,
  onCambiar,
}: {
  card: Card;
  n: number;
  max: number;
  /** "copia" o "copia que falta", para los nombres accesibles. */
  que: string;
  onCambiar: (n: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => onCambiar(n - 1)}
        aria-label={`Quitar una ${que} de ${card.nombre}`}
        className={PASO}
      >
        <Minus size={15} aria-hidden="true" />
      </button>
      <span
        className="text-ink w-6 text-center text-[14px] font-semibold tabular-nums"
        aria-label={`${n} ${n === 1 ? "copia" : "copias"}`}
      >
        {n}
      </span>
      <button
        type="button"
        onClick={() => onCambiar(n + 1)}
        disabled={n >= max}
        aria-label={`Sumar una ${que} de ${card.nombre}`}
        className={PASO}
      >
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Lo que se puede hacer con una fila:
 * - en «Tengo», cambiar las copias;
 * - en «Me faltan», cambiar las copias que faltan o pasarla a
 *   «Tengo» con «Ya la tengo»;
 * - en «Agregar cartas», «Tengo» y el corazon de las que faltan, o el
 *   contador si ya se tiene.
 */
function Controles({
  card: c,
  coleccion,
  vista,
  onCopias,
  onFaltantes,
  onYaLaTengo,
}: {
  card: Card;
  coleccion: Coleccion;
  vista: VistaColeccion;
  onCopias: (card: Card, n: number) => void;
  onFaltantes: (card: Card, n: number) => void;
  onYaLaTengo: (card: Card) => void;
}) {
  const tengo = coleccion.tengo[c.id] ?? 0;
  const faltan = coleccion.quiero[c.id] ?? 0;

  if (vista === "faltan") {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Contador
          card={c}
          n={faltan}
          max={MAX_COPIAS_COLECCION}
          que="copia que falta"
          onCambiar={(n) => onFaltantes(c, n)}
        />
        <button
          type="button"
          onClick={() => onYaLaTengo(c)}
          aria-label={`Ya tengo ${c.nombre}`}
          title="Ya la tengo"
          className={BOTON}
        >
          <Check size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Ya la tengo</span>
        </button>
      </div>
    );
  }
  if (tengo > 0) {
    return (
      <Contador
        card={c}
        n={tengo}
        max={MAX_COPIAS_COLECCION}
        que="copia"
        onCambiar={(n) => onCopias(c, n)}
      />
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onCopias(c, 1)}
        aria-label={`Tengo ${c.nombre}`}
        className={BOTON}
      >
        <Plus size={14} aria-hidden="true" />
        Tengo
      </button>
      <button
        type="button"
        onClick={() => onFaltantes(c, faltan > 0 ? 0 : 1)}
        aria-pressed={faltan > 0}
        aria-label={`${c.nombre} me falta`}
        title={faltan > 0 ? "Quitar de las que faltan" : "Me falta"}
        className={cn(PASO, faltan > 0 && "text-danger hover:text-danger")}
      >
        <Heart size={15} aria-hidden="true" fill={faltan > 0 ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
