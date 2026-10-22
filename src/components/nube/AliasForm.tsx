"use client";

import { useId, useState } from "react";

import { toast } from "../toast";
import { ALIAS_VALIDO, guardarAlias } from "./nube";
import { BOTON_PRIMARIO_COMPACTO, TEXT_FIELD } from "@/lib/ui";
import { cn } from "@/lib/utils";

const ERRORES = {
  invalido: "De 3 a 20 letras, números o guion bajo, sin espacios.",
  ocupado: "Ese alias ya lo usa otra persona.",
  error: "No se pudo guardar el alias. Intenta de nuevo.",
} as const;

interface AliasFormProps {
  actual: string | null;
  /** Tras guardarlo bien. El diálogo de publicar lo usa para seguir. */
  onGuardado?: (alias: string) => void;
}

/**
 * El alias publico: el nombre con que se firman las barajas en la Comunidad.
 * Lo usan `/cuenta` y el dialogo que lo pide antes de publicar la primera.
 */
export function AliasForm({ actual, onGuardado }: AliasFormProps) {
  const id = useId();
  const [valor, setValor] = useState(actual ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambio = valor.trim() !== (actual ?? "");

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ALIAS_VALIDO.test(valor.trim())) {
          setError(ERRORES.invalido);
          return;
        }
        setGuardando(true);
        void guardarAlias(valor).then((r) => {
          setGuardando(false);
          if (r === "ok") {
            setError(null);
            toast(`Alias guardado: ${valor.trim()}.`, "success");
            onGuardado?.(valor.trim());
          } else {
            setError(ERRORES[r]);
          }
        });
      }}
    >
      <label htmlFor={id} className="text-muted text-[12px]">
        Alias público (firma tus barajas en la Comunidad)
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setError(null);
          }}
          maxLength={20}
          autoComplete="nickname"
          spellCheck={false}
          placeholder="Tu alias"
          aria-invalid={error !== null}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(TEXT_FIELD, "h-9 flex-1")}
        />
        <button
          type="submit"
          disabled={guardando || !cambio}
          className={cn(BOTON_PRIMARIO_COMPACTO, "disabled:opacity-50")}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-warning text-[13px]">
          {error}
        </p>
      )}
    </form>
  );
}
