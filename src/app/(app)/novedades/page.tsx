import type { Metadata } from "next";
import { Megaphone, Sparkles, TrendingUp, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { NOVEDADES, type Novedad, type TipoNovedad } from "@/lib/novedades";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Lo que ha cambiado en DeckForge, de lo más nuevo a lo más antiguo.",
};

/** Icono y texto de cada tipo: el color nunca es el unico indicador. */
const ESTILO: Record<TipoNovedad, { Icon: LucideIcon; clase: string }> = {
  Novedad: { Icon: Sparkles, clase: "text-accent bg-accent-soft border-transparent" },
  Mejora: { Icon: TrendingUp, clase: "text-ink border-line" },
  Arreglo: { Icon: Wrench, clase: "text-muted border-line" },
  Aviso: { Icon: Megaphone, clase: "text-ink border-brand-500" },
};

// La fecha se lee como mediodia UTC y se formatea en UTC: asi "2026-09-26" no
// se corre al 25 por la zona horaria de la maquina que construye.
const FECHA = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" });
const formatear = (fecha: string) => FECHA.format(new Date(`${fecha}T12:00:00Z`));

/** Agrupa por fecha conservando el orden: de la mas nueva a la mas antigua. */
function porFecha(lista: Novedad[]): [string, Novedad[]][] {
  const grupos = new Map<string, Novedad[]>();
  for (const n of lista) grupos.set(n.fecha, [...(grupos.get(n.fecha) ?? []), n]);
  return [...grupos];
}

export default function NovedadesPage() {
  const grupos = porFecha(NOVEDADES);

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Novedades</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Lo nuevo en DeckForge</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Los cambios que se notan al usar el sitio, del más reciente al más antiguo.
      </p>

      {/* La linea es el borde izquierdo de la lista; cada fecha lleva un punto
          encima de ella. El primero, el mas reciente, es el unico con brillo. */}
      <ol className="border-line mt-10 ml-2 max-w-[760px] border-l">
        {grupos.map(([fecha, entradas], i) => (
          <li key={fecha} className="relative pb-10 pl-7 last:pb-0">
            <span
              aria-hidden="true"
              className={cn(
                "ring-bg absolute top-1 -left-[7px] size-3.5 rounded-full ring-4",
                i === 0 ? "bg-brand-600 shadow-glow" : "bg-line",
              )}
            />
            <h2 className="text-ink text-lg font-semibold tracking-[-0.01em]">
              <time dateTime={fecha}>{formatear(fecha)}</time>
            </h2>

            <ul className="mt-4 flex flex-col gap-3">
              {entradas.map((n) => {
                const { Icon, clase } = ESTILO[n.tipo];
                // La mas reciente de todas lleva el borde violeta y su
                // etiqueta: el color solo no puede ser el unico indicador.
                const ultima = n === NOVEDADES[0];
                return (
                  <li
                    key={n.titulo}
                    className={cn(
                      "aparece bg-panel rounded-card border p-4 sm:p-5",
                      ultima ? "border-brand-500 shadow-glow" : "border-line",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-chip inline-flex items-center gap-1.5 border px-2 py-0.5 text-[12px] font-medium",
                          clase,
                        )}
                      >
                        <Icon size={13} aria-hidden="true" />
                        {n.tipo}
                      </span>
                      {ultima && (
                        <span className="text-accent text-[12px] font-medium">
                          Lo más reciente
                        </span>
                      )}
                    </div>
                    <h3 className="text-ink mt-2 text-[16px] font-semibold">
                      {n.titulo}
                    </h3>
                    <div className="text-muted mt-1.5 flex flex-col gap-2 text-[14px] leading-relaxed">
                      {n.texto.map((parrafo) => (
                        <p key={parrafo}>{parrafo}</p>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
