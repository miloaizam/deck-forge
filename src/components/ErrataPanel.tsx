"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, ChevronDown, FileWarning } from "lucide-react";

import { AbilityText } from "./AbilityText";
import { DiffText } from "./documentos/DiffText";
import { ETIQUETA_CAMBIO } from "@/lib/documentos";
import {
  erratasDe,
  estaBaneada,
  NOMBRE_DE_FUENTE,
  RUTA_DE_FUENTE,
  type ErrataDeCarta,
} from "@/lib/erratas";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";
import { wordDiff } from "@/lib/word-diff";

/**
 * Lo que la Fe de Erratas y la Banlist dicen de una carta, en su modal.
 *
 * El modal muestra el texto ORIGINAL; la errata se abre con un boton, para
 * que quien lee la carta vea primero lo que dice la carta impresa. La
 * baneada no se esconde: es una linea roja a la vista.
 *
 * El modal reutiliza este panel al cambiar de carta, asi que el estado
 * "abierto" se guarda junto con la carta a la que corresponde.
 */
export function ErrataPanel({ card }: { card: Card }) {
  const [abiertaPara, setAbiertaPara] = useState<string | null>(null);
  const abierto = abiertaPara === card.id;
  const erratas = erratasDe(card);
  const baneada = estaBaneada(card);
  if (erratas.length === 0 && !baneada) return null;

  return (
    <div className="border-line mt-5 border-t pt-5">
      {baneada && (
        <p className="text-danger flex items-center gap-2 text-sm font-medium">
          <Ban size={16} aria-hidden="true" />
          Prohibida en la Banlist: se puede armar con ella, pero la baraja queda fuera del
          formato.
        </p>
      )}
      {erratas.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={`errata-${card.id}`}
            onClick={() => setAbiertaPara(abierto ? null : card.id)}
            className={cn(
              "border-line bg-accent-soft text-accent hover:border-brand-500 rounded-chip focus-visible:outline-brand-500 inline-flex h-10 items-center gap-2 border px-3.5 text-sm font-medium transition-colors",
              baneada && "mt-3",
            )}
          >
            <FileWarning size={16} aria-hidden="true" />
            Errata
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={cn("transition-transform", abierto && "rotate-180")}
            />
          </button>
          {/* `.pliegue` (globals.css): se abre empujando lo de abajo. */}
          <div id={`errata-${card.id}`} className={cn("pliegue", abierto && "abierto")}>
            <div>
              <ul className="mt-3 grid gap-3">
                {erratas.map((e, i) => (
                  <li key={i} className="bg-panel border-line rounded-card border p-3.5">
                    <Errata errata={e} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Errata({ errata: e }: { errata: ErrataDeCarta }) {
  const etiqueta = e.cambio === "nota" ? "Errata" : ETIQUETA_CAMBIO[e.cambio];
  return (
    <div className="text-[14px]">
      <p className="text-muted mb-2 text-[11px] tracking-[0.18em] uppercase">
        {etiqueta} ·{" "}
        <Link
          href={RUTA_DE_FUENTE[e.fuente]}
          className="hover:text-accent underline-offset-2 hover:underline"
        >
          {NOMBRE_DE_FUENTE[e.fuente]}
        </Link>
      </p>
      {e.cambio === "habilidad" ? (
        <TextoArreglado antes={e.antes} despues={e.despues} />
      ) : e.cambio === "nota" ? (
        <p className="leading-relaxed">{e.despues}</p>
      ) : (
        <p className="leading-relaxed">
          {e.antes && (
            <>
              <del className="text-muted">{e.antes}</del> →{" "}
            </>
          )}
          <strong className="text-ink font-medium">{e.despues}</strong>
        </p>
      )}
      {e.nota && <p className="text-muted mt-2 text-[13px]">{e.nota}</p>}
    </div>
  );
}

/**
 * El "debe decir" con lo que cambia resaltado, como en la pagina de la Fe de
 * Erratas. Si el documento no da el "donde dice", va el texto a secas con las
 * keywords resaltadas.
 */
function TextoArreglado({ antes, despues }: { antes: string | null; despues: string }) {
  if (!antes) return <AbilityText text={despues} />;
  return <DiffText tramos={wordDiff(antes, despues).despues} />;
}
