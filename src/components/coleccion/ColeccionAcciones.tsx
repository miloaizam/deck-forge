"use client";

import { useRef, useState } from "react";
import { ClipboardCopy, Download, Trash2, Upload } from "lucide-react";

import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "../toast";
import {
  exportarColeccion,
  fusionar,
  importarColeccion,
  saveColeccion,
  type Coleccion,
} from "@/lib/coleccion";

interface ColeccionAccionesProps {
  coleccion: Coleccion;
  /** El texto de la lista que se ve, con sus filtros. */
  lista: () => string;
  /** Cuantas cartas tiene la lista que se ve: sin ninguna no hay que copiar. */
  enLista: number;
}

const BOTON =
  "inline-flex h-10 items-center gap-1.5 rounded-chip border border-line px-3.5 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50";

/** Mas que esto no es un respaldo de coleccion. */
const MAX_ARCHIVO = 1024 * 1024;

/**
 * Copiar la lista que se ve, llevarse la coleccion a otro navegador y
 * vaciarla. El respaldo se arma con un Blob, como el de las barajas: no sale
 * nada del navegador.
 */
export function ColeccionAcciones({ coleccion, lista, enLista }: ColeccionAccionesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [vaciar, setVaciar] = useState(false);
  const vacia = Object.keys(coleccion).length === 0;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(lista());
      toast("Lista copiada al portapapeles.", "info");
    } catch {
      toast("No se pudo copiar la lista. Revisa los permisos del navegador.", "warning");
    }
  };

  const exportar = () => {
    const blob = new Blob([exportarColeccion(coleccion)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deckforge-coleccion-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Colección exportada a un archivo.", "info");
  };

  const importar = async (file: File) => {
    if (file.size > MAX_ARCHIVO) {
      toast(
        "El archivo es demasiado grande para ser un respaldo de colección.",
        "warning",
      );
      return;
    }
    const leido = importarColeccion(await file.text());
    if (!leido) {
      toast("El archivo no es un respaldo de colección de DeckForge.", "warning");
      return;
    }
    const nuevas = Object.keys(leido.cartas).filter((id) => !(id in coleccion)).length;
    if (!saveColeccion(fusionar(coleccion, leido.cartas))) {
      toast(
        "No se pudo guardar la colección: el almacenamiento del navegador está lleno.",
        "warning",
      );
      return;
    }
    const partes = [
      nuevas === 1
        ? "Colección importada: 1 impresión nueva."
        : `Colección importada: ${nuevas} impresiones nuevas.`,
    ];
    if (leido.descartadas > 0) {
      partes.push(
        leido.descartadas === 1
          ? "1 entrada se descartó por estar dañada."
          : `${leido.descartadas} entradas se descartaron por estar dañadas.`,
      );
    }
    toast(partes.join(" "), "success");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copiar} disabled={enLista === 0} className={BOTON}>
        <ClipboardCopy size={15} aria-hidden="true" />
        Copiar lista
      </button>
      <button type="button" onClick={exportar} disabled={vacia} className={BOTON}>
        <Download size={15} aria-hidden="true" />
        Exportar
      </button>
      <button type="button" onClick={() => inputRef.current?.click()} className={BOTON}>
        <Upload size={15} aria-hidden="true" />
        Importar
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importar(file);
        }}
      />
      <button
        type="button"
        onClick={() => setVaciar(true)}
        disabled={vacia}
        aria-label="Vaciar la colección"
        title="Vaciar la colección"
        className={BOTON}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>

      <ConfirmDialog
        open={vaciar}
        titulo="Vaciar la colección"
        mensaje="Se quitan todas las cartas marcadas. Si quieres conservarlas, exporta antes un respaldo."
        confirmar="Vaciar"
        onCancel={() => setVaciar(false)}
        onConfirm={() => {
          setVaciar(false);
          if (saveColeccion({})) toast("Colección vaciada.", "delete");
        }}
      />
    </div>
  );
}
