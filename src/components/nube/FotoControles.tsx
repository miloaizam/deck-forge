"use client";

import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";

import { toast } from "../toast";
import { FotoNoValida, achicarAvatar } from "./achicar-avatar";
import { mensajeDeError } from "./api";
import { quitarAvatar, subirAvatar } from "./nube";
import { BOTON_ICONO, BOTON_SECUNDARIO, HOVER_PELIGRO } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface FotoControlesProps {
  /** Sin alias no hay foto. */
  conAlias: boolean;
  conFoto: boolean;
}

/**
 * «Poner foto» / «Cambiar foto» y «Quitar foto», en la cabecera de /cuenta.
 * La foto se achica en el navegador (`achicar-avatar.ts`) antes de subirla.
 */
export function FotoControles({ conAlias, conFoto }: FotoControlesProps) {
  const input = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);

  const subir = async (archivo: File) => {
    setOcupado(true);
    try {
      await subirAvatar(await achicarAvatar(archivo));
      toast("Foto de perfil guardada.", "success");
    } catch (e) {
      toast(
        e instanceof FotoNoValida
          ? e.message
          : `No se pudo guardar la foto. ${mensajeDeError(e)}`,
        "warning",
      );
    } finally {
      setOcupado(false);
    }
  };

  // Sin alias no hay foto; «Tu cuenta» lo dice bajo el nombre.
  if (!conAlias) return null;

  return (
    // «Quitar foto» va solo con su icono (y su nombre para el lector): con
    // texto, los tres botones del pie de «Tu cuenta» no cabian en una fila.
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={ocupado}
        aria-busy={ocupado}
        className={BOTON_SECUNDARIO}
      >
        <ImageUp size={16} aria-hidden="true" />
        {ocupado ? "Guardando…" : conFoto ? "Cambiar foto" : "Poner foto"}
      </button>
      {conFoto && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            setOcupado(true);
            quitarAvatar()
              .then(
                () => toast("Foto de perfil quitada.", "delete"),
                (e: unknown) =>
                  toast(`No se pudo quitar la foto. ${mensajeDeError(e)}`, "warning"),
              )
              .finally(() => setOcupado(false));
          }}
          aria-label="Quitar foto"
          title="Quitar foto"
          className={cn(BOTON_ICONO, HOVER_PELIGRO)}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        // sr-only y no hidden: sigue en el arbol de accesibilidad con su nombre.
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir una foto de perfil"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (archivo) void subir(archivo);
        }}
      />
    </div>
  );
}
