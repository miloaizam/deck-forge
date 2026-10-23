"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LogIn } from "lucide-react";

import { rutaAvatar } from "@/lib/avatar";
import { NUBE_ACTIVA } from "@/lib/supabase-config";
import { BOTON_ICONO_LIBRE } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { iniciarNube, useNube } from "./nube";

/**
 * La cuenta en la navbar, junto a la ayuda y el tema: una flecha de entrar sin
 * sesion y, con ella, la foto de perfil o una persona sobre violeta. Lleva a
 * /cuenta.
 *
 * Es tambien quien arranca la cuenta en cada pagina (`iniciarNube`): esta en
 * la navbar, que esta en todas las de (app). Con la nube apagada no pinta
 * nada.
 */
export function AccountButton() {
  const nube = useNube();

  useEffect(() => {
    iniciarNube();
  }, []);

  if (!NUBE_ACTIVA) return null;

  const conSesion = nube.fase === "con-sesion";
  const etiqueta = conSesion ? "Tu cuenta" : "Iniciar sesión";

  return (
    <Link
      href="/cuenta"
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(BOTON_ICONO_LIBRE, "rounded-full")}
    >
      {conSesion ? (
        <Avatar
          ruta={rutaAvatar(nube.usuario.id, nube.avatar)}
          lado={28}
          className="bg-brand-600 text-white"
        />
      ) : (
        <LogIn size={18} aria-hidden="true" />
      )}
    </Link>
  );
}
