import Link from "next/link";
import { RefreshCw, X } from "lucide-react";

import { DocumentHeader } from "./DocumentHeader";
import { DocumentLayout } from "./DocumentLayout";
import { DocumentSection } from "./DocumentSection";
import { ID_NOTAS, NotasTranscripcion } from "./NotasTranscripcion";
import { DOCUMENTO_BANLIST, fechaLarga } from "@/lib/documentos";
import { BANLISTS, pesoDelPdf } from "@/lib/documentos-data";
import { DESCRIPCION_FORMATO, NOMBRE_FORMATO } from "@/lib/formatos";
import { FORMATOS, type Formato } from "@/lib/types";
import {
  CONTADOR,
  SEGMENTO,
  SEGMENTO_ACTIVO,
  SEGMENTO_INACTIVO,
  SEGMENTOS,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

const col = new Intl.Collator("es");
const ordenar = (l: string[]) => [...l].sort(col.compare);

const ITEM =
  "bg-panel border-line rounded-card flex items-center gap-2.5 border px-3.5 py-2.5 text-[14px] font-medium";

/** Lo que dice la cabecera de cada Banlist. */
const BAJADA: Record<Formato, string> = {
  estandar:
    "Qué cartas no se pueden jugar, cuáles van con una sola copia y las erratas que se aplican al formato.",
  vcr: "Qué cartas no se pueden jugar, cuáles van con una sola copia, cuáles son Errantes y qué cartas de fuera del bloque se admiten.",
  infanteria:
    "Qué cartas no se pueden jugar, cuáles van con una sola copia y cuáles son Errantes.",
};

/**
 * La Banlist de un formato en HTML, dibujada con los mismos datos que su PDF
 * (`documentos/fuente/banlist-<formato>.json`). Las tres comparten el DAR y la
 * Fe de Erratas; esta pagina es lo que cambia. Server Component, sin
 * JavaScript propio salvo el indice, que es el de los tres documentos.
 */
export function BanlistDocumento({ formato }: { formato: Formato }) {
  const doc = BANLISTS[formato];
  const ficha = DOCUMENTO_BANLIST[formato];
  const errantes = doc.errantes ?? [];
  const fuera = doc.fueraDelBloque ?? [];
  const origen = doc.original.modificado
    ? `Transcripción de DeckForge del documento oficial «${doc.original.titulo}», modificado el ${fechaLarga(doc.original.modificado)}. Versión del ${fechaLarga(doc.version)}. Se corrigió la ortografía del documento y los nombres de carta según el catálogo; está al final, en las notas de la transcripción.`
    : `Transcripción de DeckForge de la imagen oficial «${doc.original.titulo}», que no trae fecha. Versión del ${fechaLarga(doc.version)}. Se corrigieron los nombres de carta según el catálogo; está al final, en las notas de la transcripción.`;

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <DocumentHeader
        doc={ficha}
        titulo={`Banlist ${NOMBRE_FORMATO[formato]}`}
        bajada={`${formato === "estandar" ? "" : `${DESCRIPCION_FORMATO[formato]} `}${BAJADA[formato]}`}
        origen={origen}
        peso={pesoDelPdf(ficha)}
      >
        {/* Cada formato tiene su Banlist: se salta de una a otra sin volver
            a Documentos. */}
        <nav aria-label="Banlist de cada formato" className={cn(SEGMENTOS, "mt-5")}>
          {FORMATOS.map((f) => (
            <Link
              key={f}
              href={DOCUMENTO_BANLIST[f].ruta}
              aria-current={f === formato ? "page" : undefined}
              className={cn(
                SEGMENTO,
                f === formato ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO,
              )}
            >
              {NOMBRE_FORMATO[f]}
            </Link>
          ))}
        </nav>
      </DocumentHeader>

      <DocumentLayout
        indice={[
          { id: "prohibidas", etiqueta: "Prohibidas", cuenta: doc.prohibidas.length },
          { id: "unicas", etiqueta: "Únicas", cuenta: doc.unicas.length },
          ...(errantes.length
            ? [{ id: "errantes", etiqueta: "Errantes", cuenta: errantes.length }]
            : []),
          ...(fuera.length
            ? [
                {
                  id: "fuera-del-bloque",
                  etiqueta: "Fuera del bloque EE",
                  cuenta: fuera.length,
                },
              ]
            : []),
          ...(doc.erratas.length
            ? [{ id: "erratas", etiqueta: "Erratas", cuenta: doc.erratas.length }]
            : []),
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

        {errantes.length > 0 && (
          <DocumentSection
            id="errantes"
            titulo="Errantes"
            cuenta={errantes.length}
            bajada="No puede haber dos con el mismo nombre en juego bajo tu control. Si la carta era Única, deja de serlo."
          >
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {ordenar(errantes).map((c) => (
                <li key={c} className={ITEM}>
                  <RefreshCw
                    size={15}
                    aria-hidden="true"
                    className="text-accent shrink-0"
                  />
                  {c}
                </li>
              ))}
            </ul>
          </DocumentSection>
        )}

        {fuera.length > 0 && (
          <DocumentSection
            id="fuera-del-bloque"
            titulo="Fuera del bloque EE"
            cuenta={fuera.length}
            bajada="Cartas de otras ediciones que el formato admite, y con qué condición. Las demás de fuera del bloque no se pueden jugar."
          >
            <dl className="border-line bg-panel rounded-card divide-y divide-(--color-line) border">
              {fuera.map((e) => (
                <div
                  key={e.carta}
                  className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-6"
                >
                  <dt className="text-accent font-semibold">
                    {e.carta}
                    <span className="text-muted block text-[12px] font-normal">
                      {e.edicion}
                    </span>
                  </dt>
                  <dd className="text-ink text-[14px] leading-relaxed">{e.condicion}.</dd>
                </div>
              ))}
            </dl>
          </DocumentSection>
        )}

        {doc.erratas.length > 0 && (
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
        )}

        <NotasTranscripcion notas={doc.correcciones.map((texto) => ({ texto }))} />
      </DocumentLayout>
    </main>
  );
}
