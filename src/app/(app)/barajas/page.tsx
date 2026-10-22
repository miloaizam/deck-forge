import type { Metadata } from "next";

import { DeckListView } from "@/components/decks/DeckListView";
import { RequiereCuenta } from "@/components/nube/RequiereCuenta";
import { DeckListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Mis barajas",
  description: "Las barajas que guardaste en tu cuenta.",
};

export default function BarajasPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Barajas</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Mis barajas</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Tus barajas guardadas en tu cuenta. Compártelas por enlace o déjalas públicas para
        que se vean en la Comunidad.
      </p>

      <div className="mt-10">
        <RequiereCuenta para="ver tus barajas" esqueleto={<DeckListSkeleton />}>
          <DeckListView />
        </RequiereCuenta>
      </div>
    </main>
  );
}
