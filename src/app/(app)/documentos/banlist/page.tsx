import type { Metadata } from "next";

import { BanlistDocumento } from "@/components/documentos/BanlistDocumento";

export const metadata: Metadata = {
  title: "Banlist Estándar",
  description:
    "Las cartas prohibidas, las Únicas y las erratas del formato Estándar RE MyL (Escuelas Elementales).",
};

/** La Banlist del formato Estandar. VCR e Infanteria cuelgan de esta ruta. */
export default function BanlistPage() {
  return <BanlistDocumento formato="estandar" />;
}
