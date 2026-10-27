import type { Metadata } from "next";

import { BanlistDocumento } from "@/components/documentos/BanlistDocumento";

export const metadata: Metadata = {
  title: "Banlist VCR",
  description:
    "Las cartas prohibidas, Únicas y Errantes del formato VCR (Vasallos, Cortesanos y Reales) de Escuelas Elementales.",
};

export default function BanlistVcrPage() {
  return <BanlistDocumento formato="vcr" />;
}
