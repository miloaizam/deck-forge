import type { Metadata } from "next";

import { NovedadesTimeline } from "@/components/NovedadesTimeline";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Lo que ha cambiado en DeckForge, de lo más nuevo a lo más antiguo.",
};

export default function NovedadesPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Novedades</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Lo nuevo en DeckForge</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Los cambios que se notan al usar el sitio, del más reciente al más antiguo.
      </p>

      <NovedadesTimeline />
    </main>
  );
}
