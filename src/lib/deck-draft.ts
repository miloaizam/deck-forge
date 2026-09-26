import { deckSchema, type Deck } from "./types";

/**
 * El borrador del constructor: la baraja en curso, guardada sola en el
 * navegador mientras se arma, para que refrescar, cambiar de vista o cerrar la
 * pestana no la pierda.
 *
 * Va aparte de las barajas guardadas, en su propia clave y con UNA sola
 * ranura: es "lo que estaba armando", no una baraja mas. Con dos pestanas del
 * constructor abiertas manda la ultima que escribio.
 *
 * Como todo lo que sale de localStorage, se valida con Zod al leerlo
 * (seguridad #4 de CLAUDE.md): lo puede editar el usuario o una extension.
 */

export const DRAFT_KEY = "deckforge-borrador";

/** Cota antes de parsear: una baraja entera pesa unos pocos KB. */
const MAX_CHARS = 64 * 1024;

export interface Draft {
  /**
   * El id de la baraja guardada que se estaba editando, o `null` si era una
   * nueva. Sirve para saber, al volver con `?m=<id>`, si el borrador es de
   * esa baraja o de otra.
   */
  base: string | null;
  deck: Deck;
}

const disponible = () => typeof window !== "undefined";

export function parseDraft(raw: string | null): Draft | null {
  if (!raw || raw.length > MAX_CHARS) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof bruto !== "object" || bruto === null) return null;
  if (!("v" in bruto) || bruto.v !== 1 || !("deck" in bruto)) return null;
  const deck = deckSchema.safeParse(bruto.deck);
  if (!deck.success) return null;
  const base = "base" in bruto && typeof bruto.base === "string" ? bruto.base : null;
  return { base, deck: deck.data };
}

export function readDraft(): Draft | null {
  if (!disponible()) return null;
  try {
    return parseDraft(localStorage.getItem(DRAFT_KEY));
  } catch {
    return null; // ventana privada, almacenamiento bloqueado
  }
}

/** Escribe el borrador. Si no puede (cuota llena), no pasa nada: es un extra. */
export function writeDraft(deck: Deck, base: string | null): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, base, deck }));
  } catch {
    // Sin borrador se vuelve a como era antes: nada se rompe.
  }
}

export function clearDraft(): void {
  if (!disponible()) return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // idem
  }
}

/** La baraja sin las marcas de tiempo, que cambian sin que cambie nada. */
const contenido = (d: Deck) => JSON.stringify({ ...d, creado: 0, actualizado: 0 });

/**
 * Si vale la pena guardar `deck` como borrador.
 *
 * Una baraja nueva, si ya tiene algo: una carta, un nombre o una nota. Una que
 * se esta editando, si difiere de la version guardada. Asi, abrir el
 * constructor o una baraja y no tocar nada no deja un borrador que despues
 * aparezca "recuperado" sin que haya nada que recuperar.
 */
export function hayCambios(deck: Deck, guardada: Deck | null): boolean {
  if (guardada) return contenido(deck) !== contenido(guardada);
  return (
    deck.principal.length > 0 ||
    deck.side.length > 0 ||
    deck.nombre.trim() !== "" ||
    deck.descripcion.trim() !== ""
  );
}
