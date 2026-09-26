import Link from "next/link";
import { BookOpen, Download, ExternalLink } from "lucide-react";

import type { Documento } from "@/lib/documentos";
import { cn } from "@/lib/utils";

const BOTON =
  "inline-flex h-11 items-center gap-1.5 rounded-chip border border-line px-4 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";
const PRIMARIO =
  "inline-flex h-11 items-center gap-1.5 rounded-chip bg-brand-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-brand-300";

/**
 * Lo que se puede hacer con un documento: leerlo en el sitio, abrir el PDF
 * con el visor del navegador o bajarlo.
 *
 * El PDF no se incrusta: la CSP lleva `object-src 'none'` y
 * `frame-ancestors 'none'`, asi que ni `<embed>` ni `<iframe>` (seguridad #11
 * de CLAUDE.md). La lectura en el sitio es la pagina HTML, dibujada con los
 * mismos datos; "Abrir" lo deja en manos del visor del navegador, en otra
 * pestana.
 */
export function DocumentActions({
  doc,
  nombre,
  peso,
  verEnElSitio = false,
  className,
}: {
  doc: Documento;
  /** El nombre del documento, para las etiquetas accesibles. */
  nombre: string;
  peso: string;
  verEnElSitio?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {verEnElSitio && (
        <Link href={doc.ruta} className={PRIMARIO}>
          <BookOpen size={14} aria-hidden="true" />
          Leer en el sitio
        </Link>
      )}
      <a
        href={doc.pdf}
        target="_blank"
        rel="noopener noreferrer"
        className={BOTON}
        aria-label={`Abrir el PDF de ${nombre} en una pestaña nueva`}
      >
        <ExternalLink size={14} aria-hidden="true" />
        Abrir PDF
      </a>
      <a
        href={doc.pdf}
        download
        className={verEnElSitio ? BOTON : PRIMARIO}
        aria-label={`Descargar el PDF de ${nombre} (${peso})`}
      >
        <Download size={14} aria-hidden="true" />
        Descargar
        <span
          className={cn("tabular-nums", verEnElSitio ? "text-muted" : "text-white/75")}
        >
          · {peso}
        </span>
      </a>
    </div>
  );
}
