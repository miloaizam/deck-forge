import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { spaceGrotesk } from "@/lib/fonts";
import { DECKS_KEY } from "@/lib/deck-storage";
import { THEME_KEY } from "@/lib/theme";
import "./globals.css";

/**
 * Donde se publica el sitio. Las vistas previas de WhatsApp, Discord y compania
 * piden la imagen con URL ABSOLUTA, y Next la arma a partir de esto; sin
 * metadataBase la escribiria relativa y la vista previa saldria sin imagen.
 * Si el sitio cambia de dominio, se cambia aqui.
 */
const SITE_URL = "https://deckforge-myl.pages.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DeckForge",
    template: "%s · DeckForge",
  },
  description:
    "Constructor de barajas para el formato Escuelas Elementales de Mitos y Leyendas.",
  applicationName: "DeckForge",
  icons: { icon: "/brand/icon-violet.svg" },
  openGraph: {
    title: "DeckForge",
    description:
      "Constructor de barajas para el formato Escuelas Elementales de Mitos y Leyendas.",
    siteName: "DeckForge",
    locale: "es_CL",
    type: "website",
    // La imagen la pone src/app/opengraph-image.jpg (plantilla en
    // docs/og-image.html), y vale para todas las rutas.
  },
  // Tarjeta grande en X/Twitter; sin twitter:image propia, toma la de og.
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0D0B14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="bg-bg text-ink flex min-h-full flex-col">
        {/* Aplica el tema guardado antes del primer pintado, para que la
            pagina no aparezca oscura y salte a clara. */}
        <Script id="tema" strategy="beforeInteractive">
          {`try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="light")document.documentElement.dataset.theme="light"}catch(e){}` +
            // Si no hay barajas guardadas, Mis barajas pinta su aviso de
            // vacio desde el HTML en vez del esqueleto (globals.css). Lee el
            // sobre como `parseDecks`: `{ mazos: [...] }` o un arreglo suelto.
            `try{var m=JSON.parse(localStorage.getItem(${JSON.stringify(DECKS_KEY)})||"null");var l=Array.isArray(m)?m:m&&m.mazos;if(!Array.isArray(l)||!l.length)document.documentElement.dataset.barajas="0"}catch(e){}`}
        </Script>
        {children}
        {/* El texto va en el mismo ancho que <main> (1480 px): a pantalla
            completa quedaba pegado al borde con el contenido centrado. */}
        <footer className="border-line text-muted w-full border-t text-[13px] leading-relaxed">
          <p className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6">
            Proyecto sin fines de lucro hecho por un fan y jugador de Mitos y Leyendas. El
            arte y los nombres de las cartas son propiedad de su editor.
          </p>
        </footer>
      </body>
    </html>
  );
}
