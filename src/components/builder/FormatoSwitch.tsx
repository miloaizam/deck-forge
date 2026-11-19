import { DESCRIPCION_FORMATO, NOMBRE_FORMATO } from "@/lib/formatos";
import { FORMATOS, type Formato } from "@/lib/types";

import { Select } from "../Select";

/**
 * En que formato se juega la baraja: Estandar, VCR o Infanteria. Decide la
 * Banlist y las frecuencias que ofrece la grilla. Las cartas de la baraja no se
 * tocan al cambiarlo: lo que no entre en el nuevo lo marca el estado.
 */
export function FormatoSwitch({
  formato,
  onFormato,
}: {
  formato: Formato;
  onFormato: (f: Formato) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Select
        label="Formato"
        requerido
        value={formato}
        options={[...FORMATOS]}
        onChange={(v) => {
          const f = FORMATOS.find((x) => x === v);
          if (f) onFormato(f);
        }}
        format={(v) => NOMBRE_FORMATO[FORMATOS.find((x) => x === v) ?? "estandar"]}
      />
      <p className="text-muted text-[12px]">{DESCRIPCION_FORMATO[formato]}</p>
    </div>
  );
}
