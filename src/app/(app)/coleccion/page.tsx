import type { Metadata } from "next";

import { ColeccionView } from "@/components/coleccion/ColeccionView";
import { getCards } from "@/lib/cards";

export const metadata: Metadata = {
  title: "Colección",
  description:
    "Lleva la lista de las cartas de Mitos y Leyendas que tienes y de las que te faltan.",
};

export default async function ColeccionPage() {
  const cards = await getCards();

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Colección</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Mi colección</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Las cartas que tienes y las que te faltan para conseguir. Búscalas en «Agregar
        cartas» y márcalas: se guardan en este navegador, y con un respaldo las pasas a
        otro equipo.
      </p>

      <div className="mt-10">
        <ColeccionView cards={cards} />
      </div>
    </main>
  );
}
