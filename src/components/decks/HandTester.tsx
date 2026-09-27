"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Hand, RotateCcw, Shuffle } from "lucide-react";

import { CARD_RATIO, marcarCargada } from "../CardTile";
import type { ResolvedDeck, RuleCard } from "@/lib/deck-rules";
import { mazoParaRobar, robarMano, MANO_INICIAL, MANO_MINIMA } from "@/lib/hand-test";

interface HandTesterProps {
  res: ResolvedDeck;
  oroInicial: string | null;
  onVer: (cardId: string) => void;
  className?: string;
}

const BOTON =
  "inline-flex h-11 items-center gap-1.5 rounded-chip border border-line px-4 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-40";

/**
 * Probar una mano inicial: roba MANO_INICIAL cartas al azar del principal, sin
 * el oro inicial, y deja hacer mulligan (una carta menos cada vez).
 *
 * La logica vive en `src/lib/hand-test.ts`, con su test; aqui solo el estado de
 * la ronda. El azar es `Math.random`: para ver manos posibles sobra, no es un
 * juego con apuestas.
 */
export function HandTester({ res, oroInicial, onVer, className }: HandTesterProps) {
  const mazo = useMemo(() => mazoParaRobar(res, oroInicial), [res, oroInicial]);
  const porId = useMemo(() => {
    const m = new Map<string, RuleCard>();
    for (const { card } of res.principal) m.set(card.id, card);
    return m;
  }, [res]);

  const [mano, setMano] = useState<string[] | null>(null);
  const [tamano, setTamano] = useState(MANO_INICIAL);
  /** Sube en cada robo: cambia las claves y la mano nueva vuelve a entrar animada. */
  const [ronda, setRonda] = useState(0);

  const robar = (cuantas: number) => {
    setTamano(cuantas);
    setMano(robarMano(mazo, cuantas));
    setRonda((r) => r + 1);
  };

  const puedeMulligan = mano !== null && tamano > MANO_MINIMA;

  return (
    <section aria-labelledby="probar-mano" className={className}>
      <div className="flex flex-col items-center gap-1 text-center">
        <h2
          id="probar-mano"
          className="text-ink flex items-center gap-2 text-sm font-bold tracking-[0.1em] uppercase"
        >
          <Hand size={16} aria-hidden="true" className="text-accent" />
          Probar una mano
        </h2>
        <p className="text-muted text-[13px]">
          {MANO_INICIAL} cartas al azar de la baraja, sin el oro inicial. Cada mulligan
          vuelve a barajar y roba una menos.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => robar(MANO_INICIAL)}
          disabled={mazo.length === 0}
          className="bg-brand-600 hover:bg-brand-500 rounded-chip focus-visible:outline-brand-300 inline-flex h-11 items-center gap-1.5 px-4 text-[13px] font-medium text-white transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          {mano ? (
            <RotateCcw size={14} aria-hidden="true" />
          ) : (
            <Shuffle size={14} aria-hidden="true" />
          )}
          {mano ? "Nueva mano" : "Robar mano"}
        </button>
        <button
          type="button"
          onClick={() => robar(tamano - 1)}
          disabled={!puedeMulligan}
          className={BOTON}
        >
          <Shuffle size={14} aria-hidden="true" />
          Mulligan{puedeMulligan ? ` (${tamano - 1})` : ""}
        </button>
      </div>

      {/* La mano se anuncia entera al robarla, no carta por carta. */}
      <div aria-live="polite" className="mt-5">
        {mazo.length === 0 ? (
          <p className="text-muted text-center text-[13px]">
            La baraja no tiene cartas para robar.
          </p>
        ) : mano === null ? (
          <p className="text-muted border-line rounded-card border border-dashed px-4 py-10 text-center text-[13px]">
            Pulsa «Robar mano» para ver una mano inicial al azar.
          </p>
        ) : (
          <>
            <p className="text-muted mb-3 text-center text-[13px] tabular-nums">
              {tamano === MANO_INICIAL
                ? `Mano de ${mano.length} ${mano.length === 1 ? "carta" : "cartas"}`
                : `Mulligan: mano de ${mano.length} ${mano.length === 1 ? "carta" : "cartas"}`}
              {" · "}
              {mazo.length - mano.length} en el Mazo Castillo
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {mano.map((id, i) => {
                const card = porId.get(id);
                if (!card) return null;
                return (
                  <li
                    key={`${ronda}-${i}`}
                    // Cuatro por fila en el telefono; desde `sm` caben las ocho en una.
                    className="aparece w-[calc(25%-0.375rem)] max-w-[88px] sm:w-[calc(12.5%-0.4375rem)]"
                  >
                    <button
                      type="button"
                      onClick={() => onVer(id)}
                      aria-label={`Ver ${card.nombre}`}
                      className="focus-visible:outline-brand-500 hover:border-brand-500 border-line rounded-card block w-full overflow-hidden border transition-colors"
                    >
                      <Image
                        src={card.thumb}
                        alt=""
                        width={200}
                        height={286}
                        onLoad={marcarCargada}
                        className="imagen-carga w-full"
                        style={{ aspectRatio: CARD_RATIO }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
