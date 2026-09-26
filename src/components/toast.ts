"use client";

import { useSyncExternalStore } from "react";

/**
 * Avisos flotantes: "Enlace copiado", "Borré la baraja", "No cabe otra copia".
 *
 * Es un store de modulo y no un contexto de React, por dos motivos. Cualquier
 * vista pide un aviso llamando a `toast()`, sin providers ni props que pasar.
 * Y el modulo sobrevive a la navegacion del lado del cliente: un aviso pedido
 * justo antes de `router.push` se sigue viendo en la pagina de llegada, que es
 * lo que hace falta al borrar una baraja desde su detalle.
 *
 * Lo pinta `Toaster`, montado una sola vez en el layout de (app).
 */

export type ToastTone = "ok" | "error";

export interface Toast {
  id: number;
  texto: string;
  tono: ToastTone;
  /** Ya se pidio cerrarlo: esta en la animacion de salida. */
  saliendo: boolean;
  /**
   * Cuantas veces se repitio el mismo aviso mientras estaba a la vista. Al
   * cambiar reinicia el temporizador en vez de apilar un duplicado: pulsar
   * cinco veces un "+" bloqueado no deja cinco avisos iguales.
   */
  vez: number;
}

/** Mas de tres a la vez ya no se leen: el mas viejo se va. */
const MAX_A_LA_VISTA = 3;

/** Lo que dura la salida en CSS (`.aviso` en globals.css). */
export const SALIDA_MS = 200;

let toasts: Toast[] = [];
let siguienteId = 1;
const listeners = new Set<() => void>();

function emitir(lista: Toast[]): void {
  toasts = lista;
  for (const l of listeners) l();
}

export function toast(texto: string, tono: ToastTone = "ok"): void {
  const igual = toasts.find((t) => !t.saliendo && t.texto === texto);
  if (igual) {
    emitir(toasts.map((t) => (t === igual ? { ...t, vez: t.vez + 1 } : t)));
    return;
  }

  emitir([...toasts, { id: siguienteId++, texto, tono, saliendo: false, vez: 0 }]);
  const vivos = toasts.filter((t) => !t.saliendo);
  if (vivos.length > MAX_A_LA_VISTA) dismissToast(vivos[0].id);
}

/** Lo marca como saliendo y lo quita cuando termino la animacion. */
export function dismissToast(id: number): void {
  const t = toasts.find((x) => x.id === id);
  if (!t || t.saliendo) return;
  emitir(toasts.map((x) => (x.id === id ? { ...x, saliendo: true } : x)));
  setTimeout(() => emitir(toasts.filter((x) => x.id !== id)), SALIDA_MS);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const SIN_AVISOS: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => SIN_AVISOS,
  );
}
