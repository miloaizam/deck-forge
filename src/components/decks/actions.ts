import { slugArchivo } from "../card-sheet-image";
import { toast } from "../toast";
import { deckTitle } from "@/lib/deck";
import { exportFile, shareUrl } from "@/lib/deck-code";
import type { Deck } from "@/lib/types";

/**
 * Compartir y descargar una baraja.
 *
 * Viven aparte porque las usan la lista y el detalle, y duplicarlas era la via
 * segura a que una copiara un enlace con otro formato que la otra. Cada una da
 * su propio aviso, asi que las dos vistas dicen lo mismo.
 */

/** Copia el enlace de la baraja y avisa si se pudo. */
export async function copyShareLink(deck: Deck): Promise<void> {
  try {
    await navigator.clipboard.writeText(shareUrl(deck, window.location.origin));
    toast(`Enlace de "${deckTitle(deck)}" copiado al portapapeles.`, "info");
  } catch {
    // Sin permiso de portapapeles (o sin HTTPS) no hay a que recurrir salvo
    // decirlo: el enlace es demasiado largo para pedir que lo copien a mano.
    toast("No se pudo copiar el enlace. Revisa los permisos del navegador.", "warning");
  }
}

/**
 * Copia la direccion de una baraja de la Comunidad (`/baraja/?p=`). No lleva
 * las cartas, como el enlace de siempre: sigue al dia si su dueno la edita, y
 * quien la abre puede darle like.
 */
export async function copyPublicLink(deck: Deck, publicId: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(
      `${window.location.origin}/baraja/?p=${publicId}`,
    );
    toast(`Enlace de "${deckTitle(deck)}" copiado al portapapeles.`, "info");
  } catch {
    toast("No se pudo copiar el enlace. Revisa los permisos del navegador.", "warning");
  }
}

/** Baja la baraja como archivo. Todo pasa en el navegador: nada sale del origen. */
export function downloadDeck(deck: Deck): void {
  const blob = new Blob([exportFile([deck])], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `baraja-${slugNombre(deck)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Baraja "${deckTitle(deck)}" exportada a un archivo.`, "info");
}

/** El nombre de la baraja apto para un archivo: "Dragón Control" -> "dragon-control". */
export function slugNombre(deck: Deck): string {
  return slugArchivo(deckTitle(deck));
}
