"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Layers } from "lucide-react";

import { BotonGoogle, CrearCuenta } from "./BotonGoogle";
import { iniciarNube } from "./nube";
import { useConCuenta } from "./use-con-cuenta";
import { NUBE_ACTIVA } from "@/lib/supabase-config";
import { BOTON_SECUNDARIO } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * La cuenta en la portada, bajo «Entrar a la forja»: «Iniciar sesión con
 * Google» y «¿No tienes cuenta? Crea una aquí» sin sesion, y un atajo a Mis
 * barajas con ella. La portada no tiene navbar, asi que arranca la cuenta
 * aqui. Con las cuentas apagadas no pinta nada.
 *
 * Mientras se sabe si hay sesion deja el hueco del boton, para que la
 * portada no salte cuando aparece.
 */
export function PortadaCuenta() {
  const conCuenta = useConCuenta();

  useEffect(() => {
    iniciarNube();
  }, []);

  if (!NUBE_ACTIVA) return null;

  return (
    <div className="mt-6 flex min-h-11 flex-col items-center gap-2">
      {conCuenta ? (
        <Link href="/barajas" className={cn(BOTON_SECUNDARIO, "bg-surface text-ink")}>
          <Layers size={16} aria-hidden="true" />
          Ir a mis barajas
        </Link>
      ) : (
        <>
          <BotonGoogle />
          <CrearCuenta />
        </>
      )}
    </div>
  );
}
