import type { Metadata } from "next";

import { DiffText, MARCA_ENTRA, MARCA_SALE } from "@/components/documentos/DiffText";
import { DocumentHeader } from "@/components/documentos/DocumentHeader";
import {
  DOCUMENTOS,
  EDICIONES_FE_DE_ERRATAS,
  ETIQUETA_CAMBIO,
  fechaLarga,
  type Erratum,
} from "@/lib/documentos";
import { FE_DE_ERRATAS, pesoDelPdf } from "@/lib/documentos-data";
import { wordDiff } from "@/lib/word-diff";

export const metadata: Metadata = {
  title: "Fe de Erratas",
  description:
    "Las cartas corregidas del formato Escuelas Elementales: lo que dice la carta impresa y lo que debe decir, con el cambio resaltado.",
};

/** Ancla de una edicion o una carta: sin tildes ni espacios. */
const ancla = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const ROTULO = "text-muted text-[11px] font-semibold tracking-[0.18em] uppercase";

/**
 * La Fe de Erratas en HTML, dibujada con los mismos datos que su PDF
 * (`documentos/fuente/fe-de-erratas.json`). Server Component: no manda
 * JavaScript propio, y el indice son anclas.
 */
export default function FeDeErratasPage() {
  const doc = FE_DE_ERRATAS;
  const grupos = EDICIONES_FE_DE_ERRATAS.map(
    (ed) => [ed, doc.entradas.filter((e) => e.edicion === ed)] as const,
  ).filter(([, l]) => l.length > 0);

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <DocumentHeader
        doc={DOCUMENTOS.feDeErratas}
        titulo="Fe de Erratas"
        bajada={`${doc.entradas.length} cartas corregidas: lo que dice la carta impresa y lo que debe decir, con el cambio resaltado.`}
        origen={`Transcripción de DeckForge del documento oficial «${doc.original.titulo}», última actualización ${doc.original.actualizacion}. Versión del ${fechaLarga(doc.version)}. El texto de las cartas se copia tal cual del original; solo se corrigieron erratas del propio documento, anotadas en cada carta.`}
        peso={pesoDelPdf(DOCUMENTOS.feDeErratas)}
      >
        <p className="text-muted mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          <span>
            <del className={MARCA_SALE}>Tachado</del>: lo que sale
          </span>
          <span>
            <ins className={MARCA_ENTRA}>Resaltado</ins>: lo que entra
          </span>
        </p>
      </DocumentHeader>

      <nav aria-label="Ediciones" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {grupos.map(([ed, l]) => (
            <li key={ed}>
              <a
                href={`#${ancla(ed)}`}
                className="border-line text-muted hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500 rounded-chip inline-flex h-9 items-center gap-2 border px-3 text-[13px] transition-colors"
              >
                {ed}
                <span className="bg-accent-soft text-accent rounded-chip px-1.5 text-[11px] font-semibold tabular-nums">
                  {l.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {grupos.map(([ed, l]) => (
        <section
          key={ed}
          id={ancla(ed)}
          aria-labelledby={`t-${ancla(ed)}`}
          className="mt-12 scroll-mt-24"
        >
          <h2
            id={`t-${ancla(ed)}`}
            className="text-ink flex items-center gap-2 text-xl font-bold"
          >
            {ed}
            <span className="bg-brand-600 rounded-chip px-2 text-[12px] font-bold text-white tabular-nums">
              {l.length}
            </span>
          </h2>
          <ul className="mt-5 flex flex-col gap-4">
            {l.map((e) => (
              <li key={`${e.nombre}-${e.codigo}`}>
                <Ficha e={e} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

function Ficha({ e }: { e: Erratum }) {
  const meta = [
    e.tipo,
    e.raza,
    e.coste !== null ? `Coste ${e.coste}` : null,
    e.fuerza !== null ? `Fuerza ${e.fuerza}` : null,
  ].filter(Boolean);
  const notas = [e.nota, e.correccion].filter((n): n is string => Boolean(n));

  return (
    <article
      id={ancla(e.nombre)}
      className="bg-panel border-line rounded-card scroll-mt-24 border p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-ink text-[17px] font-semibold">{e.nombre}</h3>
          <p className="text-muted mt-0.5 text-[13px]">{meta.join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="border-line text-muted rounded-chip border px-2 py-0.5 text-[12px] tabular-nums">
            {e.codigo}
          </span>
          <span className="bg-accent-soft text-accent rounded-chip px-2 py-0.5 text-[12px] font-medium">
            {ETIQUETA_CAMBIO[e.cambio]}
          </span>
        </div>
      </header>

      <div className="mt-4">
        <Cambio e={e} />
      </div>

      {notas.map((n) => (
        <p key={n} className="text-muted mt-3 text-[13px] leading-relaxed">
          <span className="text-accent font-semibold">Nota · </span>
          {n}
        </p>
      ))}
    </article>
  );
}

function Caja({
  rotulo,
  vigente = false,
  children,
}: {
  rotulo: string;
  vigente?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        vigente
          ? "border-brand-500/60 bg-surface rounded-card border p-3.5"
          : "border-line bg-surface rounded-card border p-3.5"
      }
    >
      <h4 className={vigente ? `${ROTULO} text-accent mb-1.5` : `${ROTULO} mb-1.5`}>
        {rotulo}
      </h4>
      <div className="text-ink text-[14px]">{children}</div>
    </div>
  );
}

/** El cuerpo de la ficha, segun que tenga la entrada. Espejo de `fichaCarta` del PDF. */
function Cambio({ e }: { e: Erratum }) {
  const debeDecir = e.etiquetaDespues ?? "Debe decir";

  // Un dato suelto (nombre, raza o frecuencia): va en una linea.
  if (e.cambio !== "habilidad") {
    return (
      <p className="border-line bg-surface rounded-card flex flex-wrap items-center gap-x-3 gap-y-1 border p-3.5 text-[14px]">
        <span className={ROTULO}>Donde dice</span>
        <del className={MARCA_SALE}>{e.antes}</del>
        <span aria-hidden="true" className="text-accent">
          ▸
        </span>
        <span className={`${ROTULO} text-accent`}>Debe decir</span>
        <ins className={MARCA_ENTRA}>{e.despues}</ins>
      </p>
    );
  }

  // Varias versiones impresas, reemplazadas todas por un texto.
  if (e.versiones) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Caja rotulo="Donde dice">
          <ol className="list-decimal space-y-1 pl-5">
            {e.versiones.map((v) => (
              <li key={v}>
                <del className={MARCA_SALE}>{v}</del>
              </li>
            ))}
          </ol>
        </Caja>
        <Caja rotulo={debeDecir} vigente>
          <p className="leading-relaxed whitespace-pre-line">
            <ins className={MARCA_ENTRA}>{e.despues}</ins>
          </p>
        </Caja>
      </div>
    );
  }

  const antes = e.antes ?? "";

  // Con una errata intermedia: tres pasos, cada uno comparado con el anterior.
  if (e.intermedio) {
    const primero = wordDiff(antes, e.intermedio.texto);
    const segundo = wordDiff(e.intermedio.texto, e.despues);
    return (
      <div className="grid gap-3 lg:grid-cols-3">
        <Caja rotulo="Donde dice">
          <DiffText tramos={primero.antes} />
        </Caja>
        <Caja rotulo={e.intermedio.etiqueta}>
          <DiffText tramos={primero.despues} />
        </Caja>
        <Caja rotulo={debeDecir} vigente>
          <DiffText tramos={segundo.despues} />
        </Caja>
      </div>
    );
  }

  const d = wordDiff(antes, e.despues);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Caja rotulo="Donde dice">
        <DiffText tramos={d.antes} />
      </Caja>
      <Caja rotulo={debeDecir} vigente>
        <DiffText tramos={d.despues} />
      </Caja>
    </div>
  );
}
