import type { Metadata } from "next";

import { BanlistDocumento } from "@/components/documentos/BanlistDocumento";

export const metadata: Metadata = {
  title: "Banlist Infantería",
  description:
    "Las cartas prohibidas, Únicas y Errantes del formato Infantería (Vasallos y Cortesanos) de Escuelas Elementales.",
};

export default function BanlistInfanteriaPage() {
  return <BanlistDocumento formato="infanteria" />;
}
