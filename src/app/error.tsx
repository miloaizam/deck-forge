"use client";

import Link from "next/link";
import { House, RotateCw } from "lucide-react";

import { ErrorScreen } from "@/components/ErrorScreen";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";

/**
 * 500. Atrapa lo que reviente al pintar cualquier pagina. No atrapa el layout
 * raiz: de eso se encarga global-error.tsx.
 *
 * Los error boundaries tienen que ser de cliente, y un componente de cliente
 * no puede exportar `metadata`: el titulo va con <title>, que React 19 sube
 * solo al <head>.
 */
export default function Error({ retry }: { retry: () => void }) {
  return (
    <>
      <title>Algo falló · DeckForge</title>
      <ErrorScreen code={500}>
        <button type="button" onClick={() => retry()} className={PRIMARY_BUTTON}>
          <RotateCw size={19} aria-hidden="true" />
          Reintentar
        </button>
        <Link href="/" className={SECONDARY_BUTTON}>
          <House size={19} aria-hidden="true" />
          Volver al inicio
        </Link>
      </ErrorScreen>
    </>
  );
}
