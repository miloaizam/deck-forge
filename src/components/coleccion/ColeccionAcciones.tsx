"use client";

import { useRef, useState } from "react";
import { Download, ImageDown, Link2, Trash2, Upload } from "lucide-react";

import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "../toast";
import {
  COLECCION_VACIA,
  exportarColeccion,
  fusionar,
  importarColeccion,
  estaVacia,
  saveColeccion,
  type Coleccion,
} from "@/lib/coleccion";
import { coleccionUrl } from "@/lib/coleccion-code";
import { HOVER_PELIGRO } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface ColeccionAccionesProps {
  coleccion: Coleccion;
  /**
   * Descarga la lista que se ve (con sus filtros) como imagen. `null` si en
   * esta pestana no hay imagen que dar: «Agregar cartas», o la lista vacia.
   */
  onImagen: (() => void) | null;
  /** Una coleccion compartida: solo se puede bajar su imagen. */
  soloLectura?: boolean;
}

const BOTON =
  "inline-flex h-10 items-center gap-1.5 rounded-chip border border-line px-3.5 text-[13px] text-muted transition-colors hover:outline-2 hover:outline-offset-2 hover:outline-brand-500 hover:text-ink focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50";

/** Mas que esto no es un respaldo de coleccion. */
const MAX_ARCHIVO = 1024 * 1024;

/**
 * La imagen de la lista que se ve, el enlace para compartir la coleccion,
 * llevarsela a otro navegador y vaciarla. El respaldo se arma con un Blob, como el de las barajas: no sale
 * nada del navegador.
 */
export function ColeccionAcciones({
  coleccion,
  onImagen,
  soloLectura = false,
}: ColeccionAccionesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [vaciar, setVaciar] = useState(false);
  const vacia = estaVacia(coleccion);

  // El enlace lleva la coleccion entera, las dos listas: quien lo abre ve lo
  // que tienes y lo que te falta, que es lo que hace falta para un cambio.
  const compartir = async () => {
    try {
      await navigator.clipboard.writeText(
        coleccionUrl(coleccion, window.location.origin),
      );
      toast("Enlace de la colección copiado al portapapeles.", "info");
    } catch {
      toast("No se pudo copiar el enlace. Revisa los permisos del navegador.", "warning");
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
    const nuevas =
      Object.keys(leido.coleccion.tengo).filter((id) => !(id in coleccion.tengo)).length +
      Object.keys(leido.coleccion.quiero).filter((id) => !(id in coleccion.quiero))
        .length;
    if (!saveColeccion(fusionar(coleccion, leido.coleccion))) {
      toast(
        "No se pudo guardar la colección: el almacenamiento del navegador está lleno.",
        "warning",
      );
      return;
    }
    const partes = [
      nuevas === 1
        ? "Colección importada: 1 carta nueva."
        : `Colección importada: ${nuevas} cartas nuevas.`,
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

  const imagen = (
    <button
      type="button"
      onClick={() => onImagen?.()}
      disabled={!onImagen}
      title="Descargar la lista que se ve como imagen"
      className={BOTON}
    >
      <ImageDown size={15} aria-hidden="true" />
      Imagen
    </button>
  );
  if (soloLectura) return <div className="flex flex-wrap gap-2">{imagen}</div>;

  return (
    <div className="flex flex-wrap gap-2">
      {imagen}
      <button
        type="button"
        onClick={() => void compartir()}
        disabled={vacia}
        className={BOTON}
      >
        <Link2 size={15} aria-hidden="true" />
        Compartir
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
        className={cn(BOTON, HOVER_PELIGRO)}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>

      <ConfirmDialog
        open={vaciar}
        titulo="Vaciar la colección"
        mensaje="Se quitan todas las cartas marcadas, las que tienes y las que te faltan. Si quieres conservarlas, exporta antes un respaldo."
        confirmar="Vaciar"
        onCancel={() => setVaciar(false)}
        onConfirm={() => {
          setVaciar(false);
          if (saveColeccion(COLECCION_VACIA)) toast("Colección vaciada.", "delete");
        }}
      />
    </div>
  );
}
