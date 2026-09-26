import { test } from "node:test";
import assert from "node:assert/strict";

import { addCard, createDeck, renameDeck } from "./deck";
import { hayCambios, parseDraft } from "./deck-draft";

/**
 * El borrador sale de localStorage, que lo puede tocar cualquiera: lo que
 * importa es que nada raro lance, y que una baraja sin cambios no deje
 * borrador.
 */

const sobre = (x: unknown) => JSON.stringify(x);

test("ida y vuelta", () => {
  const deck = addCard(renameDeck(createDeck(), "Dragones"), "bu-001", "principal");
  const leido = parseDraft(sobre({ v: 1, base: null, deck }));
  assert.ok(leido);
  assert.equal(leido.base, null);
  assert.equal(leido.deck.nombre, "Dragones");
  assert.deepEqual(leido.deck.principal, deck.principal);
  assert.equal(parseDraft(sobre({ v: 1, base: deck.id, deck }))?.base, deck.id);
});

test("lo que no es un borrador valido da null, sin lanzar", () => {
  for (const raw of [
    null,
    "",
    "no es json",
    "null",
    "[]",
    sobre({ v: 2, base: null, deck: createDeck() }),
    sobre({ v: 1, base: null }),
    sobre({ v: 1, base: null, deck: { nombre: "sin nada mas" } }),
    "x".repeat(70 * 1024),
  ]) {
    assert.equal(parseDraft(raw), null, String(raw).slice(0, 40));
  }
});

test("una base que no es texto se lee como baraja nueva", () => {
  assert.equal(parseDraft(sobre({ v: 1, base: 42, deck: createDeck() }))?.base, null);
});

test("una baraja nueva vacia no cuenta; con una carta o un nombre, si", () => {
  const vacia = createDeck();
  assert.equal(hayCambios(vacia, null), false);
  assert.equal(hayCambios(renameDeck(vacia, "  "), null), false);
  assert.equal(hayCambios(renameDeck(vacia, "Oni"), null), true);
  assert.equal(hayCambios(addCard(vacia, "bu-001", "principal"), null), true);
});

test("una guardada sin tocar no cuenta, aunque cambie la fecha", () => {
  const guardada = addCard(renameDeck(createDeck(), "Oni"), "bu-001", "principal");
  assert.equal(
    hayCambios({ ...guardada, actualizado: guardada.actualizado + 999 }, guardada),
    false,
  );
  assert.equal(hayCambios(addCard(guardada, "bu-002", "principal"), guardada), true);
});
