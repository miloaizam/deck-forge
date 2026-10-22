"use client";

import { useHydrated } from "../decks/use-decks";
import { useNube } from "./nube";
import { SESION_KEY } from "@/lib/supabase-config";

/** Si hay una sesion guardada en este navegador (sin cargar `auth-js`). */
export function haySesionGuardada(): boolean {
  try {
    return localStorage.getItem(SESION_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Si se muestra lo personal: el constructor, Mis barajas y la coleccion. Con
 * las cuentas apagadas, siempre; encendidas, con sesion. Mientras se sabe, una
 * sesion guardada ya cuenta: asi quien entro no ve la navbar ni la pagina
 * cambiar al cargar. En el servidor y al hidratar no hay sesion que mirar.
 */
export function useConCuenta(): boolean {
  const nube = useNube();
  const hidratado = useHydrated();
  if (nube.fase === "apagada" || nube.fase === "con-sesion") return true;
  return nube.fase === "cargando" && hidratado && haySesionGuardada();
}
