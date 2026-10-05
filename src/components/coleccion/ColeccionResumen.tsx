import { porcentaje, type Avance, type ResumenColeccion } from "@/lib/coleccion";
import { cn } from "@/lib/utils";

interface ColeccionResumenProps {
  resumen: ResumenColeccion;
  /** La edicion que filtra la lista, para marcarla. */
  edicion: string;
  /** Pulsar una edicion filtra la lista por ella (o quita el filtro). */
  onEdicion: (slug: string) => void;
}

/** Barra de avance. El color pasa a verde al completar. */
function Barra({ avance, className }: { avance: Avance; className?: string }) {
  const completa = avance.total > 0 && avance.tengo === avance.total;
  return (
    <span
      aria-hidden="true"
      className={cn("bg-line block h-1.5 overflow-hidden rounded-full", className)}
    >
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-300",
          completa ? "bg-success" : "bg-brand-500",
        )}
        style={{ width: `${(avance.tengo / Math.max(1, avance.total)) * 100}%` }}
      />
    </span>
  );
}

/**
 * Cuanto lleva la coleccion: el total, las cartas distintas, las copias y,
 * edicion por edicion, el «212 / 246» que se mira para saber que sobre abrir.
 */
export function ColeccionResumen({ resumen, edicion, onEdicion }: ColeccionResumenProps) {
  const { impresiones, cartas, copias, repetidas, porEdicion } = resumen;
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section
        aria-labelledby="coleccion-total"
        className="bg-panel border-line rounded-panel flex flex-col gap-4 border p-5"
      >
        <h2 id="coleccion-total" className="eyebrow">
          Tu colección
        </h2>
        <div>
          <p className="flex items-baseline gap-2">
            <span className="text-ink text-4xl font-bold tabular-nums">
              {porcentaje(impresiones)}%
            </span>
            <span className="text-muted text-[13px] tabular-nums">
              {impresiones.tengo} de {impresiones.total} impresiones
            </span>
          </p>
          <Barra avance={impresiones} className="mt-3 h-2" />
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {(
            [
              [`${cartas.tengo}/${cartas.total}`, "cartas distintas"],
              [copias, "copias en total"],
              [repetidas, "con más de 3 copias"],
            ] as const
          ).map(([n, texto]) => (
            <div
              key={texto}
              className="border-line bg-surface rounded-card flex flex-col-reverse justify-end border px-3 py-2.5"
            >
              <dt className="text-muted text-[12px] leading-snug">{texto}</dt>
              <dd className="text-ink text-lg font-bold tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="coleccion-ediciones"
        className="bg-panel border-line rounded-panel border p-5"
      >
        <h2 id="coleccion-ediciones" className="eyebrow">
          Por edición
        </h2>
        <p className="text-muted mt-1 text-[13px]">Toca una para ver solo sus cartas.</p>
        <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
          {porEdicion.map((e) => {
            const elegida = edicion === e.slug;
            return (
              <li key={e.slug}>
                <button
                  type="button"
                  onClick={() => onEdicion(e.slug)}
                  aria-pressed={elegida}
                  className={cn(
                    "rounded-chip focus-visible:outline-brand-500 -mx-2 flex w-[calc(100%+1rem)] flex-col gap-1.5 px-2 py-2 text-left transition-colors",
                    elegida ? "bg-accent-soft" : "hover:bg-surface",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3 text-[14px]">
                    <span
                      className={cn("truncate", elegida ? "text-accent" : "text-ink")}
                    >
                      {e.titulo}
                    </span>
                    <span className="text-muted shrink-0 text-[12px] tabular-nums">
                      {e.tengo} / {e.total}
                    </span>
                  </span>
                  <Barra avance={e} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
