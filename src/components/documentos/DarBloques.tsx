import type { ReactNode } from "react";

import { claveDeNombre, type BloqueDar } from "@/lib/documentos";
import type { CartaDoc, CartasDoc } from "@/lib/dar";
import { cn } from "@/lib/utils";
import { AnatomiaCarta } from "./AnatomiaCarta";
import { CartaEjemplo, CartasEjemplo } from "./CartasEjemplo";
import { DiagramaArbol } from "./DiagramaArbol";
import { DiagramaArena } from "./DiagramaArena";
import { EnlaceAncla } from "./DocumentSection";
import { Marcado } from "./Marcado";

type Nivel = 3 | 4 | 5 | 6;

interface Contexto {
  cartas: CartasDoc;
  /** La carta del diagrama de anatomia (Wyrm de la Plaga). */
  anatomia: CartaDoc;
}

/** El titulo de un bloque, con el nivel que le toca en el arbol de la pagina. */
function Titulo({
  nivel,
  id,
  className,
  children,
}: {
  nivel: Nivel;
  id?: string;
  className: string;
  children: ReactNode;
}) {
  const H = `h${nivel}` as const; // nivel es 3..6: siempre un titulo valido
  return (
    <H id={id} className={className}>
      {children}
    </H>
  );
}

const siguiente = (n: Nivel): Nivel => (n < 6 ? ((n + 1) as Nivel) : 6); // acotado a 6

/**
 * Los bloques del DAR (`documentos/fuente/dar.json`) en HTML. Server
 * Component: todo sale en el HTML estatico. Las reglas llevan su letra como
 * enlace a su propia ancla, para citarlas («8.1 D»).
 */
export function DarBloques({
  bloques,
  nivel,
  ctx,
}: {
  bloques: BloqueDar[];
  nivel: Nivel;
  ctx: Contexto;
}) {
  return (
    <div className="space-y-3">
      {bloques.map((b, i) => (
        <Bloque key={i} b={b} nivel={nivel} ctx={ctx} />
      ))}
    </div>
  );
}

function Bloque({ b, nivel, ctx }: { b: BloqueDar; nivel: Nivel; ctx: Contexto }) {
  switch (b.tipo) {
    case "parrafo":
      return (
        <p>
          <Marcado texto={b.texto} />
        </p>
      );

    case "nota":
      return (
        <p className="border-brand-500/50 text-muted border-l-2 pl-4 text-[15px]">
          <Marcado texto={b.texto} />
        </p>
      );

    case "lista": {
      const Lista = b.ordenada ? "ol" : "ul";
      return (
        <Lista
          className={cn(
            "marker:text-accent space-y-1.5 pl-5",
            b.ordenada ? "list-decimal marker:font-semibold" : "list-disc",
          )}
        >
          {b.items.map((t, i) => (
            <li key={i} className="pl-1">
              <Marcado texto={t} />
            </li>
          ))}
        </Lista>
      );
    }

    case "etiquetada": {
      // Etiquetas cortas ("C1", "a") en columna; las largas ("Coste
      // Alternativo"), encima de su texto.
      const cortas = b.items.every((x) => x.etiqueta.length <= 4);
      return (
        <dl
          className={
            cortas
              ? "grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5"
              : "space-y-3"
          }
        >
          {b.items.map((x, i) => (
            <div key={i} className={cortas ? "contents" : undefined}>
              <dt
                className={cn(
                  "text-accent font-semibold",
                  cortas && "min-w-6 tabular-nums",
                )}
              >
                {x.etiqueta}
              </dt>
              <dd>
                <Marcado texto={x.texto} />
              </dd>
            </div>
          ))}
        </dl>
      );
    }

    case "cartas":
      return <CartasEjemplo nombres={b.cartas} pie={b.pie} cartas={ctx.cartas} />;

    case "diagrama":
      if (b.diagrama === "anatomia") return <AnatomiaCarta carta={ctx.anatomia} />;
      if (b.diagrama === "arena") return <DiagramaArena />;
      return <DiagramaArbol />;

    case "caso":
      return (
        <div className="bg-panel border-line rounded-card !my-5 border p-4 sm:p-5">
          <p className="text-accent mb-3 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {b.titulo}
          </p>
          {b.carta && (
            <div className="mb-4 flex gap-4">
              <CartaEjemplo
                nombre={b.carta}
                carta={ctx.cartas[claveDeNombre(b.carta)]}
                className="w-[84px] shrink-0 sm:w-[96px]"
              />
              <div className="min-w-0">
                <p className="text-ink font-semibold">{b.carta}</p>
                {b.linea && <p className="text-muted text-[13px]">{b.linea}</p>}
                {b.cita && (
                  <blockquote className="border-line text-ink/90 mt-2 space-y-1 border-l-2 pl-3 text-[14px] leading-relaxed">
                    {b.cita.map((c, i) => (
                      <p key={i}>
                        <Marcado texto={c} />
                      </p>
                    ))}
                  </blockquote>
                )}
              </div>
            </div>
          )}
          {!b.carta && b.cita && (
            <blockquote className="border-line mb-3 space-y-1 border-l-2 pl-3 text-[14px]">
              {b.cita.map((c, i) => (
                <p key={i}>
                  <Marcado texto={c} />
                </p>
              ))}
            </blockquote>
          )}
          <div className="text-[15px]">
            <DarBloques bloques={b.bloques} nivel={nivel} ctx={ctx} />
          </div>
        </div>
      );

    case "apartado": {
      const nombre = b.numero ? `${b.numero} ${b.titulo}` : b.titulo;
      return (
        <section
          id={b.id}
          aria-labelledby={`t-${b.id}`}
          className={cn("scroll-mt-24", nivel === 3 ? "!mt-12" : "!mt-8")}
        >
          <Titulo
            nivel={nivel}
            id={`t-${b.id}`}
            className={cn(
              "group text-ink flex items-baseline gap-2.5 font-semibold tracking-[-0.01em]",
              nivel === 3 ? "text-xl" : "text-[17px]",
            )}
          >
            {b.numero && <span className="text-accent tabular-nums">{b.numero}</span>}
            <span>{b.titulo}</span>
            <EnlaceAncla id={b.id} nombre={nombre} />
          </Titulo>
          <div className="mt-3">
            <DarBloques bloques={b.bloques} nivel={siguiente(nivel)} ctx={ctx} />
          </div>
        </section>
      );
    }

    case "regla": {
      // Una subregla ("B1", "C4.1") lleva una letra mas discreta.
      const sub = /\d/.test(b.letra) && !/^\d/.test(b.letra);
      return (
        <div
          id={b.id}
          className="!mt-5 grid scroll-mt-24 grid-cols-[auto_minmax(0,1fr)] gap-x-3"
        >
          <a
            href={`#${b.id}`}
            className={cn(
              "rounded-chip inline-flex h-8 min-w-8 items-center justify-center self-start px-1.5 text-[13px] font-bold tabular-nums transition-colors",
              "hover:outline-brand-500 hover:outline-2 hover:outline-offset-2",
              sub ? "border-line text-accent border" : "bg-accent-soft text-accent",
            )}
          >
            <span className="sr-only">Regla </span>
            {b.letra}
          </a>
          <div className="min-w-0 pt-[3px]">
            {b.titulo && (
              <Titulo nivel={nivel} className="text-ink mb-1.5 font-semibold">
                {b.titulo}
              </Titulo>
            )}
            <DarBloques bloques={b.bloques} nivel={siguiente(nivel)} ctx={ctx} />
          </div>
        </div>
      );
    }
  }
}
