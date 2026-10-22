import type { Metadata } from "next";

import { ComunidadView } from "@/components/nube/ComunidadView";

export const metadata: Metadata = {
  title: "Comunidad",
  description: "Barajas públicas de otros jugadores del formato Escuelas Elementales.",
};

export default function ComunidadPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Comunidad</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Barajas de la Comunidad</h1>
      <p className="text-muted mt-3 max-w-2xl leading-relaxed">
        Las barajas que otros jugadores publicaron. Ábrelas, guárdalas en las tuyas y, con
        cuenta, dales like.
      </p>
      <ComunidadView />
    </main>
  );
}
