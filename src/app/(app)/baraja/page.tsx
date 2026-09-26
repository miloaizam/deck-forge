import { Suspense } from "react";
import type { Metadata } from "next";

import { DeckDetailView } from "@/components/decks/DeckDetailView";
import { getCards } from "@/lib/cards";

export const metadata: Metadata = {
  title: "Baraja",
  description: "Detalle de una baraja del formato Escuelas Elementales.",
  // Una baraja compartida es contenido de un usuario, no del sitio.
  robots: { index: false, follow: true },
};

/**
 * Detalle de una baraja: `?m=` una guardada, `?d=` una compartida por enlace.
 *
 * Va en singular y con query string porque `output: "export"` no admite una
 * ruta dinamica `/barajas/[id]` para datos del usuario: generateStaticParams no
 * puede conocer ids que se inventan en el navegador.
 *
 * El titulo lo pone la isla, no la pagina: es el nombre de la baraja, y ese solo se
 * conoce en el navegador.
 */
export default async function BarajaPage() {
  const cards = await getCards();

  return (
    // 1480 es el ancho de toda la web: aqui sale de que a diez cartas por fila
    // deja la carta en 132px, que es donde se reconoce sin abrirla.
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      {/* Toda la pagina depende del parametro, asi que el limite va afuera. */}
      <Suspense
        fallback={
          <div aria-hidden="true" className="flex flex-col gap-4">
            <div className="border-line rounded-panel h-24 animate-pulse border" />
            <div className="border-line rounded-panel h-72 animate-pulse border" />
          </div>
        }
      >
        <DeckDetailView cards={cards} />
      </Suspense>
    </main>
  );
}
