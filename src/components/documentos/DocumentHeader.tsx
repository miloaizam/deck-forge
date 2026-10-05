import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { DocumentActions } from "./DocumentActions";
import type { Documento } from "@/lib/documentos";

/** La cabecera de la pagina de un documento: volver, titulo, origen y el PDF. */
export function DocumentHeader({
  doc,
  titulo,
  bajada,
  origen,
  peso,
  children,
}: {
  doc: Documento;
  titulo: string;
  bajada: string;
  origen: string;
  peso: string;
  /** Lo que va bajo las acciones (la leyenda de colores, por ejemplo). */
  children?: ReactNode;
}) {
  return (
    <header>
      <Link
        href="/documentos"
        className="text-muted hover:text-ink focus-visible:outline-brand-500 rounded-chip -ml-1 inline-flex items-center gap-1 px-1 text-[13px] transition-colors"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        Documentos
      </Link>
      <p className="eyebrow mt-4 mb-3">Documento oficial</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">{titulo}</h1>
      <p className="text-muted mt-3 leading-relaxed">{bajada}</p>
      <p className="text-muted mt-2 text-[13px] leading-relaxed">{origen}</p>
      <DocumentActions doc={doc} nombre={titulo} peso={peso} className="mt-5" />
      {children}
    </header>
  );
}
