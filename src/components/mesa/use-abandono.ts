"use client";

import { useEffect, useRef, useState } from "react";

import { reclamarAbandono } from "./sala-api";
import type { Lado } from "@/lib/mesa/red";
import { restanteDeGracia, type Sala } from "@/lib/mesa/sala";

/**
 * La cuenta regresiva de un rival que se fue (GAME.md §2, sesiones 6 y 7):
 * con `ausente`, cuantos ms le quedan para volver, contados desde su ultima
 * senal y con la hora de la base. Al llegar a cero pide la serie una vez, y
 * la base decide; si responde que todavia no, se vuelve a pedir en un rato.
 * `null` si el rival esta o no hay con que contar.
 */
export function useAbandono(
  mesa: string,
  sala: Sala,
  rival: Lado,
  recibida: number,
  ausente: boolean,
): number | null {
  const [ahora, setAhora] = useState(() => Date.now());
  const [intento, setIntento] = useState(0);
  const reclamando = useRef(false);

  useEffect(() => {
    if (!ausente) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ausente]);

  const restante = ausente ? restanteDeGracia(sala, rival, recibida, ahora) : null;

  useEffect(() => {
    if (restante !== 0 || reclamando.current) return;
    reclamando.current = true;
    reclamarAbandono(mesa).catch(() => {
      setTimeout(() => {
        reclamando.current = false;
        setIntento((n) => n + 1);
      }, 5000);
    });
  }, [restante, mesa, intento]);

  return restante;
}

/** Los minutos y segundos que quedan, «1:43». */
export function reloj(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
