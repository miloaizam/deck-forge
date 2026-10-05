import type { Metadata } from "next";

import { ColeccionView } from "@/components/coleccion/ColeccionView";
import { getCards } from "@/lib/cards";

export const metadata: Metadata = {
  title: "Colección",
  description:
    "Marca las cartas de Mitos y Leyendas que tienes y mira cuáles te faltan, edición por edición.",
};

export default async function ColeccionPage() {
  const cards = await getCards();

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Colección</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Mi colección</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Marca las cartas que tienes y mira cuáles te faltan, por edición y por tipo. Cada
        arte cuenta aparte. Se guarda en este navegador; con un respaldo la pasas a otro
        equipo.
      </p>

      <div className="mt-10">
        <ColeccionView cards={cards} />
      </div>
    </main>
  );
}
