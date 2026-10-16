import Link from "next/link";
import { BookOpen, Download, ExternalLink } from "lucide-react";

import type { Documento } from "@/lib/documentos";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from "@/lib/ui";
import { cn } from "@/lib/utils";

const BOTON = BOTON_SECUNDARIO;
const PRIMARIO = BOTON_PRIMARIO;

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
      <a href={doc.pdf} target="_blank" rel="noopener noreferrer" className={BOTON}>
        {/* Sin aria-label: el nombre accesible tiene que contener el texto que
            se ve (WCAG 2.5.3). Lo que falta para un lector va en sr-only. */}
        <ExternalLink size={14} aria-hidden="true" />
        Abrir PDF
        <span className="sr-only"> de {nombre} en una pestaña nueva</span>
      </a>
      <a href={doc.pdf} download className={verEnElSitio ? BOTON : PRIMARIO}>
        <Download size={14} aria-hidden="true" />
        Descargar
        <span className="sr-only"> el PDF de {nombre}</span>
        <span
          className={cn("tabular-nums", verEnElSitio ? "text-muted" : "text-white/90")}
        >
          · {peso}
        </span>
      </a>
    </div>
  );
}
