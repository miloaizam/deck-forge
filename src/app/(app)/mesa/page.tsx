import { Suspense } from "react";
import type { Metadata } from "next";

import { SalaView } from "@/components/mesa/SalaView";
import { DeckListSkeleton } from "@/components/Skeleton";
import { MESA_ACTIVA } from "@/lib/mesa/activa";
import { VACIO } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Mesa",
  description: "Juega una de tus barajas contra otra cuenta, en una sala.",
  robots: { index: false, follow: true },
};

/**
 * La mesa 1v1 (GAME.md, sesion 4): crear una sala o unirse con su codigo
 * (`?c=`), y la sala misma (`?s=<id>`). Apagada (`MESA_ACTIVA`), solo dice
 * que todavia no esta disponible y no trae el JavaScript de la mesa.
 */
export default function MesaPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      {MESA_ACTIVA ? (
        // La pagina entera depende de los parametros: el limite va afuera.
        <Suspense fallback={<DeckListSkeleton />}>
          <SalaView />
        </Suspense>
      ) : (
        <div className={VACIO}>
          <h1 className="text-ink text-lg font-bold">Mesa</h1>
          <p className="text-muted mt-2 text-[14px]">Todavía no está disponible.</p>
        </div>
      )}
    </main>
  );
}
