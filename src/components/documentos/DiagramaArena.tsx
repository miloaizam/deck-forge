import { cn } from "@/lib/utils";

/**
 * La Arena de juego (seccion 3 del DAR), con la disposicion del original:
 * Cementerio y Destierro a la izquierda, los Oros y el Castillo al medio y las
 * tres Lineas a la derecha. Cada zona lleva a su apartado. Las zonas dentro
 * del juego van con borde lleno y las de fuera con borde punteado, que es la
 * division que hace la propia seccion.
 */
const ZONAS: { id: string; nombre: string; dentro: boolean; celda: string }[] = [
  { id: "3.3", nombre: "Oro Pagado", dentro: true, celda: "col-start-2 row-start-1" },
  {
    id: "3.5",
    nombre: "Línea de Ataque",
    dentro: true,
    celda: "col-start-3 row-start-1",
  },
  { id: "3.7", nombre: "Cementerio", dentro: false, celda: "col-start-1 row-start-2" },
  { id: "3.1", nombre: "Mazo Castillo", dentro: false, celda: "col-start-2 row-start-2" },
  {
    id: "3.4",
    nombre: "Línea de Defensa",
    dentro: true,
    celda: "col-start-3 row-start-2",
  },
  { id: "3.8", nombre: "Destierro", dentro: false, celda: "col-start-1 row-start-3" },
  { id: "3.2", nombre: "Reserva de Oro", dentro: true, celda: "col-start-2 row-start-3" },
  { id: "3.6", nombre: "Línea de Apoyo", dentro: true, celda: "col-start-3 row-start-3" },
];

export function DiagramaArena() {
  return (
    <figure className="my-6">
      <div className="bg-surface border-line rounded-panel border p-3 sm:p-4">
        <ul className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] grid-rows-[repeat(3,minmax(4.5rem,auto))] gap-2 sm:gap-3">
          {ZONAS.map((z) => (
            <li key={z.id} className={cn("flex", z.celda)}>
              <a
                href={`#${z.id}`}
                className={cn(
                  "rounded-card flex flex-1 items-center justify-center px-2 py-3 text-center text-[12px] leading-tight font-semibold transition-colors sm:text-[14px]",
                  "hover:outline-brand-500 hover:outline-2 hover:outline-offset-2",
                  z.dentro
                    ? "border-brand-500/60 bg-accent-soft text-ink border"
                    : "border-line text-muted hover:text-ink border border-dashed",
                )}
              >
                {z.nombre}
              </a>
            </li>
          ))}
          <li
            aria-hidden="true"
            className="text-accent col-start-1 row-start-1 flex items-center px-1 text-[11px] font-semibold tracking-[0.18em] uppercase sm:text-[12px]"
          >
            Arena de juego
          </li>
        </ul>
      </div>
      <figcaption className="text-muted mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="border-brand-500/60 bg-accent-soft inline-block size-3.5 rounded-[4px] border"
          />
          Dentro del juego
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="border-line inline-block size-3.5 rounded-[4px] border border-dashed"
          />
          Fuera del juego (la Mano también)
        </span>
      </figcaption>
    </figure>
  );
}
