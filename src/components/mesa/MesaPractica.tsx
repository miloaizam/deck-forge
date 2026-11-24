"use client";

import { useCallback, useState } from "react";
import { ArrowLeftRight, RotateCcw } from "lucide-react";

import { TableroMesa } from "./TableroMesa";
import { deckTitle } from "@/lib/deck";
import { apply, type Accion } from "@/lib/mesa/apply";
import { newTable } from "@/lib/mesa/setup";
import type { Mesa } from "@/lib/mesa/table";
import type { Card, Deck } from "@/lib/types";
import { BOTON_SECUNDARIO } from "@/lib/ui";

/** El unico jugador de la practica. */
const YO = "yo";

interface MesaPracticaProps {
  deck: Deck;
  cartas: Map<string, Card>;
  onCambiarBaraja: () => void;
}

/**
 * La mesa de practica (GAME.md, sesion 2): el tablero con una sola baraja y
 * la mesa guardada aqui mismo. Cada gesto pasa por `apply`, sin red.
 */
export function MesaPractica({ deck, cartas, onCambiarBaraja }: MesaPracticaProps) {
  const [mesa, setMesa] = useState<Mesa>(() => newTable([{ id: YO, deck }]));
  const hacer = useCallback((accion: Accion) => setMesa((m) => apply(m, accion)), []);

  return (
    <TableroMesa
      mesa={mesa}
      yo={YO}
      hacer={hacer}
      cartas={cartas}
      formato={deck.formato}
      cabecera={
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-ink mr-auto truncate text-lg font-bold">
            Práctica: {deckTitle(deck)}
          </h1>
          <button
            type="button"
            onClick={() => setMesa(newTable([{ id: YO, deck }]))}
            className={BOTON_SECUNDARIO}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Empezar de nuevo
          </button>
          <button type="button" onClick={onCambiarBaraja} className={BOTON_SECUNDARIO}>
            <ArrowLeftRight size={14} aria-hidden="true" />
            Cambiar de baraja
          </button>
        </div>
      }
    />
  );
}
