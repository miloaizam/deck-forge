import { deckTitle } from "./deck";
import type { ResolvedDeck, ResolvedEntry } from "./deck-rules";
import { SECCIONES_DE_LA_BARAJA, type Deck } from "./types";

/**
 * La baraja como lista de texto plano: "3 Akiko Yamamoto", por tipo.
 *
 * Es como se pasan las barajas por Discord o WhatsApp, donde un enlace no
 * dice nada hasta abrirlo. Va en el orden del panel —por tipo y, dentro, en el
 * orden del catalogo— y el oro inicial se nombra aparte.
 */
export function deckAsText(deck: Deck, res: ResolvedDeck): string {
  const lineas = (filas: ResolvedEntry[]) => filas.map((f) => `${f.n} ${f.card.nombre}`);
  const total = (filas: ResolvedEntry[]) => filas.reduce((s, f) => s + f.n, 0);
  const out: string[] = [deckTitle(deck)];

  for (const { tipo, titulo } of SECCIONES_DE_LA_BARAJA) {
    const filas = res.principal.filter((f) => f.card.tipo === tipo);
    if (filas.length === 0) continue;
    out.push("", `${titulo} (${total(filas)})`, ...lineas(filas));
  }

  const oro = res.principal.find((f) => f.card.id === deck.oroInicial);
  if (oro) out.push("", `Oro inicial: ${oro.card.nombre}`);

  if (res.side.length > 0) {
    out.push("", `Side deck (${total(res.side)})`, ...lineas(res.side));
  }
  return out.join("\n");
}
