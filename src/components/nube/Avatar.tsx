"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

import { urlAvatar } from "@/lib/avatar";
import { SUPABASE_URL } from "@/lib/supabase-config";
import { cn } from "@/lib/utils";

interface AvatarProps {
  /** `<user_id>?v=<ms>` (`rutaAvatar` o lo que trae la Comunidad); null sin foto. */
  ruta: string | null;
  /** Lado en px: va en el `<img>` y en el circulo de la persona. */
  lado: number;
  /** El circulo cuando no hay foto: color de fondo y del icono. */
  className?: string;
}

/**
 * La foto de perfil en un circulo, o la persona de siempre si no hay foto o
 * no carga. Decorativa (`alt=""`): al lado siempre va el alias o el nombre.
 */
export function Avatar({ ruta, lado, className }: AvatarProps) {
  const url = urlAvatar(SUPABASE_URL, ruta);
  // La URL que fallo; una foto nueva trae otra URL y se vuelve a intentar.
  const [fallo, setFallo] = useState<string | null>(null);

  // Un <img> y no next/image: la foto vive en Storage de Supabase y ya va
  // achicada; sin servidor, next/image no aporta nada (`unoptimized`).
  if (url && url !== fallo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={lado}
        height={lado}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFallo(url)}
        className="bg-panel shrink-0 rounded-full object-cover"
        style={{ width: lado, height: lado }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-accent-soft text-accent grid shrink-0 place-items-center rounded-full",
        className,
      )}
      style={{ width: lado, height: lado }}
    >
      <UserRound size={Math.round(lado / 2)} />
    </span>
  );
}
