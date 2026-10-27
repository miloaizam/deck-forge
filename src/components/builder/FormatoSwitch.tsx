import { DESCRIPCION_FORMATO, NOMBRE_FORMATO } from "@/lib/formatos";
import { FORMATOS, type Formato } from "@/lib/types";
import { SEGMENTO, SEGMENTO_ACTIVO, SEGMENTO_INACTIVO, SEGMENTOS } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * En que formato se juega la baraja: Estandar, VCR o Infanteria. Decide la
 * Banlist y las frecuencias que ofrece la grilla. Las cartas de la baraja no se
 * tocan al cambiarlo: lo que no entre en el nuevo lo marca el estado.
 */
export function FormatoSwitch({
  formato,
  onFormato,
  id,
}: {
  formato: Formato;
  onFormato: (f: Formato) => void;
  /** Hay dos (el panel y la hoja del telefono): cada uno con su id. */
  id: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-muted text-[12px]">
        Formato
      </span>
      <div role="group" aria-labelledby={id} className={cn(SEGMENTOS, "w-full")}>
        {FORMATOS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFormato(f)}
            aria-pressed={formato === f}
            className={cn(
              SEGMENTO,
              "flex-1 justify-center",
              formato === f ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO,
            )}
          >
            {NOMBRE_FORMATO[f]}
          </button>
        ))}
      </div>
      <p className="text-muted text-[12px]">{DESCRIPCION_FORMATO[formato]}</p>
    </div>
  );
}
