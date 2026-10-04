import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { decodeDeck, encodeDeck } from "./deck-code";
import { ID_ANTERIORES, idVigente } from "./ids-anteriores";
import { createDeck } from "./deck";
import { catalogSchema, deckSchema, type Card } from "./types";

const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);
const ids = new Set(CATALOGO.map((c) => c.id));

test("cada id anterior apunta a una carta que existe", () => {
  for (const [viejo, nuevo] of Object.entries(ID_ANTERIORES)) {
    assert.ok(ids.has(nuevo), `${viejo} -> ${nuevo} no esta en el catalogo`);
  }
});

test("ningun id anterior sigue en uso", () => {
  // Si un id viejo vuelve a nombrar una carta, las barajas que lo traen
  // cambiarian de carta sin aviso.
  for (const viejo of Object.keys(ID_ANTERIORES)) assert.ok(!ids.has(viejo), viejo);
});

test("una baraja guardada con ids viejos se lee con los nuevos", () => {
  const guardada = {
    ...createDeck("Vieja"),
    oroInicial: null,
    principal: [
      { id: "pb-002", n: 1 },
      { id: "pa-004", n: 2 },
      { id: "dh-028", n: 1 },
      { id: "te-019", n: 1 },
    ],
    side: [{ id: "pa-001", n: 1 }],
  };
  const leida = deckSchema.parse(guardada);
  assert.deepEqual(
    leida.principal.map((e) => e.id),
    ["ad-002", "ad-020", "ad-036", "aa-002"],
  );
  assert.equal(leida.side[0].id, "ad-027");
  assert.equal(idVigente("bu-001"), "bu-001");
});

test("un enlace compartido con ids viejos se abre con los nuevos", () => {
  const baraja = { ...createDeck("Enlace"), principal: [{ id: "pb-102", n: 1 }] };
  const codigo = encodeDeck(baraja);
  const res = decodeDeck(codigo);
  assert.ok(res.ok);
  assert.equal(res.ok && res.deck.principal[0].id, "ad-018");
});

test("ninguna traduccion lleva a otro id viejo", () => {
  // La tabla no encadena: si un destino fuera a su vez un id viejo, la
  // carta se perderia en el segundo salto.
  for (const nuevo of Object.values(ID_ANTERIORES)) {
    assert.ok(!Object.hasOwn(ID_ANTERIORES, nuevo), nuevo);
  }
});
