import { Ban, BookOpenText, FileText } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DocumentActions } from "@/components/documentos/DocumentActions";
import { DOCUMENTOS, type Documento } from "@/lib/documentos";
import { cartasDelDar, conceptosDelDar, reglasDelDar } from "@/lib/dar";
import { BANLISTS, DAR, FE_DE_ERRATAS, pesoDelPdf } from "@/lib/documentos-data";
import { DESCRIPCION_FORMATO } from "@/lib/formatos";

export const metadata: Metadata = {
  title: "Documentos",
  description:
    "El Documento Actualizado de Reglas, la Fe de Erratas y las Banlists Estándar, VCR e Infantería del formato Escuelas Elementales de Mitos y Leyendas, para leer en el sitio y descargar.",
};

export default function DocumentosPage() {
  const cambiosDeHabilidad = FE_DE_ERRATAS.entradas.filter(
    (e) => e.cambio === "habilidad",
  ).length;

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Reglas</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Documentos</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Los documentos oficiales del formato, puedes leerlos aquí mismo o descargarlos en
        formato PDF. El DAR y la Fe de Erratas valen para los tres formatos de juego; la
        Banlist, cada uno tiene la suya.
      </p>

      {/* Las reglas comunes arriba, de a dos desde lg, y debajo una Banlist
          por formato: de a tres desde xl (de a dos, la tercera quedaba sola). */}
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Tarjeta
          doc={DOCUMENTOS.dar}
          icono={<BookOpenText size={20} aria-hidden="true" />}
          titulo="Documento Actualizado de Reglas"
          descripcion="Cómo se juega, regla por regla: las partes de una carta, las zonas, las habilidades, las fases del turno y los conceptos del juego."
          cifras={[
            [reglasDelDar(DAR), "reglas con letra"],
            [conceptosDelDar(DAR), "conceptos de juego"],
            [cartasDelDar(DAR).length, "cartas de ejemplo"],
          ]}
        />
        <Tarjeta
          doc={DOCUMENTOS.feDeErratas}
          icono={<FileText size={20} aria-hidden="true" />}
          titulo="Fe de Erratas"
          descripcion="El texto vigente de cada carta corregida: lo que dice la carta impresa y lo que debe decir, con el cambio resaltado."
          cifras={[
            [FE_DE_ERRATAS.entradas.length, "cartas corregidas"],
            [cambiosDeHabilidad, "de habilidad"],
            [
              FE_DE_ERRATAS.entradas.length - cambiosDeHabilidad,
              "de nombre, raza o frecuencia",
            ],
          ]}
        />
      </div>

      <h2 className="text-ink mt-12 text-xl font-semibold tracking-[-0.01em]">
        Banlist de cada formato
      </h2>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Tarjeta
          doc={DOCUMENTOS.banlist}
          icono={<Ban size={20} aria-hidden="true" />}
          titulo="Banlist Estándar"
          descripcion="Las cartas prohibidas, las que van con una sola copia y las erratas que aplica al formato."
          cifras={[
            [BANLISTS.estandar.prohibidas.length, "prohibidas"],
            [BANLISTS.estandar.unicas.length, "Únicas"],
            [BANLISTS.estandar.erratas.length, "erratas y ajustes"],
          ]}
        />
        <Tarjeta
          doc={DOCUMENTOS.banlistVcr}
          icono={<Ban size={20} aria-hidden="true" />}
          titulo="Banlist VCR"
          descripcion={`${DESCRIPCION_FORMATO.vcr} Las prohibidas, las Únicas, las Errantes y las cartas de fuera del bloque que se admiten.`}
          cifras={[
            [BANLISTS.vcr.prohibidas.length, "prohibidas"],
            [BANLISTS.vcr.unicas.length, "Únicas"],
            [BANLISTS.vcr.errantes?.length ?? 0, "Errantes"],
          ]}
        />
        <Tarjeta
          doc={DOCUMENTOS.banlistInfanteria}
          icono={<Ban size={20} aria-hidden="true" />}
          titulo="Banlist Infantería"
          descripcion={`${DESCRIPCION_FORMATO.infanteria} Las prohibidas, las Únicas y las Errantes.`}
          cifras={[
            [BANLISTS.infanteria.prohibidas.length, "prohibidas"],
            [BANLISTS.infanteria.unicas.length, "Únicas"],
            [BANLISTS.infanteria.errantes?.length ?? 0, "Errantes"],
          ]}
        />
      </div>
    </main>
  );
}

function Tarjeta({
  doc,
  icono,
  titulo,
  descripcion,
  cifras,
}: {
  doc: Documento;
  icono: ReactNode;
  titulo: string;
  descripcion: string;
  cifras: [number, string][];
}) {
  const peso = pesoDelPdf(doc);
  const id = `doc-${doc.ruta.split("/").at(-1)}`;
  return (
    <section
      aria-labelledby={id}
      className="aparece bg-panel border-line rounded-panel flex flex-col border p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="bg-accent-soft text-accent rounded-chip inline-flex size-10 items-center justify-center">
          {icono}
        </span>
        <h2 id={id} className="text-ink text-xl font-bold">
          {titulo}
        </h2>
      </div>
      <p className="text-muted mt-3 leading-relaxed">{descripcion}</p>

      <dl className="mt-5 grid grid-cols-3 gap-2">
        {cifras.map(([n, texto]) => (
          // El numero se ve arriba, pero en el HTML va despues de su nombre,
          // que es el orden que pide <dl> (dt y luego dd).
          <div
            key={texto}
            className="border-line bg-surface rounded-card flex flex-col-reverse justify-end border px-3 py-2.5"
          >
            <dt className="text-muted text-[12px] leading-snug">{texto}</dt>
            <dd className="text-ink text-2xl font-bold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      <DocumentActions
        doc={doc}
        nombre={titulo}
        peso={peso}
        verEnElSitio
        className="mt-5 pt-1 lg:mt-auto lg:pt-5"
      />
    </section>
  );
}
