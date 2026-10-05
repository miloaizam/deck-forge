import { useState } from "react";
import { Check, Heart, Minus, Plus, X } from "lucide-react";

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
  onCopias: (card: Card, n: number) => void;
  /** Suma o quita la carta de las que faltan. */
  onQuiero: (card: Card) => void;
}

/** Las tres pestanas: lo que tiene, lo que le falta y el catalogo para sumar. */
export type VistaColeccion = "tengo" | "faltan" | "agregar";

/** Filas por tipo antes de pedir mas. */
const TANDA = 150;

const MAS =
  "inline-flex h-10 items-center rounded-chip border border-line px-4 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

const PASO =
  "inline-flex size-9 items-center justify-center rounded-chip text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-brand-500 disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * La coleccion como lista: por tipo, en el orden del catalogo, una fila por
 * impresion. Es una lista y no la grilla del catalogo porque aqui se recorren
 * muchas cartas marcando: importa leer nombre y codigo, no ver el arte en
 * grande (para eso la fila abre la carta).
 *
 * En «Agregar cartas» son hasta 2652 filas: cada tipo pinta las primeras `TANDA` y el resto se
 * pide con un boton al pie del grupo (pintarlas todas de una tardaba casi un
 * segundo al cambiar de pestana). Cada fila lleva ademas
 * `content-visibility: auto` (`.fila-coleccion`), asi el navegador solo pinta
 * las que estan a la vista, y la miniatura carga diferida. Quien la usa le
 * pone una `key` por pestana y filtros, para que las tandas vuelvan a cero.
 */
export function ColeccionLista({
  cards,
  coleccion,
  vista,
  onSelect,
  onCopias,
  onQuiero,
}: ColeccionListaProps) {
  const [mostradas, setMostradas] = useState<Record<string, number>>({});
  const faltan = new Set(coleccion.quiero);
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
            {g.cards.slice(0, mostradas[g.tipo] ?? TANDA).map((c) => {
              const n = coleccion.tengo[c.id] ?? 0;
              return (
                <li
                  key={c.id}
                  className="fila-coleccion bg-panel border-line rounded-card hover:border-brand-500 flex items-center gap-2 border p-1.5 pr-2 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    aria-label={`Ver detalle de ${c.nombre} (${c.codigo})`}
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
                    <span className="min-w-0">
                      <span className="text-ink block truncate text-[14px] font-medium">
                        {c.nombre}
                      </span>
                      <span className="text-muted block truncate text-[12px]">
                        {c.codigo} ·{" "}
                        {c.origen
                          ? `Arte de ${origenTitle(c.origen)}`
                          : editionTitle(c.edicion)}{" "}
                        · {c.frecuencia}
                      </span>
                    </span>
                  </button>

                  <Controles
                    card={c}
                    copias={n}
                    falta={vista !== "tengo" && faltan.has(c.id)}
                    vista={vista}
                    onCopias={onCopias}
                    onQuiero={onQuiero}
                  />
                </li>
              );
            })}
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

const BOTON =
  "inline-flex h-9 shrink-0 items-center gap-1 rounded-chip border border-line px-3 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

/**
 * Lo que se puede hacer con una fila. Con copias, el contador − n +; sin
 * copias, «Tengo» y, segun la pestana, marcarla como faltante o quitarla.
 */
function Controles({
  card: c,
  copias: n,
  falta,
  vista,
  onCopias,
  onQuiero,
}: {
  card: Card;
  copias: number;
  falta: boolean;
  vista: VistaColeccion;
  onCopias: (card: Card, n: number) => void;
  onQuiero: (card: Card) => void;
}) {
  if (n > 0) {
    return (
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => onCopias(c, n - 1)}
          aria-label={`Quitar una copia de ${c.nombre}`}
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
          onClick={() => onCopias(c, n + 1)}
          disabled={n >= MAX_COPIAS_COLECCION}
          aria-label={`Sumar una copia de ${c.nombre}`}
          className={PASO}
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
    );
  }
  if (vista === "faltan") {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onCopias(c, 1)}
          aria-label={`Ya tengo ${c.nombre} (${c.codigo})`}
          className={BOTON}
        >
          <Check size={14} aria-hidden="true" />
          Ya la tengo
        </button>
        <button
          type="button"
          onClick={() => onQuiero(c)}
          aria-label={`Quitar ${c.nombre} (${c.codigo}) de las que faltan`}
          title="Quitar de las que faltan"
          className={PASO}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onCopias(c, 1)}
        aria-label={`Tengo ${c.nombre} (${c.codigo})`}
        className={BOTON}
      >
        <Plus size={14} aria-hidden="true" />
        Tengo
      </button>
      <button
        type="button"
        onClick={() => onQuiero(c)}
        aria-pressed={falta}
        aria-label={`${c.nombre} (${c.codigo}) me falta`}
        title={falta ? "Quitar de las que faltan" : "Me falta"}
        className={cn(PASO, falta && "text-danger hover:text-danger")}
      >
        <Heart size={15} aria-hidden="true" fill={falta ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
