import { Ban, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { DECK_TOTAL, isLegal, type DeckIssue } from "@/lib/deck-rules";
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
 * El color nunca va solo: cada linea lleva su icono y su texto.
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

  const tono = vacia
    ? "border-line"
    : legal
      ? "border-success/50"
      : grave
        ? "border-danger/60 bg-danger/5"
        : "border-warning/50 bg-warning/5";

  return (
    <div className={cn("rounded-card flex flex-col gap-3 border p-3.5", tono, className)}>
      <p
        className={cn(
          "flex items-center gap-2 text-[14px] font-semibold",
          vacia
            ? "text-muted"
            : legal
              ? "text-success"
              : grave
                ? "text-danger"
                : "text-warning",
        )}
      >
        {vacia ? (
          <Info size={16} aria-hidden="true" className="shrink-0" />
        ) : legal ? (
          <CircleCheck size={16} aria-hidden="true" className="shrink-0" />
        ) : grave ? (
          <Ban size={16} aria-hidden="true" className="shrink-0" />
        ) : (
          <TriangleAlert size={16} aria-hidden="true" className="shrink-0" />
        )}
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
              "h-full rounded-full transition-[width] duration-300",
              total === DECK_TOTAL
                ? "bg-success"
                : total > DECK_TOTAL
                  ? "bg-danger"
                  : "bg-brand-500",
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
          <ul className="flex flex-col gap-1.5 text-[13px] leading-snug">
            {[
              // Lo que saca la baraja del formato va primero.
              ...errores.filter((i) => GRAVES.has(i.code)),
              ...errores.filter((i) => !GRAVES.has(i.code)),
              ...avisos,
            ].map((i, n) => (
              <li key={`${i.code}-${n}`} className="aparece text-ink flex gap-2">
                {GRAVES.has(i.code) ? (
                  <Ban
                    size={14}
                    aria-hidden="true"
                    className="text-danger mt-0.5 shrink-0"
                  />
                ) : i.gravedad === "error" ? (
                  <TriangleAlert
                    size={14}
                    aria-hidden="true"
                    className="text-warning mt-0.5 shrink-0"
                  />
                ) : (
                  <Info
                    size={14}
                    aria-hidden="true"
                    className="text-muted mt-0.5 shrink-0"
                  />
                )}
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
        "rounded-chip inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-[12px] font-semibold",
        estado === "legal" && "bg-success/15 text-success",
        estado === "incompleta" && "bg-warning/15 text-warning",
        estado === "baneada" && "bg-danger/15 text-danger",
        className,
      )}
    >
      <Icono size={13} aria-hidden="true" />
      {estado === "legal" ? "Legal" : estado === "baneada" ? "Con baneada" : "Incompleta"}
    </span>
  );
}
