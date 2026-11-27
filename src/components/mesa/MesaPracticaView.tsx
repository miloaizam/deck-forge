"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Monitor } from "lucide-react";

import { ConCatalogo } from "../ConCatalogo";
import { TarjetaBaraja } from "../decks/TarjetaBaraja";
import { useDecks, useHydrated } from "../decks/use-decks";
import { RequiereCuenta } from "../nube/RequiereCuenta";
import { DeckListSkeleton } from "../Skeleton";
import { MesaPractica } from "./MesaPractica";
import { useEscritorio } from "./use-escritorio";
import { totalCards } from "@/lib/deck";
import { indiceDe } from "@/lib/deck-rules";
import type { Card, Deck, Formato } from "@/lib/types";
import { ENLACE, VACIO } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * La mesa de practica: elegir una baraja guardada y jugarla en solitario.
 * Pide cuenta, como todo lo que lee las barajas del usuario.
 */
export function MesaPracticaView() {
  return (
    <RequiereCuenta para="practicar con tus barajas" esqueleto={<DeckListSkeleton />}>
      <ConCatalogo esqueleto={<DeckListSkeleton />}>
        {(cards, deFormato) => <Practica cards={cards} deFormato={deFormato} />}
      </ConCatalogo>
    </RequiereCuenta>
  );
}

interface PracticaProps {
  cards: Card[];
  /** Las cartas con las erratas de un formato: cada baraja, con las del suyo. */
  deFormato: (f: Formato) => Card[];
}

function Practica({ cards, deFormato }: PracticaProps) {
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
    <section aria-labelledby="mesa-titulo">
      {/* La cabecera de las demas paginas (Mis barajas, la Comunidad…). */}
      <p className="eyebrow mb-3">Mesa</p>
      <h1 id="mesa-titulo" className="text-3xl font-bold tracking-[-0.02em]">
        Práctica en solitario
      </h1>
      <p className="text-muted mt-3 leading-relaxed">
        Elige una de tus barajas para probarla en la mesa. Nada se juega solo: mueves las
        cartas tú, como en la vida real.
      </p>

      {conCartas.length === 0 ? (
        <div className={cn(VACIO, "mt-10")}>
          <p className="text-ink">No tienes barajas con cartas.</p>
          <Link href="/constructor/" className={cn(ENLACE, "mt-2 inline-block")}>
            Armar una baraja
          </Link>
        </div>
      ) : (
        // Las tarjetas de Mis barajas, sin sus botones: aqui solo se elige.
        <ul className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {conCartas.map((d) => (
            <TarjetaBaraja
              key={d.id}
              deck={d}
              index={indiceDe(deFormato(d.formato), d.formato)}
              onElegir={() => setElegida(d)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
