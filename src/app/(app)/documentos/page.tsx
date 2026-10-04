import { Ban, FileText, Info } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DocumentActions } from "@/components/documentos/DocumentActions";
import { DOCUMENTOS, fechaLarga, type Documento } from "@/lib/documentos";
import { BANLIST, FE_DE_ERRATAS, pesoDelPdf } from "@/lib/documentos-data";

export const metadata: Metadata = {
  title: "Documentos",
  description:
    "La Fe de Erratas y la Banlist del formato Escuelas Elementales de Mitos y Leyendas, para leer en el sitio y descargar.",
};

export default function DocumentosPage() {
  const cambiosDeHabilidad = FE_DE_ERRATAS.entradas.filter(
    (e) => e.cambio === "habilidad",
  ).length;

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Reglas</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Documentos</h1>
      <p className="text-muted mt-3 max-w-[70ch] leading-relaxed">
        Los documentos oficiales del formato, transcritos con el estilo de DeckForge. Se
        pueden leer aquí mismo o descargar en PDF.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
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
          origen={`Original: «${FE_DE_ERRATAS.original.titulo}», ${FE_DE_ERRATAS.original.actualizacion}.`}
          version={FE_DE_ERRATAS.version}
        />
        <Tarjeta
          doc={DOCUMENTOS.banlist}
          icono={<Ban size={20} aria-hidden="true" />}
          titulo="Banlist Estándar"
          descripcion="Las cartas prohibidas, las que van con una sola copia y las erratas que aplica al formato."
          cifras={[
            [BANLIST.prohibidas.length, "prohibidas"],
            [BANLIST.unicas.length, "Únicas"],
            [BANLIST.erratas.length, "erratas y ajustes"],
          ]}
          origen={`Original: «${BANLIST.original.titulo}», modificado el ${fechaLarga(BANLIST.original.modificado)}.`}
          version={BANLIST.version}
        />
      </div>

      <p className="text-muted mt-8 flex max-w-[80ch] items-start gap-2 text-[13px] leading-relaxed">
        <Info size={15} aria-hidden="true" className="text-accent mt-0.5 shrink-0" />
        El catálogo y el constructor las aplican: las cartas con errata o baneadas llevan
        un lazo en la esquina, la errata se lee con el botón «Errata» de cada carta y el
        constructor juega con el texto erratado.
      </p>
    </main>
  );
}

function Tarjeta({
  doc,
  icono,
  titulo,
  descripcion,
  cifras,
  origen,
  version,
}: {
  doc: Documento;
  icono: ReactNode;
  titulo: string;
  descripcion: string;
  cifras: [number, string][];
  origen: string;
  version: string;
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

      <p className="text-muted mt-5 text-[13px] leading-relaxed">
        {origen} Transcripción del {fechaLarga(version)}. PDF de {doc.paginas} páginas.
      </p>

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
