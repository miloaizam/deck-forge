import type { Metadata } from "next";

import { CuentaView } from "@/components/nube/CuentaView";

export const metadata: Metadata = {
  title: "Tu cuenta",
  description:
    "Guarda tus barajas y tu colección en la nube y sincronízalas entre tus equipos.",
  // Una pagina de cada usuario: no tiene nada que indexar.
  robots: { index: false },
};

export default function CuentaPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Cuenta</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Tu cuenta</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Con tu cuenta armas y guardas barajas y llevas tu colección, y te siguen a
        cualquier equipo. El catálogo y la Comunidad se ven sin cuenta.
      </p>
      <CuentaView />
    </main>
  );
}
