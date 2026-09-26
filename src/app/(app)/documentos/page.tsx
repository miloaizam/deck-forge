import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentos",
  description:
    "Documentos oficiales del formato Escuelas Elementales de Mitos y Leyendas, para leer y descargar.",
};

export default function DocumentosPage() {
  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Reglas</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Documentos</h1>

      <div className="border-line rounded-panel mt-10 border border-dashed px-6 py-20 text-center">
        <FileText
          size={28}
          aria-hidden="true"
          className="text-muted mx-auto mb-4 opacity-60"
        />
        <p className="text-ink text-lg">Todavía no está lista.</p>
        <p className="text-muted mx-auto mt-3 max-w-[46ch] leading-relaxed">
          Aquí estarán los documentos oficiales del formato, para leerlos en el sitio y
          descargarlos: la Fe de Erratas, con el texto vigente de cada carta corregida, y
          la Banlist, con las cartas prohibidas y restringidas.
        </p>
      </div>
    </main>
  );
}
