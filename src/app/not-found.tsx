import type { Metadata } from "next";
import Link from "next/link";
import { House, LibraryBig } from "lucide-react";

import { ErrorScreen } from "@/components/ErrorScreen";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false },
};

/**
 * 404. El export la escribe en out/404.html, y Cloudflare la sirve para
 * cualquier ruta que no exista: Pages busca el 404.html mas cercano subiendo
 * por la ruta, y el unico que hay es el de la raiz.
 */
export default function NotFound() {
  return (
    <ErrorScreen code={404}>
      {/* El catalogo va primero: quien cae aqui casi siempre venia buscando
          una carta o una edicion. */}
      <Link href="/catalogo" className={PRIMARY_BUTTON}>
        <LibraryBig size={19} aria-hidden="true" />
        Ir al catálogo
      </Link>
      <Link href="/" className={SECONDARY_BUTTON}>
        <House size={19} aria-hidden="true" />
        Volver al inicio
      </Link>
    </ErrorScreen>
  );
}
