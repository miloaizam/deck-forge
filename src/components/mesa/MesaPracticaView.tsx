"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Monitor, Swords } from "lucide-react";

import { ConCatalogo } from "../ConCatalogo";
import { useDecks, useHydrated } from "../decks/use-decks";
import { RequiereCuenta } from "../nube/RequiereCuenta";
import { DeckListSkeleton } from "../Skeleton";
import { MesaPractica } from "./MesaPractica";
import { useEscritorio } from "./use-escritorio";
import { deckTitle, totalCards } from "@/lib/deck";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import type { Card, Deck } from "@/lib/types";
import { BOTON_SECUNDARIO, ENLACE, VACIO } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * La mesa de practica: elegir una baraja guardada y jugarla en solitario.
 * Pide cuenta, como todo lo que lee las barajas del usuario.
 */
export function MesaPracticaView() {
  return (
    <RequiereCuenta para="practicar con tus barajas" esqueleto={<DeckListSkeleton />}>
      <ConCatalogo esqueleto={<DeckListSkeleton />}>
        {(cards) => <Practica cards={cards} />}
      </ConCatalogo>
    </RequiereCuenta>
  );
}

function Practica({ cards }: { cards: Card[] }) {
  const escritorio = useEscritorio();
  const decks = useDecks();
  const cargado = useHydrated();
  const [elegida, setElegida] = useState<Deck | null>(null);
  const porId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  if (escritorio === null || !cargado) return <DeckListSkeleton />;

  if (!escritorio) {
    return (
      <div className={VACIO}>
        <Monitor size={28} aria-hidden="true" className="text-accent mx-auto" />
        <h1 className="text-ink mt-3 text-lg font-bold">La mesa es para escritorio</h1>
        <p className="text-muted mt-2 text-[14px]">
          Ábrela en una pantalla de al menos 1024 píxeles de ancho.
        </p>
      </div>
    );
  }

  if (elegida) {
    return (
      <MesaPractica
        deck={elegida}
        cartas={porId}
        onCambiarBaraja={() => setElegida(null)}
      />
    );
  }

  const conCartas = decks.filter((d) => totalCards(d.principal) > 0);

  return (
    <section aria-labelledby="mesa-titulo" className="mx-auto max-w-2xl">
      <h1
        id="mesa-titulo"
        className="text-ink flex items-center gap-2 text-2xl font-bold"
      >
        <Swords size={22} aria-hidden="true" className="text-accent" />
        Mesa de práctica
      </h1>
      <p className="text-muted mt-2 text-[15px]">
        Elige una de tus barajas para probarla en la mesa. Nada se juega solo: mueves las
        cartas tú, como en la vida real.
      </p>

      {conCartas.length === 0 ? (
        <div className={cn(VACIO, "mt-6")}>
          <p className="text-ink">No tienes barajas con cartas.</p>
          <Link href="/constructor/" className={cn(ENLACE, "mt-2 inline-block")}>
            Armar una baraja
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {conCartas.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setElegida(d)}
                className={cn(BOTON_SECUNDARIO, "h-auto w-full justify-between py-3")}
              >
                <span className="text-ink truncate font-medium">{deckTitle(d)}</span>
                <span className="text-muted shrink-0 text-[13px] tabular-nums">
                  {NOMBRE_FORMATO[d.formato]} · {totalCards(d.principal)} cartas
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
