"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

import { toast, type ToastTone } from "../toast";
import { exportFile, importFile } from "@/lib/deck-code";
import { MAX_BARAJAS, type MergeResult } from "@/lib/deck-storage";
import type { Deck } from "@/lib/types";

/** Lo que paso al importar: cuantas entraron y si se pudo escribir. */
export interface ImportOutcome extends MergeResult {
  guardado: boolean;
}

interface DeckTransferProps {
  decks: Deck[];
  onImport: (barajas: Deck[]) => ImportOutcome;
}

const contarBarajas = (n: number) => `${n} ${n === 1 ? "baraja" : "barajas"}`;

/**
 * Se dice la verdad completa: cuantas entraron, cuantas se cayeron por estar rotas
 * y cuantas no cupieron. Antes decia "Importaste 50" aunque esas 50 hubieran
 * desplazado a las que ya tenias.
 */
function mensajeImportacion(r: ImportOutcome, descartados: number): [string, ToastTone] {
  if (!r.guardado) {
    return [
      "No pude guardar las barajas. Puede que el navegador no tenga espacio.",
      "error",
    ];
  }
  if (r.entraron === 0) {
    return [
      `No cabe ninguna: ya tienes ${MAX_BARAJAS} barajas, el máximo. Borra alguna para importar.`,
      "error",
    ];
  }
  const partes = [`Importaste ${contarBarajas(r.entraron)}.`];
  if (descartados > 0) partes.push(`Descarté ${descartados} por estar dañadas.`);
  if (r.sobraron > 0) {
    const verbo = r.sobraron === 1 ? "no cupo" : "no cupieron";
    partes.push(`${contarBarajas(r.sobraron)} ${verbo}: el máximo es ${MAX_BARAJAS}.`);
  }
  return [partes.join(" "), "ok"];
}

const BOTON =
  "inline-flex h-11 items-center gap-1.5 rounded-chip border border-line px-4 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

/** Mas de esto no es un respaldo de barajas, es otra cosa. */
const MAX_ARCHIVO = 1024 * 1024;

/**
 * Llevarse las barajas a otro navegador y traerlas de vuelta.
 *
 * Todo pasa en el navegador: el archivo se arma con un Blob y se baja con un
 * <a download>, sin que nada salga del origen. No se usa un data: URI porque
 * varios navegadores los bloquean para descargas.
 */
export function DeckTransfer({ decks, onImport }: DeckTransferProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);

  const exportar = () => {
    const blob = new Blob([exportFile(decks)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deckforge-barajas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exporté ${contarBarajas(decks.length)} a un archivo.`);
  };

  const importar = async (file: File) => {
    setOcupado(true);
    try {
      if (file.size > MAX_ARCHIVO) {
        toast(
          "Ese archivo es demasiado grande para ser un respaldo de barajas.",
          "error",
        );
        return;
      }

      const resultado = importFile(await file.text());
      if (!resultado) {
        toast("Ese archivo no es un respaldo de DeckForge.", "error");
        return;
      }
      if (resultado.barajas.length === 0) {
        toast("No pude leer ninguna baraja de ese archivo.", "error");
        return;
      }

      toast(...mensajeImportacion(onImport(resultado.barajas), resultado.descartados));
    } catch {
      toast("No pude leer ese archivo.", "error");
    } finally {
      setOcupado(false);
      // Se limpia el input para poder volver a elegir el mismo archivo.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={exportar}
        disabled={decks.length === 0}
        className={`${BOTON} disabled:pointer-events-none disabled:opacity-40`}
      >
        <Download size={14} aria-hidden="true" />
        Exportar todo
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={ocupado}
        className={`${BOTON} disabled:pointer-events-none disabled:opacity-40`}
      >
        <Upload size={14} aria-hidden="true" />
        Importar
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importar(file);
        }}
        className="sr-only"
        aria-label="Elegir un archivo de barajas para importar"
      />
    </div>
  );
}
