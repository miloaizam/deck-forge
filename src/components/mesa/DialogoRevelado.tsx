"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CaraOdorso } from "./CaraOdorso";
import { VentanaMesa } from "./VentanaMesa";
import type { Card } from "@/lib/types";
import { BOTON_ICONO_COMPACTO, BOTON_PRIMARIO, BOTON_SECUNDARIO } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface CartaRevelada {
  uid: string;
  card: Card | undefined;
}

interface DialogoReveladoProps {
  modo: "mirar" | "mostrar" | "buscar";
  /** En una busqueda: si la elegida se muestra a los dos. */
  mostrar: boolean;
  /** «el Castillo», «el Cementerio»: donde se busca. */
  donde: string;
  cartas: CartaRevelada[];
  /** Mirar y mostrar: devolverlas arriba en este orden. */
  onOrdenar: (uids: string[]) => void;
  /** Mirar y mostrar: dejarlas como estaban. */
  onDejar: () => void;
  /** Buscar: tomar una, o ninguna (`null`). */
  onTomar: (uid: string | null) => void;
}

/**
 * Lo que se esta mirando, mostrando o recorriendo para buscar (DAR §10.34,
 * §10.35, §10.8). Al mirar y mostrar se reordenan con las flechas de cada
 * carta, sin arrastre, y vuelven arriba del Castillo. Al buscar se elige una
 * y se toma, o ninguna: las dos cosas barajan el Castillo.
 */
export function DialogoRevelado(props: DialogoReveladoProps) {
  const { modo, mostrar, donde, cartas, onOrdenar, onDejar, onTomar } = props;
  const [orden, setOrden] = useState(cartas.map((c) => c.uid));
  const [elegida, setElegida] = useState<string | null>(null);
  const porUid = new Map(cartas.map((c) => [c.uid, c]));

  const correr = (i: number, paso: -1 | 1) =>
    setOrden((o) => {
      const j = i + paso;
      if (j < 0 || j >= o.length) return o;
      const nuevo = [...o];
      [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
      return nuevo;
    });

  const buscando = modo === "buscar";
  const titulo = buscando
    ? `${mostrar ? "Buscar y mostrar" : "Buscar"} en ${donde}`
    : modo === "mirar"
      ? `Mirar las ${cartas.length} de arriba`
      : `Mostrar las ${cartas.length} de arriba`;

  return (
    <VentanaMesa titulo={titulo} onCerrar={buscando ? () => onTomar(null) : onDejar}>
      <p className="text-muted mt-1 text-[13px]">
        {buscando
          ? mostrar
            ? "La carta que tomes se muestra a los dos antes de ir a la mano."
            : "Nadie más ve lo que tomas: el rival solo sabe que buscaste."
          : modo === "mirar"
            ? "Solo tú las ves. La primera de la izquierda queda arriba del Castillo."
            : "Las ven los dos. La primera de la izquierda queda arriba del Castillo."}
        {buscando && donde === "el Castillo" && " Al terminar se baraja el Castillo."}
      </p>

      {cartas.length === 0 ? (
        <p className="text-muted mt-4 text-[14px]">No hay cartas.</p>
      ) : buscando ? (
        <ul className="mt-4 grid max-h-[55vh] grid-cols-6 gap-2 overflow-y-auto p-1">
          {cartas.map(({ uid, card }) => (
            <li key={uid}>
              <button
                type="button"
                aria-pressed={elegida === uid}
                onClick={() => setElegida(elegida === uid ? null : uid)}
                className={cn(
                  "border-line hover:outline-brand-500 focus-visible:outline-brand-500 block w-full overflow-hidden rounded-[6px] border hover:outline-2 hover:outline-offset-2",
                  elegida === uid && "outline-brand-500 outline-4 outline-offset-2",
                )}
              >
                <span className="sr-only">{card?.nombre ?? "Carta"}</span>
                <CaraOdorso card={card} bocaAbajo={false} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ol className="mt-4 flex flex-wrap gap-3">
          {orden.map((uid, i) => {
            const card = porUid.get(uid)?.card;
            return (
              <li key={uid} className="flex w-28 flex-col items-center gap-1.5">
                <div className="border-line w-full overflow-hidden rounded-[6px] border">
                  <CaraOdorso card={card} bocaAbajo={false} />
                </div>
                <span className="text-muted w-full truncate text-center text-[12px]">
                  {i + 1}. {card?.nombre ?? "Carta"}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => correr(i, -1)}
                    disabled={i === 0}
                    aria-label={`Subir ${card?.nombre ?? "carta"}`}
                    className={BOTON_ICONO_COMPACTO}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => correr(i, 1)}
                    disabled={i === orden.length - 1}
                    aria-label={`Bajar ${card?.nombre ?? "carta"}`}
                    className={BOTON_ICONO_COMPACTO}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {buscando ? (
          <>
            <button
              type="button"
              onClick={() => onTomar(null)}
              className={BOTON_SECUNDARIO}
            >
              No tomar ninguna
            </button>
            <button
              type="button"
              onClick={() => onTomar(elegida)}
              disabled={elegida === null}
              className={BOTON_PRIMARIO}
            >
              {mostrar ? "Mostrar y tomar" : "Tomar"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onDejar} className={BOTON_SECUNDARIO}>
              Dejar como estaban
            </button>
            <button
              type="button"
              onClick={() => onOrdenar(orden)}
              className={BOTON_PRIMARIO}
            >
              Devolver arriba en este orden
            </button>
          </>
        )}
      </div>
    </VentanaMesa>
  );
}
