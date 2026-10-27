import { downloadCardSheet, slugArchivo } from "../card-sheet-image";
import { toast } from "../toast";
import { deckTitle } from "@/lib/deck";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import type { ResolvedDeck, ResolvedEntry } from "@/lib/deck-rules";
import { SECCIONES_DE_LA_BARAJA, type Deck } from "@/lib/types";

/**
 * La baraja como imagen JPEG (el dibujo vive en `card-sheet-image.ts`, que
 * comparte con la coleccion).
 *
 * Solo lleva el nombre, la nota y las cartas: sin conteo, legalidad ni
 * afinidad, que en una imagen para compartir sobran (las cartas ya lo dicen).
 * La excepcion son las cartas baneadas, y las que no son del formato de la
 * baraja: quien recibe la imagen tiene que saber que esa baraja no se puede
 * jugar en el formato, asi que van nombradas bajo el titulo y marcadas en
 * rojo en la grilla. El formato va en la etiqueta de arriba.
 */
export async function downloadDeckImage(deck: Deck, res: ResolvedDeck): Promise<void> {
  const tramos: { titulo: string; filas: ResolvedEntry[]; side: boolean }[] = [
    ...SECCIONES_DE_LA_BARAJA.map(({ tipo, titulo }) => ({
      titulo,
      filas: res.principal.filter((e) => e.card.tipo === tipo),
      side: false,
    })),
    { titulo: "Side deck", filas: res.side, side: true },
  ].filter((t) => t.filas.length > 0);

  const nombres = (cumple: (e: ResolvedEntry) => boolean) => [
    ...new Set(tramos.flatMap((t) => t.filas.filter(cumple).map((e) => e.card.nombre))),
  ];
  const baneadas = nombres((e) => e.card.legalidad === "prohibida");
  const fuera = nombres((e) => e.card.fueraDeFormato !== null);
  const formato = NOMBRE_FORMATO[deck.formato];
  const avisos = [
    baneadas.length &&
      `Baneada${baneadas.length > 1 ? "s" : ""} en la Banlist ${formato}: ${baneadas.join(", ")}`,
    fuera.length && `Fuera de ${formato}: ${fuera.join(", ")}`,
  ].filter((a) => typeof a === "string");

  await downloadCardSheet({
    etiqueta: `Baraja · Escuelas Elementales · ${formato}`,
    titulo: deckTitle(deck),
    nota: deck.descripcion,
    avisoRojo: avisos.length ? avisos.join(". ") : undefined,
    tramos: tramos.map((t) => ({
      titulo: t.titulo,
      cuenta: t.filas.reduce((s, e) => s + e.n, 0),
      cartas: t.filas.map((e) => {
        const inicial = !t.side && e.card.id === deck.oroInicial;
        return {
          thumb: e.card.thumb,
          etiqueta: inicial ? `×${e.n} · inicial` : `×${e.n}`,
          destacada: inicial,
          baneada: e.card.legalidad === "prohibida" || e.card.fueraDeFormato !== null,
        };
      }),
    })),
    archivo: `baraja-${slugArchivo(deckTitle(deck))}`,
  });
}

/** La imagen con su aviso, igual desde la lista y desde el detalle. */
export function descargarImagenDeBaraja(deck: Deck, res: ResolvedDeck): void {
  void downloadDeckImage(deck, res)
    .then(() => toast(`Imagen de "${deckTitle(deck)}" descargada.`, "info"))
    .catch(() => toast("No se pudo generar la imagen de la baraja.", "warning"));
}
