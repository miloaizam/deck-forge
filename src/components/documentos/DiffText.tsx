import type { Tramo } from "@/lib/word-diff";

/**
 * Un lado de una errata, con lo que cambia marcado: tachado en rojo lo que
 * sale, resaltado en violeta lo que entra. `<del>` e `<ins>` los anuncian los
 * lectores de pantalla que lo soportan, y el color nunca es la unica pista:
 * uno va tachado y el otro sobre fondo.
 */
export function DiffText({ tramos }: { tramos: Tramo[] }) {
  return (
    <p className="leading-relaxed whitespace-pre-line">
      {tramos.map((t, i) =>
        t.tipo === "sale" ? (
          <del key={i} className={MARCA_SALE}>
            {t.texto}
          </del>
        ) : t.tipo === "entra" ? (
          <ins key={i} className={MARCA_ENTRA}>
            {t.texto}
          </ins>
        ) : (
          t.texto
        ),
      )}
    </p>
  );
}

export const MARCA_SALE =
  "text-danger decoration-danger/70 bg-danger/10 rounded-[3px] line-through";
export const MARCA_ENTRA = "text-ink bg-brand-600/30 rounded-[3px] px-0.5 no-underline";
