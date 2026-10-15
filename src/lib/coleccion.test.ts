import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  alternarQuiero,
  COLECCION_VACIA,
  conCopias,
  conFaltantes,
  exportarColeccion,
  fusionar,
  importarColeccion,
  MAX_COPIAS_COLECCION,
  parseColeccion,
  porTipo,
  yaLaTengo,
} from "./coleccion";
import {
  codigoDeColeccion,
  coleccionUrl,
  decodeColeccion,
  encodeColeccion,
} from "./coleccion-code";
import { catalogSchema, type Card } from "./types";

const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);

test("lo guardado se lee entrada por entrada: una rota no tira las demas", () => {
  const raw = JSON.stringify({
    v: 1,
    cartas: {
      "bu-001": 2,
      "../x": 1, // id que no es slug
      "bu-002": 0, // cero copias no se guarda
      "bu-003": 1.5,
      "bu-004": MAX_COPIAS_COLECCION + 1,
      "pb-001": 1, // id viejo: se traduce
    },
    quiero: { "bu-010": 2, "bu-001": 1, "bu-011": 9, "bu-012": 500, "../y": 1 },
  });
  assert.deepEqual(parseColeccion(raw), {
    tengo: { "bu-001": 2, "ad-001": 1 },
    // La que ya tiene no puede faltarle, y una faltante lleva el mismo tope.
    quiero: { "bu-010": 2, "bu-011": 9 },
  });
  // La version anterior guardaba las faltantes como lista: una copia de cada una.
  assert.deepEqual(parseColeccion(JSON.stringify({ v: 1, quiero: ["bu-020"] })), {
    tengo: {},
    quiero: { "bu-020": 1 },
  });
  assert.deepEqual(parseColeccion("no es json"), COLECCION_VACIA);
  assert.deepEqual(parseColeccion(null), COLECCION_VACIA);
});

test("las faltantes llevan las copias que se quieran y tenerla la saca de la lista", () => {
  let col = alternarQuiero(COLECCION_VACIA, "bu-001");
  assert.deepEqual(col.quiero, { "bu-001": 1 });
  col = conFaltantes(col, "bu-001", 7);
  assert.equal(col.quiero["bu-001"], 7);
  assert.equal(conFaltantes(col, "bu-001", 500).quiero["bu-001"], MAX_COPIAS_COLECCION);
  // «Ya la tengo» pasa las copias que faltaban.
  col = yaLaTengo(col, "bu-001");
  assert.deepEqual(col, { tengo: { "bu-001": 7 }, quiero: {} });
  // Una que ya tiene no entra a las que faltan.
  assert.equal(alternarQuiero(col, "bu-001"), col);
  col = conCopias(col, "bu-001", 0);
  assert.deepEqual(col, COLECCION_VACIA);
  assert.equal(conCopias(col, "bu-002", 500).tengo["bu-002"], MAX_COPIAS_COLECCION);
});

test("importar se queda con la mayor cantidad y no duplica", () => {
  const actual = { tengo: { "bu-001": 3, "bu-002": 1 }, quiero: { "bu-009": 1 } };
  const archivo = exportarColeccion({
    tengo: { "bu-001": 1, "bu-002": 4, "bu-005": 2 },
    quiero: { "bu-009": 2, "bu-010": 1 },
  });
  const leido = importarColeccion(archivo);
  assert.ok(leido);
  assert.equal(leido.descartadas, 0);
  const una = fusionar(actual, leido.coleccion);
  assert.deepEqual(una, {
    tengo: { "bu-001": 3, "bu-002": 4, "bu-005": 2 },
    quiero: { "bu-009": 2, "bu-010": 1 },
  });
  assert.deepEqual(fusionar(una, leido.coleccion), una);

  // Un respaldo de barajas no es un respaldo de coleccion.
  assert.equal(
    importarColeccion(JSON.stringify({ app: "deckforge", v: 1, mazos: [] })),
    null,
  );
  assert.equal(importarColeccion("{"), null);
});

test("la coleccion va y vuelve por el enlace, entera y corta", () => {
  // Una coleccion grande y desordenada: varias ediciones, copias altas y bajas.
  const tengo: Record<string, number> = {};
  const quiero: Record<string, number> = {};
  CATALOGO.forEach((c, i) => {
    if (i % 3 === 0) tengo[c.id] = (i % 7) + 1;
    else if (i % 11 === 0) quiero[c.id] = (i % 3) + 1;
  });
  tengo[CATALOGO[1].id] = MAX_COPIAS_COLECCION;
  const col = { tengo, quiero };
  const codigo = encodeColeccion(col);
  assert.match(codigo, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeColeccion(codigo), col);
  // ~880 cartas en unos pocos miles de caracteres: cabe en un enlace.
  assert.ok(codigo.length < 4000, `${codigo.length}`);

  const url = coleccionUrl(col, "https://x.dev/");
  assert.ok(url.startsWith("https://x.dev/coleccion/#c="));
  assert.equal(codigoDeColeccion(new URL(url).hash), codigo);
  assert.deepEqual(decodeColeccion(encodeColeccion(COLECCION_VACIA)), COLECCION_VACIA);

  // Lo que no es un codigo no revienta.
  for (const malo of ["", "!!!", "AAAA", "x".repeat(30_000), "_w"]) {
    assert.doesNotThrow(() => decodeColeccion(malo));
  }
  assert.equal(decodeColeccion("!!!"), null);
});

test("porTipo reparte todo el catalogo", () => {
  const grupos = porTipo(CATALOGO);
  assert.equal(
    grupos.reduce((s, g) => s + g.cards.length, 0),
    CATALOGO.length,
  );
});
