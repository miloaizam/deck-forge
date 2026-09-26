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
    toast("Enlace copiado.");
  } catch {
    // Sin permiso de portapapeles (o sin HTTPS) no hay a que recurrir salvo
    // decirlo: el enlace es demasiado largo para pedir que lo copien a mano.
    toast("No pude copiar el enlace. Revisa los permisos del navegador.", "error");
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
  toast(`Exporté "${deckTitle(deck)}" a un archivo.`);
}

function slugNombre(deck: Deck): string {
  const base = deckTitle(deck)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "sin-nombre";
}
