import Link from "next/link";

import { leerMarcado } from "@/lib/marcado";

/** Un enlace dentro del texto de un documento: a otra regla o a una carta. */
export const ENLACE_EN_TEXTO =
  "text-accent decoration-brand-500/40 rounded-sm underline underline-offset-[3px] transition-colors hover:decoration-current focus-visible:outline-brand-500";

/**
 * Un texto de documento con su marcado (`marcado.ts`) pintado como nodos de
 * React, sin HTML. Las referencias van al ancla de la regla; las cartas, al
 * catalogo buscandolas por nombre, como la cinta de la portada.
 */
export function Marcado({ texto }: { texto: string }) {
  return leerMarcado(texto).map((t, i) => {
    switch (t.tipo) {
      case "texto":
        return t.texto;
      case "negrita":
        return (
          <strong key={i} className="text-ink font-semibold">
            {t.texto}
          </strong>
        );
      case "cursiva":
        return <em key={i}>{t.texto}</em>;
      case "ref":
        return (
          <a key={i} href={`#${t.id}`} className={ENLACE_EN_TEXTO}>
            {t.texto}
          </a>
        );
      case "carta":
        return (
          <Link
            key={i}
            href={`/catalogo?q=${encodeURIComponent(t.nombre)}`}
            className={ENLACE_EN_TEXTO}
          >
            {t.nombre}
          </Link>
        );
    }
  });
}
