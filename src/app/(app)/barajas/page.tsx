import type { Metadata } from "next";

import { DeckListView } from "@/components/decks/DeckListView";
import { getCards } from "@/lib/cards";

export const metadata: Metadata = {
  title: "Mis barajas",
  description: "Las barajas que guardaste en este navegador.",
};

export default async function BarajasPage() {
  const cards = await getCards();

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Barajas</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Mis barajas</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Puedes visualizar las barajas, compartirlas por un enlace y
        exportarlas/importarlas utilizando un archivo JSON.
      </p>

      <div className="mt-10">
        <DeckListView cards={cards} />
      </div>
    </main>
  );
}
