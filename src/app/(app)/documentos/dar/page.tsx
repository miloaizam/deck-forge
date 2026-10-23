import type { Metadata } from "next";

import { DarBloques } from "@/components/documentos/DarBloques";
import { DocumentHeader } from "@/components/documentos/DocumentHeader";
import type { EntradaIndice } from "@/components/documentos/DocumentIndex";
import { DocumentLayout } from "@/components/documentos/DocumentLayout";
import { DocumentSection } from "@/components/documentos/DocumentSection";
import { ID_NOTAS, NotasTranscripcion } from "@/components/documentos/NotasTranscripcion";
import { getCards } from "@/lib/cards";
import { apartadosNumerados, cartasDelDar, resolverCartas } from "@/lib/dar";
import { DOCUMENTOS, fechaLarga } from "@/lib/documentos";
import { DAR, pesoDelPdf } from "@/lib/documentos-data";

export const metadata: Metadata = {
  title: "Documento Actualizado de Reglas",
  description:
    "El DAR del formato Escuelas Elementales de Mitos y Leyendas: cómo se juega, regla por regla, con las cartas de ejemplo del catálogo.",
};

/** La carta del diagrama de anatomia: Wyrm de la Plaga de Escuelas Elementales. */
const ANATOMIA = "ee-013";

/**
 * El DAR en HTML, dibujado con los mismos datos que su PDF
 * (`documentos/fuente/dar.json`). Server Component: las cartas de ejemplo se
 * resuelven en el build contra el catalogo, y lo unico con JavaScript es el
 * indice.
 */
export default async function DarPage() {
  const catalogo = await getCards();
  const cartas = resolverCartas(cartasDelDar(DAR), catalogo);
  const wyrm = catalogo.find((c) => c.id === ANATOMIA);
  if (!wyrm)
    throw new Error(`Falta ${ANATOMIA} en el catálogo: es la carta del diagrama`);
  const anatomia = { nombre: wyrm.nombre, thumb: wyrm.thumb, imagen: wyrm.imagen };

  const indice: EntradaIndice[] = [
    ...DAR.secciones.map((s) => ({
      id: s.id,
      // El anexo no lleva numero: su titulo ya dice lo que es.
      numero: /^\d+$/.test(s.id) ? s.id : undefined,
      etiqueta: s.titulo,
      hijos: apartadosNumerados(s.bloques).map((a) => ({
        id: a.id,
        numero: a.numero,
        etiqueta: a.titulo,
      })),
    })),
    { id: ID_NOTAS, etiqueta: "Notas de la transcripción" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <DocumentHeader
        doc={DOCUMENTOS.dar}
        titulo={DAR.titulo}
        bajada="Cómo se juega, regla por regla: las partes de una carta, las zonas, las habilidades, las fases del turno y los conceptos del juego."
        origen={`Transcripción de DeckForge del documento oficial «${DAR.original.titulo}», revisión de ${DAR.original.revision}. Versión del ${fechaLarga(DAR.version)}. El texto de las reglas se copia del original; lo que se corrigió está al final, en las notas de la transcripción.`}
        peso={pesoDelPdf(DOCUMENTOS.dar)}
      />

      <DocumentLayout indice={indice}>
        <div className="text-ink max-w-[46rem] text-[16px] leading-relaxed">
          {DAR.secciones.map((s) => (
            <DocumentSection
              key={s.id}
              id={s.id}
              numero={/^\d+$/.test(s.id) ? s.id : undefined}
              titulo={s.titulo}
            >
              <DarBloques bloques={s.bloques} nivel={3} ctx={{ cartas, anatomia }} />
            </DocumentSection>
          ))}
          <NotasTranscripcion notas={DAR.correcciones.map((texto) => ({ texto }))} />
        </div>
      </DocumentLayout>
    </main>
  );
}
