import { Check, Hourglass, UserPlus } from "lucide-react";

import { Avatar } from "../nube/Avatar";
import { enLaSala, miLado, nombreEnSala, type Sala } from "@/lib/mesa/sala";
import { victoriasParaGanar } from "@/lib/mesa/serie";
import { cn } from "@/lib/utils";

type Modo =
  /** Antes del primer juego: cada uno elige su baraja. */
  | { tipo: "sala" }
  /** Entre juegos: cada uno hace sus cambios para el juego `juego`. */
  | { tipo: "entre"; juego: number };

interface EnfrentamientoProps {
  sala: Sala;
  uid: string;
  /** Cuando llego la ultima respuesta, en el reloj de este navegador. */
  recibida: number;
  modo: Modo;
}

const PANEL = "border-line bg-panel rounded-panel border p-5 sm:p-6";

/**
 * Los dos jugadores frente a frente: su foto, su nombre, como van y si tienen
 * la sala abierta, con el medallon del VS en medio. Entre juegos suma el
 * avance de la serie, un punto por victoria que hace falta.
 */
export function Enfrentamiento({ sala, uid, recibida, modo }: EnfrentamientoProps) {
  const yo = miLado(sala, uid);
  return (
    <section
      aria-label="Jugadores"
      className={cn(
        PANEL,
        "grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-6",
      )}
    >
      <Jugador sala={sala} lado="a" yo={yo} recibida={recibida} modo={modo} />

      <div className="flex flex-col items-center gap-1.5">
        <span
          aria-hidden="true"
          className="bg-accent-soft text-accent border-brand-500/40 grid size-14 place-items-center rounded-full border text-lg font-bold tracking-[0.04em]"
        >
          VS
        </span>
        <span className="text-muted text-[13px] whitespace-nowrap">
          {modo.tipo === "entre" ? `Juego ${modo.juego}` : `Al mejor de ${sala.mejor_de}`}
        </span>
      </div>

      <Jugador sala={sala} lado="b" yo={yo} recibida={recibida} modo={modo} espejo />
    </section>
  );
}

interface JugadorProps {
  sala: Sala;
  lado: "a" | "b";
  yo: "a" | "b" | null;
  recibida: number;
  modo: Modo;
  /** El de la derecha: todo alineado al otro lado. */
  espejo?: boolean;
}

function Jugador({ sala, lado, yo, recibida, modo, espejo = false }: JugadorProps) {
  const fila = cn(
    "flex items-center gap-4",
    espejo && "sm:flex-row-reverse sm:text-right",
  );

  // El asiento vacio: el rival todavia no entra.
  if (lado === "b" && sala.jugador_b === null) {
    return (
      <div className={fila}>
        <span
          aria-hidden="true"
          className="border-line text-muted grid size-16 shrink-0 place-items-center rounded-full border-2 border-dashed"
        >
          <UserPlus size={24} />
        </span>
        <div className="min-w-0">
          <p className="text-ink text-lg font-semibold">Esperando rival…</p>
          <p className="text-muted mt-0.5 text-[14px]">
            Comparte el código <strong className="text-ink">{sala.codigo}</strong> o el
            enlace.
          </p>
        </div>
      </div>
    );
  }

  const listo = lado === "a" ? sala.listo_a : sala.listo_b;
  const presente = enLaSala(sala, lado, recibida, recibida);
  const estado =
    modo.tipo === "entre"
      ? listo
        ? `Listo para el juego ${modo.juego}`
        : "Haciendo sus cambios"
      : listo
        ? "Listo"
        : "Eligiendo baraja";
  const necesarias = victoriasParaGanar(sala.mejor_de);
  const ganadas = lado === "a" ? sala.victorias_a : sala.victorias_b;

  return (
    <div className={fila}>
      {/* Con el anillo verde cuando ya esta listo. */}
      <span
        className={cn(
          "ring-offset-panel shrink-0 rounded-full ring-2 ring-offset-2",
          listo ? "ring-success" : "ring-transparent",
        )}
      >
        <Avatar ruta={lado === "a" ? sala.avatar_a : sala.avatar_b} lado={64} />
      </span>

      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-ink truncate text-lg font-semibold">
          {nombreEnSala(sala, lado)}
          {lado === yo && (
            <span className="text-muted ml-1.5 text-[13px] font-normal">(tú)</span>
          )}
        </p>

        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1",
            espejo && "sm:justify-end",
          )}
        >
          {/* Sin el relleno de PASTILLA: sin fondo, ese relleno la corria
              respecto del nombre. */}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-medium",
              listo ? "text-success" : "text-muted",
            )}
          >
            {listo ? (
              <Check size={12} aria-hidden="true" />
            ) : (
              <Hourglass size={12} aria-hidden="true" />
            )}
            {estado}
          </span>
          <span className="text-muted inline-flex items-center gap-1.5 text-[12px]">
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                presente ? "bg-success" : "bg-muted/50",
              )}
            />
            {presente ? "En la sala" : "Fuera de la sala"}
          </span>
        </div>

        {/* El avance de la serie: un punto por cada victoria que hace falta. */}
        {modo.tipo === "entre" && (
          <p className={cn("flex items-center gap-1.5", espejo && "sm:justify-end")}>
            <span className="sr-only">
              {ganadas} de {necesarias} victorias para ganar la serie
            </span>
            {Array.from({ length: necesarias }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  "size-2.5 rounded-full",
                  i < ganadas ? "bg-accent" : "border-line border",
                )}
              />
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
