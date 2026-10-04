import type { Metadata } from "next";
import { X } from "lucide-react";

import { DocumentHeader } from "@/components/documentos/DocumentHeader";
import { DOCUMENTOS, fechaLarga } from "@/lib/documentos";
import { BANLIST, pesoDelPdf } from "@/lib/documentos-data";

export const metadata: Metadata = {
  title: "Banlist Estándar",
  description:
    "Las cartas prohibidas, las Únicas y las erratas del formato Estándar RE MyL (Escuelas Elementales).",
};

const col = new Intl.Collator("es");
const ordenar = (l: string[]) => [...l].sort(col.compare);

const SECCION = "mt-12";
const TITULO = "text-ink flex items-center gap-2 text-xl font-bold";
const CUENTA =
  "bg-brand-600 rounded-chip px-2 text-[12px] font-bold text-white tabular-nums";
const BAJADA = "text-muted mt-1.5 max-w-[80ch] leading-relaxed";
const ITEM =
  "bg-panel border-line rounded-card flex items-center gap-2.5 border px-3.5 py-2.5 text-[14px] font-medium";

/**
 * La Banlist en HTML, dibujada con los mismos datos que su PDF
 * (`documentos/fuente/banlist-estandar.json`). Server Component, sin
 * JavaScript propio.
 */
export default function BanlistPage() {
  const doc = BANLIST;

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <DocumentHeader
        doc={DOCUMENTOS.banlist}
        titulo="Banlist Estándar"
        bajada="Qué cartas no se pueden jugar, cuáles van con una sola copia y las erratas que se aplican al formato."
        origen={`Transcripción de DeckForge del documento oficial «${doc.original.titulo}», modificado el ${fechaLarga(doc.original.modificado)}. Versión del ${fechaLarga(doc.version)}. Se corrigió la ortografía del documento y los nombres de carta según el catálogo.`}
        peso={pesoDelPdf(DOCUMENTOS.banlist)}
      />

      <div className="border-brand-500/60 bg-accent-soft rounded-card mt-8 border px-5 py-4">
        <p className="text-accent text-[11px] font-semibold tracking-[0.2em] uppercase">
          Construcción de la baraja
        </p>
        <p className="text-ink mt-1 text-[16px] font-semibold">{doc.construccion}</p>
      </div>

      <section aria-labelledby="prohibidas" className={SECCION}>
        <h2 id="prohibidas" className={`${TITULO} text-danger`}>
          Prohibidas <span className={CUENTA}>{doc.prohibidas.length}</span>
        </h2>
        <p className={BAJADA}>No se pueden incluir en la baraja ni en el side deck.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ordenar(doc.prohibidas).map((c) => (
            <li key={c} className={`${ITEM} border-danger/40`}>
              <X size={15} aria-hidden="true" className="text-danger shrink-0" />
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="unicas" className={SECCION}>
        <h2 id="unicas" className={TITULO}>
          Únicas <span className={CUENTA}>{doc.unicas.length}</span>
        </h2>
        <p className={BAJADA}>Solo se puede llevar una copia de cada una.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ordenar(doc.unicas).map((c) => (
            <li key={c} className={ITEM}>
              <span
                aria-hidden="true"
                className="bg-brand-600 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              >
                1
              </span>
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="erratas" className={SECCION}>
        <h2 id="erratas" className={TITULO}>
          Erratas <span className={CUENTA}>{doc.erratas.length}</span>
        </h2>
        <p className={BAJADA}>Cambios que la banlist aplica a cartas del formato.</p>
        <dl className="border-line bg-panel rounded-card mt-4 divide-y divide-(--color-line) border">
          {doc.erratas.map((e) => (
            <div
              key={e.carta}
              className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,16rem)_1fr] md:gap-6"
            >
              <dt className="text-accent font-semibold">
                {e.carta}
                {e.edicion && (
                  <span className="text-muted block text-[12px] font-normal">
                    {e.edicion}
                  </span>
                )}
              </dt>
              <dd className="text-ink text-[14px] leading-relaxed">{e.texto}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
