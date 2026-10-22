"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Copy, EyeOff, Globe, Heart, Lock } from "lucide-react";

import { toast } from "../toast";
import { mensajeDeError } from "./api";
import { AliasForm } from "./AliasForm";
import { actualizarAfinidad, cambiarPublica } from "./comunidad-api";
import { useNube } from "./nube";
import { NUBE_ACTIVA } from "@/lib/supabase-config";
import type { Deck } from "@/lib/types";
import {
  ENLACE,
  PASTILLA,
  SEGMENTO,
  SEGMENTO_ACTIVO,
  SEGMENTO_INACTIVO,
  SEGMENTOS,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

interface Publicar {
  /** «Privada / Pública», para la fila de botones de la baraja. */
  control: ReactNode;
  /** Lo que va debajo: el enlace a la Comunidad, likes, copias y avisos. */
  detalle: ReactNode;
}

/**
 * «Privada / Pública» en el detalle de una baraja propia. Son dos piezas que
 * van en sitios distintos —el selector junto a los demas botones, y debajo
 * su estado en la Comunidad— y comparten estado, por eso es un hook. Con la
 * nube apagada no pinta nada; sin sesion, invita a entrar.
 *
 * Mientras es publica, se vigila que siga diciendo la verdad: si se edito y
 * cambio de afinidad, se corrige la de la lista; si dejo de cumplir, se
 * retira de la Comunidad (solo se publican legales) y se avisa. `activo` en
 * falso (una baraja ajena) lo apaga todo.
 */
function usePublicar(
  deck: Deck,
  /** Si cumple las reglas: solo se publican las legales. */
  legal: boolean,
  /** `claveAfinidad` de la baraja, que se guarda para listar y filtrar. */
  afinidad: string | null,
  activo: boolean,
): Publicar {
  const nube = useNube();
  const [ocupado, setOcupado] = useState(false);
  const [pidiendoAlias, setPidiendoAlias] = useState(false);

  const publico =
    activo && nube.fase === "con-sesion" ? nube.publicas[deck.id] : undefined;
  const esPublica = publico?.publica ?? false;

  useEffect(() => {
    if (!esPublica) return;
    if (!legal) {
      cambiarPublica(deck, false, null).then(
        () =>
          toast(
            `"${deck.nombre}" dejó de ser legal y se quitó de la Comunidad.`,
            "warning",
          ),
        () => undefined,
      );
    } else if (publico && publico.afinidad !== afinidad) {
      void actualizarAfinidad(deck.id, afinidad).catch(() => undefined);
    }
  }, [esPublica, legal, afinidad, publico, deck]);

  if (!activo || !NUBE_ACTIVA || nube.fase === "apagada" || nube.fase === "cargando") {
    return { control: null, detalle: null };
  }

  if (nube.fase === "sin-sesion") {
    return {
      control: null,
      detalle: (
        <p className="text-muted text-[13px]">
          <Link href="/cuenta" className={ENLACE}>
            Inicia sesión
          </Link>{" "}
          para publicarla en la Comunidad.
        </p>
      ),
    };
  }

  const cambiar = (publicar: boolean) => {
    if (publicar === esPublica || ocupado) return;
    if (publicar && !nube.alias) {
      setPidiendoAlias(true);
      return;
    }
    setOcupado(true);
    cambiarPublica(deck, publicar, afinidad)
      .then(
        () =>
          toast(
            publicar
              ? `"${deck.nombre}" publicada en la Comunidad.`
              : `"${deck.nombre}" ya no es pública.`,
            publicar ? "success" : "info",
          ),
        (e: unknown) =>
          toast(`No se pudo cambiar la visibilidad. ${mensajeDeError(e)}`, "warning"),
      )
      .finally(() => setOcupado(false));
  };

  const control = (
    <div
      role="group"
      aria-label="Visibilidad de la baraja"
      className={cn(SEGMENTOS, "h-11")}
    >
      <button
        type="button"
        aria-pressed={!esPublica}
        disabled={ocupado}
        onClick={() => cambiar(false)}
        className={cn(
          SEGMENTO,
          "h-full",
          !esPublica ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO,
        )}
      >
        <Lock size={14} aria-hidden="true" />
        Privada
      </button>
      <button
        type="button"
        aria-pressed={esPublica}
        disabled={ocupado || (!esPublica && !legal)}
        onClick={() => cambiar(true)}
        title={!legal ? "Para publicarla, la baraja tiene que ser legal" : undefined}
        className={cn(
          SEGMENTO,
          "h-full",
          esPublica ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO,
          !esPublica && !legal && "cursor-not-allowed opacity-50",
        )}
      >
        <Globe size={14} aria-hidden="true" />
        Pública
      </button>
    </div>
  );

  const hayDetalle = (!esPublica && !legal) || (esPublica && publico) || pidiendoAlias;
  const detalle = hayDetalle ? (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {!esPublica && !legal && (
        <p className="text-muted text-[12px]">
          Para publicarla, la baraja tiene que ser legal.
        </p>
      )}

      {esPublica && publico && (
        <p className="text-muted flex flex-wrap items-center gap-2 text-[13px]">
          {publico.oculta ? (
            <span className={cn(PASTILLA, "bg-warning-soft text-warning")}>
              <EyeOff size={12} aria-hidden="true" />
              Oculta por moderación
            </span>
          ) : (
            <Link href={`/baraja/?p=${publico.publicId}`} className={ENLACE}>
              Ver en la Comunidad
            </Link>
          )}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Heart size={13} aria-hidden="true" />
            {publico.likes}
            <span className="sr-only">likes</span>
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Copy size={13} aria-hidden="true" />
            {publico.copias}
            <span className="sr-only">copias guardadas</span>
          </span>
        </p>
      )}

      {pidiendoAlias && (
        <div className="border-line bg-panel rounded-card w-full max-w-sm border p-3.5">
          <p className="mb-2 text-[13px]">Para publicar, primero elige un alias.</p>
          <AliasForm
            actual={null}
            onGuardado={() => {
              setPidiendoAlias(false);
              setOcupado(true);
              cambiarPublica(deck, true, afinidad)
                .then(
                  () => toast(`"${deck.nombre}" publicada en la Comunidad.`, "success"),
                  (e: unknown) =>
                    toast(`No se pudo publicar. ${mensajeDeError(e)}`, "warning"),
                )
                .finally(() => setOcupado(false));
            }}
          />
        </div>
      )}
    </div>
  ) : null;

  return { control, detalle };
}

/**
 * `usePublicar` como componente, para usarlo donde la baraja ya esta
 * resuelta (despues de los `return` tempranos del detalle, donde un hook no
 * puede ir). `children` recibe las dos piezas y decide donde va cada una.
 */
export function PublicarControl({
  deck,
  legal,
  afinidad,
  activo,
  children,
}: {
  deck: Deck;
  legal: boolean;
  afinidad: string | null;
  activo: boolean;
  children: (publicar: Publicar) => ReactNode;
}) {
  return children(usePublicar(deck, legal, afinidad, activo));
}
