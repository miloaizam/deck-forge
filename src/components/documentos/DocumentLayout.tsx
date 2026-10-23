import type { ReactNode } from "react";

import { DocumentIndex, type EntradaIndice } from "./DocumentIndex";

/**
 * El cuerpo de un documento: el indice al costado (arriba, plegado, en el
 * telefono) y las secciones. Lo comparten el DAR, la Fe de Erratas y la
 * Banlist, para que se lean igual.
 */
export function DocumentLayout({
  indice,
  children,
}: {
  indice: EntradaIndice[];
  children: ReactNode;
}) {
  return (
    <div className="mt-10 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-12 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <DocumentIndex entradas={indice} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
