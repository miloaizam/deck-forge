"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleUser } from "lucide-react";

import { NUBE_ACTIVA } from "@/lib/supabase-config";
import { BOTON_ICONO_LIBRE } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { iniciarNube, useNube } from "./nube";

/**
 * La cuenta en la navbar, junto a la ayuda y el tema: un icono de persona sin
 * sesion y la inicial del alias (o del nombre) con ella. Lleva a /cuenta.
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
  const inicial = conSesion
    ? (nube.alias ?? nube.usuario.nombre ?? nube.usuario.email ?? "?")
        .charAt(0)
        .toUpperCase()
    : null;
  const etiqueta = conSesion ? "Tu cuenta" : "Iniciar sesión";

  return (
    <Link
      href="/cuenta"
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(BOTON_ICONO_LIBRE, "rounded-full")}
    >
      {inicial ? (
        <span
          aria-hidden="true"
          className="bg-brand-600 inline-flex size-7 items-center justify-center rounded-full text-[13px] font-semibold text-white"
        >
          {inicial}
        </span>
      ) : (
        <CircleUser size={18} aria-hidden="true" />
      )}
    </Link>
  );
}
