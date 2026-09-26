import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { addCard, createDeck, setQuantity, setStartingGold } from "./deck";
import { buildCardIndex, resolveDeck } from "./deck-rules";
import { barajar, mazoParaRobar, robarMano, MANO_INICIAL } from "./hand-test";
import { catalogSchema, type Card } from "./types";

const cards: Card[] = catalogSchema.parse(
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, "..", "..", "public", "data", "cards.json"),
      "utf-8",
    ),
  ),
);
const index = buildCardIndex(cards);
const oro = cards.find((c) => c.tipo === "Oro" && c.habilidad === "")!;
const talismanes = cards.filter((c) => c.tipo === "Talismán").slice(0, 16);

/** Azar fijo y repetible, para que el test no dependa de la suerte. */
function semilla(s: number): () => number {
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

function baraja() {
  let deck = setStartingGold(createDeck("Prueba"), oro.id);
  for (const t of talismanes) deck = setQuantity(deck, t.id, "principal", 3);
  deck = addCard(deck, oro.id, "side");
  return deck;
}

test("el mazo que se baraja deja fuera el oro inicial y el side", () => {
  const deck = baraja();
  const mazo = mazoParaRobar(resolveDeck(deck, index), deck.oroInicial);
  assert.equal(mazo.length, 48, "16 talismanes x 3, sin el oro inicial");
  assert.ok(!mazo.includes(oro.id));
});

test("con copias de mas del oro inicial, solo se aparta una", () => {
  const deck = setQuantity(baraja(), oro.id, "principal", 3);
  const mazo = mazoParaRobar(resolveDeck(deck, index), deck.oroInicial);
  assert.equal(mazo.filter((id) => id === oro.id).length, 2);
});

test("la mano nunca trae el oro inicial y tiene el tamano pedido", () => {
  const deck = baraja();
  const mazo = mazoParaRobar(resolveDeck(deck, index), deck.oroInicial);
  const azar = semilla(7);
  for (let i = 0; i < 200; i++) {
    const mano = robarMano(mazo, MANO_INICIAL - (i % 8), azar);
    assert.equal(mano.length, MANO_INICIAL - (i % 8));
    assert.ok(!mano.includes(oro.id));
  }
  assert.equal(
    robarMano(mazo.slice(0, 3), 8, azar).length,
    3,
    "no roba mas de lo que hay",
  );
});

test("barajar no pierde ni inventa cartas", () => {
  const mazo = Array.from({ length: 49 }, (_, i) => `c${i}`);
  const barajado = barajar(mazo, semilla(3));
  assert.deepEqual([...barajado].sort(), [...mazo].sort());
  assert.notDeepEqual(barajado, mazo);
});
