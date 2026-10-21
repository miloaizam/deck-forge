import type { Metadata } from "next";

import { DeckListView } from "@/components/decks/DeckListView";

export const metadata: Metadata = {
  title: "Mis barajas",
  description: "Las barajas que guardaste en este navegador.",
};

export default function BarajasPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Barajas</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Mis barajas</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Tus barajas guardadas en este navegador. Compártelas por enlace o pásalas a otro
        equipo con un archivo de respaldo.
      </p>

      <div className="mt-10">
        <DeckListView />
      </div>
    </main>
  );
}
