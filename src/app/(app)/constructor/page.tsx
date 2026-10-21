import type { Metadata } from "next";

import { BuilderView } from "@/components/builder/BuilderView";
import { getCatalogPage } from "@/lib/cards";
import { PAGE_SIZE_BUILDER } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Constructor",
  description:
    "Arma barajas del formato Escuelas Elementales validando las reglas de construcción.",
};

export default async function ConstructorPage() {
  // Corre en tiempo de build: la primera pagina de la grilla queda en el HTML
  // y el resto del catalogo lo baja el navegador (`useCatalogo`). El
  // constructor trabaja en memoria, sin servidor.
  const { inicial, total, facets } = await getCatalogPage(undefined, PAGE_SIZE_BUILDER);

  return (
    // pb-24 bajo lg para que la barra fija de la baraja no tape la ultima fila.
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pt-10 pb-24 sm:px-6 lg:pb-10">
      <p className="eyebrow mb-3">Barajas</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Constructor</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Arma tu baraja del formato Escuelas Elementales con el + de cada carta. Al
        guardarla queda en Mis barajas.
      </p>

      <div className="mt-10">
        <BuilderView inicial={inicial} total={total} facets={facets} />
      </div>
    </main>
  );
}
