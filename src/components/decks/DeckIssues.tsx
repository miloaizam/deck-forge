import { Ban, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { DECK_TOTAL, isLegal, type DeckIssue } from "@/lib/deck-rules";
import { PASTILLA } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface DeckIssuesProps {
  issues: DeckIssue[];
  /** Cartas del principal, para la barra de progreso hacia las 50. */
  total: number;
  /** La baraja no lleva ninguna carta: se guia en vez de reganar. */
  vacia: boolean;
  /** Si muestra la barra de progreso. El detalle ya dice el conteo arriba. */
  progreso?: boolean;
  className?: string;
}

/** Lo que deja la baraja fuera del formato aunque este completa. */
const GRAVES = new Set<DeckIssue["code"]>(["carta-prohibida"]);

/**
 * El estado de una baraja: si cumple, cuanto le falta y que hay que corregir.
 *
 * Lo comparten el panel del constructor y el detalle, para que digan lo mismo
 * con el mismo color: rojo lo que la saca del formato (una baneada), ambar lo
 * que todavia falta, y una guia neutra mientras la baraja esta vacia —una lista
 * de cuatro errores a quien todavia no hizo nada es un reto, no una ayuda—.
 * Caja, barra, titulo y lista van del mismo tono. El color nunca va solo: el
 * titulo lleva su icono y cada linea dice con palabras que falta.
 */
export function DeckIssues({
  issues,
  total,
  vacia,
  progreso = true,
  className,
}: DeckIssuesProps) {
  const legal = isLegal(issues);
  const errores = issues.filter((i) => i.gravedad === "error");
  const avisos = issues.filter((i) => i.gravedad === "aviso");
  const grave = errores.some((i) => GRAVES.has(i.code));
  const pct = Math.min(100, Math.round((total / DECK_TOTAL) * 100));

  // Un solo tono para todo: la caja, la barra, el titulo y la lista. Verde si
  // cumple, rojo si esta fuera del formato, ambar si le falta algo y neutro
  // mientras esta vacia.
  const tono = vacia ? "neutro" : legal ? "ok" : grave ? "fuera" : "falta";
  const COLOR = {
    neutro: {
      caja: "border-line",
      texto: "text-muted",
      barra: "bg-brand-500",
      punto: "bg-muted",
    },
    ok: {
      caja: "border-success/50 bg-success/5",
      texto: "text-success",
      barra: "bg-success",
      punto: "bg-success",
    },
    fuera: {
      caja: "border-danger/60 bg-danger/5",
      texto: "text-danger",
      barra: "bg-danger",
      punto: "bg-danger",
    },
    falta: {
      caja: "border-warning/50 bg-warning-soft",
      texto: "text-warning",
      barra: "bg-warning",
      punto: "bg-warning",
    },
  }[tono];
  const Icono = { neutro: Info, ok: CircleCheck, fuera: Ban, falta: TriangleAlert }[tono];

  return (
    <div
      className={cn(
        "rounded-card flex flex-col gap-3 border p-3.5",
        COLOR.caja,
        className,
      )}
    >
      <p className={cn("flex items-center gap-2 text-[14px] font-semibold", COLOR.texto)}>
        <Icono size={16} aria-hidden="true" className="shrink-0" />
        {vacia
          ? "Baraja vacía"
          : legal
            ? "La baraja cumple las reglas del formato"
            : grave
              ? "Fuera del formato"
              : errores.length === 1
                ? "Incompleta: 1 cosa por corregir"
                : `Incompleta: ${errores.length} cosas por corregir`}
      </p>

      {progreso && (
        <div
          role="progressbar"
          aria-label="Cartas de la baraja"
          aria-valuemin={0}
          aria-valuemax={DECK_TOTAL}
          aria-valuenow={total}
          className="bg-line h-1.5 overflow-hidden rounded-full"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width,background-color] duration-300",
              COLOR.barra,
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {vacia ? (
        <p className="text-muted text-[13px] leading-relaxed">
          Agrega cartas con el botón <span className="text-accent">+</span>. La baraja
          lleva {DECK_TOTAL} cartas, un oro inicial y al menos 15 Aliados o 15 Tótems.
        </p>
      ) : (
        (errores.length > 0 || avisos.length > 0) && (
          // Una lista de verdad, con su punto del color de la caja: el icono
          // ya va en el titulo y repetirlo en cada linea era ruido.
          <ul
            className={cn("flex flex-col gap-1.5 text-[13px] leading-snug", COLOR.texto)}
          >
            {[
              // Lo que saca la baraja del formato va primero.
              ...errores.filter((i) => GRAVES.has(i.code)),
              ...errores.filter((i) => !GRAVES.has(i.code)),
              ...avisos,
            ].map((i, n) => (
              <li key={`${i.code}-${n}`} className="aparece flex gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-[0.45em] size-1.5 shrink-0 rounded-full",
                    COLOR.punto,
                  )}
                />
                {i.mensaje}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/** En que estado esta una baraja, para la pastilla de su tarjeta o barra. */
export type EstadoDeBaraja = "legal" | "incompleta" | "baneada";

export function estadoDeBaraja(issues: DeckIssue[]): EstadoDeBaraja {
  if (isLegal(issues)) return "legal";
  return issues.some((i) => GRAVES.has(i.code)) ? "baneada" : "incompleta";
}

/**
 * El estado en una pastilla con fondo: la lista de barajas y la barra del
 * constructor en el telefono. Antes era texto gris, y "Incompleto" se perdía
 * junto a la fecha.
 */
export function EstadoPastilla({
  estado,
  className,
}: {
  estado: EstadoDeBaraja;
  className?: string;
}) {
  const Icono =
    estado === "legal" ? CircleCheck : estado === "baneada" ? Ban : TriangleAlert;
  return (
    <span
      className={cn(
        PASTILLA,
        "font-semibold",
        // /10 y no /15: en el tema claro el verde sobre /15 quedaba en 4,43:1.
        estado === "legal" && "bg-success/10 text-success",
        estado === "incompleta" && "bg-warning-soft text-warning",
        estado === "baneada" && "bg-danger/15 text-danger",
        className,
      )}
    >
      <Icono size={13} aria-hidden="true" />
      {estado === "legal" ? "Legal" : estado === "baneada" ? "Con baneada" : "Incompleta"}
    </span>
  );
}
