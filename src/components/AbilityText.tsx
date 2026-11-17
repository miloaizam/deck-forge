import type { ReactNode } from "react";

import { KEYWORD_EN_PROSA, splitAbility } from "@/lib/ability";
import { sinCorchetes } from "@/lib/erratas-aplicadas";
import { cn } from "@/lib/utils";

interface AbilityTextProps {
  text: string;
  /**
   * Lo que cambio una errata (`resaltesDe` de erratas.ts): va en dorado. Una
   * frase entre corchetes pinta solo esa parte; el resto la ubica.
   */
  resaltes?: readonly string[];
  /**
   * Lo que la Banlist le pone a la carta y no es texto de carta (la regla de
   * Shingas y Karna, "Libre por tres copias"): va al pie, aparte, en el mismo
   * dorado (`notasDeErrata`).
   */
  notas?: readonly string[];
}

/** Lo que cambio una errata, en el cuerpo: fondo de marcador y texto dorado. */
const MARCA_ERRATA =
  "bg-errata-soft text-errata rounded-[3px] px-0.5 no-underline box-decoration-clone";
const TITULO_ERRATA = "Cambió con una errata";

interface Marca {
  desde: number;
  hasta: number;
}

/**
 * Donde cae cada frase en el texto. Cada una toma su siguiente aparicion libre
 * (dos "juego" marcan las dos primeras) y una que no esta, porque caia en un
 * recordatorio que el modal no muestra, simplemente no se pinta.
 */
function ubicar(texto: string, frases: readonly string[]): Marca[] {
  const marcas: Marca[] = [];
  for (const frase of frases) {
    const buscada = sinCorchetes(frase);
    const abre = frase.indexOf("[");
    const cierra = frase.indexOf("]");
    const [salto, largo] =
      abre >= 0 && cierra > abre ? [abre, cierra - abre - 1] : [0, buscada.length];
    for (let i = texto.indexOf(buscada); i >= 0; i = texto.indexOf(buscada, i + 1)) {
      const m = { desde: i + salto, hasta: i + salto + largo };
      if (!marcas.some((x) => m.desde < x.hasta && x.desde < m.hasta)) {
        marcas.push(m);
        break;
      }
    }
  }
  return marcas.sort((a, b) => a.desde - b.desde);
}

/** Las keywords de prosa en violeta, o en dorado si caen dentro de una marca. */
function conKeywords(texto: string, clave: string, enMarca: boolean): ReactNode[] {
  return texto.split(KEYWORD_EN_PROSA).map((chunk, i) =>
    // split() con grupo de captura intercala los match en indices impares.
    i % 2 === 1 ? (
      <strong
        key={`${clave}-${i}`}
        className={cn("font-semibold", enMarca ? "text-errata" : "text-accent")}
      >
        {chunk}
      </strong>
    ) : (
      chunk
    ),
  );
}

/** Las partes de una frase que son keywords ("Única. Errante." -> las dos). */
const declaraciones = (frase: string) =>
  frase
    .split(/\.\s*/)
    .map((p) => p.trim())
    .filter((p) => p !== "");

/**
 * Renderiza la habilidad de una carta: las keywords arriba y el efecto abajo.
 *
 * Arriba va todo lo que la carta declara, aunque en el impreso caiga despues de
 * una condicion de juego; abajo, solo lo que cambia de una carta a otra. Lo que
 * hace cada keyword no se explica —es conocimiento comun del formato y la carta
 * lo repite en un parentesis que ahoga el efecto—, salvo las dos cosas que si
 * son de la carta y no de la regla: el coste de `Traición` y a que se es
 * inmune.
 *
 * Lo que puso una errata va en dorado, y el color nunca es la unica pista:
 * fondo de marcador, `<ins>` y su titulo. Sin leyenda al pie (decision del
 * proyecto, 17-11-2026): el lazo «Errata» de la imagen ya avisa.
 *
 * Todo se construye como nodos de React a partir del texto: nunca HTML crudo,
 * porque el texto viene de una fuente externa (ver la seccion de seguridad de
 * CLAUDE.md).
 */
export function AbilityText({ text, resaltes = [], notas = [] }: AbilityTextProps) {
  const { keywords, cuerpo } = splitAbility(text);

  // Una frase que solo declara keywords de la carta se pinta en su fila y no
  // se busca en el cuerpo, donde podria dar con la misma palabra en prosa.
  const declaradas = new Set(keywords.map((k) => k.keyword));
  const enFila = new Set<string>();
  const enCuerpo: string[] = [];
  for (const r of resaltes) {
    const partes = declaraciones(r);
    if (partes.length > 0 && partes.every((p) => declaradas.has(p))) {
      for (const p of partes) enFila.add(p);
    } else enCuerpo.push(r);
  }

  const marcas = ubicar(cuerpo, enCuerpo);
  const nodos: ReactNode[] = [];
  let cursor = 0;
  marcas.forEach((m, i) => {
    nodos.push(...conKeywords(cuerpo.slice(cursor, m.desde), `t${i}`, false));
    nodos.push(
      <ins key={`m${i}`} className={MARCA_ERRATA} title={TITULO_ERRATA}>
        {conKeywords(cuerpo.slice(m.desde, m.hasta), `m${i}`, true)}
      </ins>,
    );
    cursor = m.hasta;
  });
  nodos.push(...conKeywords(cuerpo.slice(cursor), "fin", false));

  return (
    <div className="flex flex-col gap-3">
      {keywords.length > 0 && (
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {keywords.map(({ keyword, texto }, i) =>
            enFila.has(keyword) ? (
              <ins
                key={`${keyword}-${i}`}
                className={cn(MARCA_ERRATA, "text-[15px] font-semibold")}
                title={TITULO_ERRATA}
              >
                {texto}
              </ins>
            ) : (
              <strong
                key={`${keyword}-${i}`}
                className="text-accent text-[15px] font-semibold"
              >
                {texto}
              </strong>
            ),
          )}
        </p>
      )}

      {cuerpo && (
        <p className="text-ink text-[15px] leading-relaxed whitespace-pre-line">
          {nodos}
        </p>
      )}

      {notas.map((nota) => (
        <p
          key={nota}
          className="bg-errata-soft text-errata rounded-card px-3 py-2 text-[13px] leading-relaxed"
        >
          {nota}
        </p>
      ))}
    </div>
  );
}
