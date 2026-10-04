import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { createDeck } from "./deck";
import { buildCardIndex, canAdd, limiteDeCopias, validateDeck } from "./deck-rules";
import { claveDeNombre } from "./documentos";
import {
  efectoEnReglas,
  erratasDe,
  estaBaneada,
  nombresConErrata,
  tieneErrata,
} from "./erratas";
import { catalogSchema, type Card } from "./types";

/** La Fe de Erratas y la Banlist aplicadas, contra el catalogo real. */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);
const INDEX = buildCardIndex(CATALOGO);
const porNombre = (nombre: string) => {
  const c = CATALOGO.find((c) => claveDeNombre(c.nombre) === claveDeNombre(nombre));
  assert.ok(c, nombre);
  return c;
};
const regla = (nombre: string) => INDEX.porId.get(porNombre(nombre).id)!;

test("cada errata y cada baneada nombra una carta del catalogo", () => {
  const nombres = new Set(CATALOGO.map((c) => claveDeNombre(c.nombre)));
  const sueltas = nombresConErrata().filter((n) => !nombres.has(n));
  // "Caida de Sol" es el nombre NUEVO de una errata de nombre: la carta se
  // llama todavia "Caida del Sol" en el catalogo, que guarda el original.
  assert.deepEqual(sueltas, [claveDeNombre("Caída de Sol")]);
});

test("la errata alcanza a todas las impresiones, Arte Alternativo incluido", () => {
  // Sarras: Unica por la Banlist, con impresiones en tres ediciones.
  const sarras = CATALOGO.filter((c) => c.nombre === "Sarras");
  assert.ok(sarras.some((c) => c.edicion === "arte-alternativo"));
  for (const c of sarras) {
    assert.ok(tieneErrata(c), c.id);
    assert.equal(limiteDeCopias(INDEX.porId.get(c.id)!), 1, c.id);
  }
});

test("la Banlist vuelve Unicas a sus 31 cartas", () => {
  for (const nombre of [
    "Yestay",
    "Paracelso",
    "Ballesta Gigante",
    "Sarras",
    "Krisna",
    "Ieyasu",
  ]) {
    assert.equal(limiteDeCopias(regla(nombre)), 1, nombre);
  }
  // Las condiciones de las cartas en observacion tambien.
  assert.equal(limiteDeCopias(regla("Wyvern Dorado")), 1);
  assert.equal(limiteDeCopias(regla("Járnvid")), 1);
});

test("Tsukuyomi deja de ser Unica, y los demas efectos a mano", () => {
  assert.equal(efectoEnReglas(porNombre("Tsukuyomi")).unica, false);
  assert.equal(regla("Tsukuyomi").unica, false);
  assert.equal(regla("Arjumand Banu Begum").coste, 1);
  assert.equal(regla("Harionna").atributo, "Oscuridad");
});

test("el catalogo sigue mostrando el texto original", () => {
  // La errata va aparte: la carta no cambia en cards.json.
  const arjumand = porNombre("Arjumand Banu Begum");
  assert.equal(arjumand.coste, 2);
  assert.ok(erratasDe(arjumand).length > 0);
});

test("una baneada se agrega con aviso, y la baraja no cumple", () => {
  const bechard = regla("Bechard");
  assert.ok(estaBaneada(porNombre("Bechard")));
  const deck = createDeck("Con Bechard");
  const check = canAdd(deck, bechard, "principal", INDEX);
  assert.ok(check.ok);
  assert.match(check.ok ? (check.aviso ?? "") : "", /baneada/);

  const conBechard = { ...deck, principal: [{ id: bechard.id, n: 1 }] };
  const issues = validateDeck(conBechard, INDEX);
  const prohibida = issues.find((i) => i.code === "carta-prohibida");
  assert.ok(prohibida);
  assert.equal(prohibida.gravedad, "error");
  assert.match(prohibida.mensaje, /Bechard/);
});

test("con Shingas en la baraja, Karna topa en una copia", () => {
  const shingas = regla("Shingas");
  const karna = regla("Karna");
  const deck = {
    ...createDeck("Desafiante"),
    principal: [
      { id: shingas.id, n: 1 },
      { id: karna.id, n: 2 },
    ],
  };
  assert.ok(validateDeck(deck, INDEX).some((i) => i.code === "shingas-karna"));
  // Sin Shingas, tres Karna estan bien.
  const solo = { ...deck, principal: [{ id: karna.id, n: 3 }] };
  assert.ok(!validateDeck(solo, INDEX).some((i) => i.code === "shingas-karna"));
  // Y con Shingas y una Karna, no entra la segunda.
  const una = { ...deck, principal: [deck.principal[0], { id: karna.id, n: 1 }] };
  assert.equal(canAdd(una, karna, "principal", INDEX).ok, false);
});
