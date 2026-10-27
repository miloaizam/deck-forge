"use client";

import { useSyncExternalStore } from "react";
import * as z from "zod/mini";

import { sortCards } from "@/lib/card-order";
import { conErratas } from "@/lib/erratas";
import { cardSchema, type Card, type Formato } from "@/lib/types";

/**
 * El catalogo entero, pedido UNA vez por sesion a `/data/cards.json`.
 *
 * Antes cada pagina lo recibia como props de su Server Component, y eso lo
 * incrustaba dos veces en cada HTML (en el marcado y en el payload de React):
 * ~1,45 MB por pagina que el telefono tenia que parsear e hidratar, y la
 * navbar precargaba el de cuatro paginas mas. Lighthouse lo marcaba como un
 * TBT de ~1 s en movil. Ahora el archivo se baja una vez, el navegador lo
 * revalida con su ETag (`_headers`: `max-age=0, must-revalidate`) y queda en
 * memoria mientras se navega por el sitio.
 *
 * Sale igual que `getCards()`: validado con Zod (CLAUDE.md, seguridad #4),
 * con las erratas aplicadas y en el orden del catalogo. Las erratas dependen
 * del formato (cada uno tiene su Banlist): se baja una vez y se arma una
 * lista por formato, la primera vez que alguien la pide.
 *
 * Es un store de modulo leido con `useSyncExternalStore`: en el servidor y
 * al hidratar no hay catalogo (`cards: null`), asi que el HTML estatico y el
 * primer render del cliente coinciden.
 */

export interface EstadoCatalogo {
  /** `null` mientras se baja o si fallo. */
  cards: Card[] | null;
  error: boolean;
}

/** Un arreglo de cualquier cosa: cada carta la valida `cardSchema` despues. */
const listaSchema = z.array(z.unknown()).check(z.maxLength(10_000));

const CARGANDO: EstadoCatalogo = Object.freeze({ cards: null, error: false });
const FALLO: EstadoCatalogo = Object.freeze({ cards: null, error: true });

let estado: EstadoCatalogo = CARGANDO;
let pedido: Promise<void> | null = null;
/** Las cartas validadas, sin erratas: de ellas sale cada formato. */
let crudas: Card[] | null = null;
const porFormato = new Map<Formato, Card[]>();
const oyentes = new Set<() => void>();

function avisar(siguiente: EstadoCatalogo) {
  estado = siguiente;
  for (const cb of oyentes) cb();
}

/** Cede el hilo principal entre pasos: cada uno es una tarea corta y no una larga. */
const ceder = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Cartas por tanda al validar. Validar las 2650 de una vez era una tarea de
 * ~350 ms en un telefono lento; de a 200, cada tanda queda bajo los 50 ms
 * que el navegador cuenta como bloqueo.
 */
const TANDA = 200;

async function bajar(): Promise<Card[]> {
  const res = await fetch("/data/cards.json");
  if (!res.ok) throw new Error(`cards.json: ${res.status}`);
  const json: unknown = await res.json();
  // La forma de afuera (un arreglo, y no demasiado largo) se valida entera;
  // las cartas, de a tandas. El resultado es el mismo que catalogSchema.
  const lista = listaSchema.parse(json);
  const cards: Card[] = [];
  for (let i = 0; i < lista.length; i += TANDA) {
    await ceder();
    cards.push(...lista.slice(i, i + TANDA).map((c) => cardSchema.parse(c)));
  }
  await ceder();
  crudas = cards;
  const erratadas = cards.map((c) => conErratas(c));
  await ceder();
  const estandar = sortCards(erratadas);
  porFormato.set("estandar", estandar);
  return estandar;
}

/**
 * El catalogo con las erratas de un formato, la misma lista cada vez. `null`
 * mientras no se baje. La de Estandar sale al bajarlo; las otras se arman la
 * primera vez que se piden (unas decenas de ms).
 */
export function cartasDelFormato(formato: Formato): Card[] | null {
  const hecha = porFormato.get(formato);
  if (hecha || !crudas) return hecha ?? null;
  const nueva = sortCards(crudas.map((c) => conErratas(c, formato)));
  porFormato.set(formato, nueva);
  return nueva;
}

function cargar() {
  if (pedido || estado.cards) return;
  pedido = bajar().then(
    (cards) => avisar({ cards, error: false }),
    () => {
      // Se puede reintentar: el proximo `reintentarCatalogo` vuelve a pedir.
      pedido = null;
      avisar(FALLO);
    },
  );
}

/** Tras un fallo de red, vuelve a pedir el catalogo. */
export function reintentarCatalogo() {
  if (estado.cards || pedido) return;
  avisar(CARGANDO);
  cargar();
}

function subscribe(cb: () => void) {
  oyentes.add(cb);
  cargar();
  return () => oyentes.delete(cb);
}

const getSnapshot = () => estado;
const getServerSnapshot = () => CARGANDO;

/** El catalogo, con las erratas del formato (Estandar si no se dice). */
export function useCatalogo(formato: Formato = "estandar"): EstadoCatalogo {
  const e = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (formato === "estandar" || !e.cards) return e;
  return { cards: cartasDelFormato(formato), error: false };
}
