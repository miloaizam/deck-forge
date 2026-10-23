"use client";

import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";

import { toast } from "../toast";
import { FotoNoValida, achicarAvatar } from "./achicar-avatar";
import { mensajeDeError } from "./api";
import { quitarAvatar, subirAvatar } from "./nube";
import { BOTON_SECUNDARIO_COMPACTO, HOVER_PELIGRO } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface FotoControlesProps {
  /** Sin alias no hay foto: los dos viven en la misma fila del perfil. */
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

  if (!conAlias) {
    return <p className="text-muted text-[13px]">Elige un alias para poner una foto.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={ocupado}
        aria-busy={ocupado}
        className={BOTON_SECUNDARIO_COMPACTO}
      >
        <ImageUp size={14} aria-hidden="true" />
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
          className={cn(BOTON_SECUNDARIO_COMPACTO, HOVER_PELIGRO)}
        >
          <Trash2 size={14} aria-hidden="true" />
          Quitar foto
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
