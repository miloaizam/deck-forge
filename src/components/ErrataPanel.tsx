"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, ChevronDown, FileWarning } from "lucide-react";

import { MARCA_ENTRA, MARCA_SALE } from "./documentos/DiffText";
import {
  errataUnica,
  estaBaneada,
  RUTA_DE_FUENTE,
  type CambioDeErrata,
} from "@/lib/erratas";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const errata = errataUnica(card);
  const baneada = estaBaneada(card);
  if (!errata && !baneada) return null;

  return (
    <div className="border-line mt-5 border-t pt-5">
      {baneada && (
        <p className="text-danger flex items-center gap-2 text-sm font-medium">
          <Ban size={16} aria-hidden="true" />
          Prohibida en la Banlist: se puede armar con ella, pero la baraja queda fuera del
          formato.
        </p>
      )}
      {errata && (
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
              {/* Una sola errata por carta: solo lo que cambia, con la Fe de
                  Erratas y la Banlist juntas (`errataUnica`). */}
              <div className="bg-panel border-line rounded-card mt-3 border p-3.5 text-[14px]">
                <ul className="grid gap-2">
                  {errata.cambios.map((c, i) => (
                    <li key={i}>
                      <Cambio cambio={c} />
                    </li>
                  ))}
                </ul>
                <p className="text-muted mt-3 text-[12px]">
                  Según{" "}
                  {errata.fuentes.map((f, i) => (
                    <span key={f}>
                      {i > 0 && " y "}
                      <Link
                        href={RUTA_DE_FUENTE[f]}
                        className="hover:text-accent underline underline-offset-2"
                      >
                        {f === "banlist" ? "la Banlist" : "la Fe de Erratas"}
                      </Link>
                    </span>
                  ))}
                  .
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Cambio({ cambio: c }: { cambio: CambioDeErrata }) {
  if (c.tipo === "nota") return <p className="leading-relaxed">{c.texto}</p>;
  const sale = c.sale ? <del className={MARCA_SALE}>{c.sale}</del> : null;
  const entra = <ins className={MARCA_ENTRA}>{c.entra}</ins>;
  if (c.tipo === "dato") {
    return (
      <p className="leading-relaxed">
        <span className="text-muted">{c.etiqueta}:</span> {sale}
        {sale && " → "}
        {entra}
      </p>
    );
  }
  if (!c.sale) {
    return (
      <p className="leading-relaxed">
        <span className="text-muted">Se agrega:</span> {entra}
      </p>
    );
  }
  if (!c.entra) {
    return (
      <p className="leading-relaxed">
        <span className="text-muted">Se quita:</span> {sale}
      </p>
    );
  }
  return (
    <p className="leading-relaxed">
      {sale} → {entra}
    </p>
  );
}
