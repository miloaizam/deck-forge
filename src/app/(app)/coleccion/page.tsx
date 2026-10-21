import type { Metadata } from "next";

import { ColeccionView } from "@/components/coleccion/ColeccionView";

export const metadata: Metadata = {
  title: "Colección",
  description:
    "Lleva la lista de las cartas de Mitos y Leyendas que tienes y de las que te faltan.",
};

export default function ColeccionPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Colección</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Mi colección</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Las cartas que tienes y las que te faltan para conseguir.
      </p>

      <div className="mt-10">
        <ColeccionView />
      </div>
    </main>
  );
}
