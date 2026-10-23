import { DocumentSection } from "./DocumentSection";
import { ENLACE_EN_TEXTO } from "./Marcado";

export interface NotaTranscripcion {
  texto: string;
  /** A que se refiere, con su ancla: una carta de la Fe de Erratas. */
  sobre?: { id: string; etiqueta: string };
}

/** El id de la seccion, para el indice. */
export const ID_NOTAS = "notas-de-la-transcripcion";

/**
 * Lo que DeckForge corrigio del documento original al transcribirlo. Va al
 * final de los tres documentos, con el mismo titulo, para que se sepa que el
 * texto no es una copia ciega y que se puede comprobar contra el original.
 */
export function NotasTranscripcion({ notas }: { notas: NotaTranscripcion[] }) {
  return (
    <DocumentSection
      id={ID_NOTAS}
      titulo="Notas de la transcripción"
      bajada="Lo que se corrigió del documento original al pasarlo al sitio."
    >
      <ol className="border-line bg-panel rounded-card divide-y divide-(--color-line) border">
        {notas.map((n, i) => (
          <li
            key={i}
            className="text-muted grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 px-4 py-3 text-[14px] leading-relaxed"
          >
            <span className="text-accent font-semibold tabular-nums">{i + 1}.</span>
            <p>
              {n.sobre && (
                <>
                  <a href={`#${n.sobre.id}`} className={ENLACE_EN_TEXTO}>
                    {n.sobre.etiqueta}
                  </a>
                  {": "}
                </>
              )}
              {n.texto}
            </p>
          </li>
        ))}
      </ol>
    </DocumentSection>
  );
}
