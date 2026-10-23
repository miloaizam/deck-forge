import type { Metadata } from "next";
import { X } from "lucide-react";

import { DocumentHeader } from "@/components/documentos/DocumentHeader";
import { DocumentLayout } from "@/components/documentos/DocumentLayout";
import { DocumentSection } from "@/components/documentos/DocumentSection";
import { ID_NOTAS, NotasTranscripcion } from "@/components/documentos/NotasTranscripcion";
import { DOCUMENTOS, fechaLarga } from "@/lib/documentos";
import { BANLIST, pesoDelPdf } from "@/lib/documentos-data";
import { CONTADOR } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Banlist Estándar",
  description:
    "Las cartas prohibidas, las Únicas y las erratas del formato Estándar RE MyL (Escuelas Elementales).",
};

const col = new Intl.Collator("es");
const ordenar = (l: string[]) => [...l].sort(col.compare);

const ITEM =
  "bg-panel border-line rounded-card flex items-center gap-2.5 border px-3.5 py-2.5 text-[14px] font-medium";

/**
 * La Banlist en HTML, dibujada con los mismos datos que su PDF
 * (`documentos/fuente/banlist-estandar.json`). Server Component, sin
 * JavaScript propio salvo el indice, que es el de los tres documentos.
 */
export default function BanlistPage() {
  const doc = BANLIST;

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <DocumentHeader
        doc={DOCUMENTOS.banlist}
        titulo="Banlist Estándar"
        bajada="Qué cartas no se pueden jugar, cuáles van con una sola copia y las erratas que se aplican al formato."
        origen={`Transcripción de DeckForge del documento oficial «${doc.original.titulo}», modificado el ${fechaLarga(doc.original.modificado)}. Versión del ${fechaLarga(doc.version)}. Se corrigió la ortografía del documento y los nombres de carta según el catálogo; está al final, en las notas de la transcripción.`}
        peso={pesoDelPdf(DOCUMENTOS.banlist)}
      />

      <DocumentLayout
        indice={[
          { id: "prohibidas", etiqueta: "Prohibidas", cuenta: doc.prohibidas.length },
          { id: "unicas", etiqueta: "Únicas", cuenta: doc.unicas.length },
          { id: "erratas", etiqueta: "Erratas", cuenta: doc.erratas.length },
          { id: ID_NOTAS, etiqueta: "Notas de la transcripción" },
        ]}
      >
        <DocumentSection
          id="prohibidas"
          titulo="Prohibidas"
          cuenta={doc.prohibidas.length}
          bajada="No se pueden incluir en la baraja ni en el side deck."
          tono="peligro"
        >
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ordenar(doc.prohibidas).map((c) => (
              <li key={c} className={`${ITEM} border-danger/40`}>
                <X size={15} aria-hidden="true" className="text-danger shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </DocumentSection>

        <DocumentSection
          id="unicas"
          titulo="Únicas"
          cuenta={doc.unicas.length}
          bajada="Solo se puede llevar una copia de cada una."
        >
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ordenar(doc.unicas).map((c) => (
              <li key={c} className={ITEM}>
                <span aria-hidden="true" className={CONTADOR}>
                  1
                </span>
                {c}
              </li>
            ))}
          </ul>
        </DocumentSection>

        <DocumentSection
          id="erratas"
          titulo="Erratas"
          cuenta={doc.erratas.length}
          bajada="Cambios que la banlist aplica a cartas del formato."
        >
          <dl className="border-line bg-panel rounded-card divide-y divide-(--color-line) border">
            {doc.erratas.map((e) => (
              <div
                key={e.carta}
                className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-6"
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
        </DocumentSection>

        <NotasTranscripcion notas={doc.correcciones.map((texto) => ({ texto }))} />
      </DocumentLayout>
    </main>
  );
}
