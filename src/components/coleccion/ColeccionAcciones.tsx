"use client";

import { useState } from "react";
import { ClipboardList, ImageDown, Link2, Trash2 } from "lucide-react";

import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "../toast";
import {
  COLECCION_VACIA,
  estaVacia,
  saveColeccion,
  type Coleccion,
} from "@/lib/coleccion";
import { coleccionUrl } from "@/lib/coleccion-code";
import { BOTON_ICONO, HOVER_PELIGRO } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface ColeccionAccionesProps {
  coleccion: Coleccion;
  /**
   * Descarga la lista que se ve (con sus filtros) como imagen. `null` si en
   * esta pestana no hay imagen que dar: «Agregar cartas», o la lista vacia.
   */
  onImagen: (() => void) | null;
  /**
   * La lista que se ve como texto, con un nombre de archivo por si hay que
   * bajarla. `null` en las mismas pestanas que `onImagen`.
   */
  onLista: (() => { texto: string; archivo: string }) | null;
  /** La imagen se esta dibujando: con mil cartas tarda unos segundos. */
  generandoImagen?: boolean;
  /** Una coleccion compartida: solo se puede bajar su imagen. */
  soloLectura?: boolean;
}

/**
 * La imagen y el texto de la lista que se ve, el enlace para compartir la
 * coleccion y vaciarla. Llevarla a otro equipo es cosa de la cuenta.
 */
export function ColeccionAcciones({
  coleccion,
  onImagen,
  onLista,
  generandoImagen = false,
  soloLectura = false,
}: ColeccionAccionesProps) {
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

  // La lista como texto va al portapapeles, para pegarla en WhatsApp. Si el
  // navegador no deja copiar, se baja como .txt: algo tiene que salir.
  const copiarLista = async () => {
    const lista = onLista?.();
    if (!lista) return;
    try {
      await navigator.clipboard.writeText(lista.texto);
      toast("Lista copiada al portapapeles, lista para pegar en un chat.", "info");
    } catch {
      const blob = new Blob([lista.texto], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${lista.archivo}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast("No se pudo copiar la lista: se descargó como archivo de texto.", "info");
    }
  };

  // Iconos sin texto, con su nombre en el title y en aria-label: van en la
  // fila del buscador, a la derecha de «Filtros» (`acciones` de Filters).
  const imagen = (
    <button
      type="button"
      onClick={() => onImagen?.()}
      disabled={!onImagen || generandoImagen}
      aria-busy={generandoImagen}
      aria-label={
        generandoImagen ? "Generando la imagen…" : "Descargar la lista como imagen"
      }
      title="Descargar la lista que se ve como imagen"
      className={BOTON_ICONO}
    >
      <ImageDown
        size={16}
        aria-hidden="true"
        className={cn(generandoImagen && "animate-pulse motion-reduce:animate-none")}
      />
    </button>
  );
  const lista = (
    <button
      type="button"
      onClick={() => void copiarLista()}
      disabled={!onLista}
      aria-label="Copiar la lista como texto"
      title="Copiar la lista que se ve como texto, para pegarla en un chat"
      className={BOTON_ICONO}
    >
      <ClipboardList size={16} aria-hidden="true" />
    </button>
  );
  if (soloLectura) {
    return (
      <div className="flex shrink-0 gap-2">
        {imagen}
        {lista}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      {imagen}
      {lista}
      <button
        type="button"
        onClick={() => void compartir()}
        disabled={vacia}
        aria-label="Copiar enlace de la colección"
        title="Copiar enlace de la colección"
        className={BOTON_ICONO}
      >
        <Link2 size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => setVaciar(true)}
        disabled={vacia}
        aria-label="Vaciar la colección"
        title="Vaciar la colección"
        className={cn(BOTON_ICONO, HOVER_PELIGRO)}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>

      <ConfirmDialog
        open={vaciar}
        titulo="Vaciar la colección"
        mensaje="Se quitan todas las cartas marcadas, las que tienes y las que te faltan. No se puede deshacer."
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
