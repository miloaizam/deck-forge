"use client";

import { useEffect } from "react";
import { House, RotateCw } from "lucide-react";

import { ErrorScreen } from "@/components/ErrorScreen";
import { spaceGrotesk } from "@/lib/fonts";
import { THEME_KEY } from "@/lib/theme";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";
import "./globals.css";

/**
 * 500 cuando el que falla es el propio layout raiz. Reemplaza al layout
 * entero, asi que trae su propio <html>, los estilos, la fuente y el tema: sin
 * ellos saldria una pagina en blanco con la tipografia del sistema.
 *
 * "Volver al inicio" es un <a> y no un <Link>: si el layout esta roto, la
 * navegacion del cliente volveria a pintarlo. Una carga completa arranca de
 * cero.
 */
export default function GlobalError({ retry }: { retry: () => void }) {
  // El script inline del layout no llega hasta aqui: el tema guardado se
  // aplica al montar. localStorage puede fallar y no debe tumbar esto tambien.
  useEffect(() => {
    try {
      if (localStorage.getItem(THEME_KEY) === "light") {
        document.documentElement.dataset.theme = "light";
      }
    } catch {
      /* se queda el tema oscuro */
    }
  }, []);

  return (
    <html lang="es" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="bg-bg text-ink flex min-h-full flex-col">
        <title>Algo falló · DeckForge</title>
        <ErrorScreen code={500}>
          <button type="button" onClick={() => retry()} className={PRIMARY_BUTTON}>
            <RotateCw size={19} aria-hidden="true" />
            Reintentar
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ver arriba: se busca la carga completa */}
          <a href="/" className={SECONDARY_BUTTON}>
            <House size={19} aria-hidden="true" />
            Volver al inicio
          </a>
        </ErrorScreen>
      </body>
    </html>
  );
}
