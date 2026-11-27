import type { Metadata } from "next";

import { MesaPracticaView } from "@/components/mesa/MesaPracticaView";
import { MESA_ACTIVA } from "@/lib/mesa/activa";
import { VACIO } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Mesa de práctica",
  description: "Prueba una de tus barajas moviendo sus cartas sobre una mesa.",
  robots: { index: false, follow: true },
};

/**
 * La mesa de practica en solitario (GAME.md, sesion 2): una baraja guardada
 * sobre la mesa, sin red y sin reglas. Apagada (`MESA_ACTIVA`), solo dice
 * que todavia no esta disponible y no trae el JavaScript de la mesa.
 */
export default function MesaPracticaPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      {MESA_ACTIVA ? (
        <MesaPracticaView />
      ) : (
        <div className={VACIO}>
          <h1 className="text-ink text-lg font-bold">Práctica en solitario</h1>
          <p className="text-muted mt-2 text-[14px]">Todavía no está disponible.</p>
        </div>
      )}
    </main>
  );
}
