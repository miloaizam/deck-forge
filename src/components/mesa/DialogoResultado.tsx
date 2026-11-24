"use client";

import { Flag, Handshake, ThumbsDown, Trophy } from "lucide-react";

import { VentanaMesa } from "./VentanaMesa";
import { BOTON_SECUNDARIO, HOVER_PELIGRO } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type Eleccion = "gane" | "perdi" | "empate" | "rendirme";

interface DialogoResultadoProps {
  rival: string;
  onElegir: (e: Eleccion) => void;
  onCerrar: () => void;
}

/**
 * Terminar el juego en curso (GAME.md, sesion 7): declarar como termino,
 * que el rival confirma, o rendirse, que no espera a nadie.
 */
export function DialogoResultado({ rival, onElegir, onCerrar }: DialogoResultadoProps) {
  const elegir = (e: Eleccion) => {
    onElegir(e);
    onCerrar();
  };
  return (
    <VentanaMesa
      titulo="Terminar el juego"
      onCerrar={onCerrar}
      className="w-[min(26rem,92vw)]"
    >
      <p className="text-muted mt-2 text-[14px]">
        Declara cómo terminó. {rival} lo confirma; si no está de acuerdo, el juego se
        anula y se juega de nuevo.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => elegir("gane")}
          className={cn(BOTON_SECUNDARIO, "text-ink")}
        >
          <Trophy size={16} aria-hidden="true" />
          Gané
        </button>
        <button
          type="button"
          onClick={() => elegir("perdi")}
          className={cn(BOTON_SECUNDARIO, "text-ink")}
        >
          <ThumbsDown size={16} aria-hidden="true" />
          Perdí
        </button>
        <button
          type="button"
          onClick={() => elegir("empate")}
          className={cn(BOTON_SECUNDARIO, "text-ink")}
        >
          <Handshake size={16} aria-hidden="true" />
          Empate
        </button>
      </div>
      <div className="border-line mt-5 border-t pt-4">
        <button
          type="button"
          onClick={() => elegir("rendirme")}
          className={cn(BOTON_SECUNDARIO, HOVER_PELIGRO, "w-full")}
        >
          <Flag size={16} aria-hidden="true" />
          Rendirme
        </button>
        <p className="text-muted mt-2 text-[13px]">
          El juego es para {rival} en el acto, sin esperar su confirmación.
        </p>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
      </div>
    </VentanaMesa>
  );
}
