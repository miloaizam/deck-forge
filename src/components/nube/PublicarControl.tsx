"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

interface PublicarControlProps {
  deck: Deck;
  /** Si cumple las reglas: solo se publican las legales. */
  legal: boolean;
  /** `claveAfinidad` de la baraja, que se guarda para listar y filtrar. */
  afinidad: string | null;
}

/**
 * «Privada / Pública» en el detalle de una baraja propia. Con la nube
 * apagada no pinta nada; sin sesion, invita a entrar.
 *
 * Mientras es publica, se vigila que siga diciendo la verdad: si se edito y
 * cambio de afinidad, se corrige la de la lista; si dejo de cumplir, se
 * retira de la Comunidad (solo se publican legales) y se avisa.
 */
export function PublicarControl({ deck, legal, afinidad }: PublicarControlProps) {
  const nube = useNube();
  const [ocupado, setOcupado] = useState(false);
  const [pidiendoAlias, setPidiendoAlias] = useState(false);

  const publico = nube.fase === "con-sesion" ? nube.publicas[deck.id] : undefined;
  const esPublica = publico?.publica ?? false;

  useEffect(() => {
    if (!esPublica) return;
    if (!legal) {
      cambiarPublica(deck, false, null).then(
        () =>
          toast(
            `"${deck.nombre}" ya no cumple las reglas: se retiró de la Comunidad.`,
            "warning",
          ),
        () => undefined,
      );
    } else if (publico && publico.afinidad !== afinidad) {
      void actualizarAfinidad(deck.id, afinidad).catch(() => undefined);
    }
  }, [esPublica, legal, afinidad, publico, deck]);

  if (!NUBE_ACTIVA || nube.fase === "apagada" || nube.fase === "cargando") return null;

  if (nube.fase === "sin-sesion") {
    return (
      <p className="text-muted text-[13px]">
        <Link href="/cuenta" className={ENLACE}>
          Entra con tu cuenta
        </Link>{" "}
        para publicarla en la Comunidad.
      </p>
    );
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
        (e: unknown) => toast(`No se pudo cambiar. ${mensajeDeError(e)}`, "warning"),
      )
      .finally(() => setOcupado(false));
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div role="group" aria-label="Visibilidad de la baraja" className={SEGMENTOS}>
        <button
          type="button"
          aria-pressed={!esPublica}
          disabled={ocupado}
          onClick={() => cambiar(false)}
          className={cn(SEGMENTO, !esPublica ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO)}
        >
          <Lock size={14} aria-hidden="true" />
          Privada
        </button>
        <button
          type="button"
          aria-pressed={esPublica}
          disabled={ocupado || (!esPublica && !legal)}
          onClick={() => cambiar(true)}
          title={
            !legal ? "Solo se pueden publicar barajas que cumplen las reglas" : undefined
          }
          className={cn(
            SEGMENTO,
            esPublica ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO,
            !esPublica && !legal && "cursor-not-allowed opacity-50",
          )}
        >
          <Globe size={14} aria-hidden="true" />
          Pública
        </button>
      </div>

      {!esPublica && !legal && (
        <p className="text-muted text-[12px]">
          Solo se publican las barajas que cumplen.
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
          <p className="mb-2 text-[13px]">
            Antes de publicar, elige el alias que firmará tus barajas. Tu nombre y tu
            correo no se muestran.
          </p>
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
  );
}
