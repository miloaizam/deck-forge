import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  alternarQuiero,
  COLECCION_VACIA,
  coleccionComoTexto,
  conCopias,
  exportarColeccion,
  fusionar,
  importarColeccion,
  MAX_COPIAS_COLECCION,
  parseColeccion,
  porTipo,
} from "./coleccion";
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
    quiero: ["bu-010", "bu-001", 7, "../y"],
  });
  assert.deepEqual(parseColeccion(raw), {
    tengo: { "bu-001": 2, "ad-001": 1 },
    // La que ya tiene no puede faltarle.
    quiero: ["bu-010"],
  });
  // Lo guardado antes de que existiera `quiero` se sigue leyendo.
  assert.deepEqual(parseColeccion(JSON.stringify({ v: 1, cartas: { "bu-001": 1 } })), {
    tengo: { "bu-001": 1 },
    quiero: [],
  });
  assert.deepEqual(parseColeccion("no es json"), COLECCION_VACIA);
  assert.deepEqual(parseColeccion(null), COLECCION_VACIA);
});

test("tener una carta la saca de las que faltan", () => {
  let col = alternarQuiero(COLECCION_VACIA, "bu-001");
  assert.deepEqual(col.quiero, ["bu-001"]);
  col = conCopias(col, "bu-001", 1);
  assert.deepEqual(col, { tengo: { "bu-001": 1 }, quiero: [] });
  // Una que ya tiene no entra a las que faltan.
  assert.equal(alternarQuiero(col, "bu-001"), col);
  col = conCopias(col, "bu-001", 0);
  assert.deepEqual(col, COLECCION_VACIA);
  assert.equal(conCopias(col, "bu-002", 500).tengo["bu-002"], MAX_COPIAS_COLECCION);
});

test("importar se queda con la mayor cantidad y no duplica", () => {
  const actual = { tengo: { "bu-001": 3, "bu-002": 1 }, quiero: ["bu-009"] };
  const archivo = exportarColeccion({
    tengo: { "bu-001": 1, "bu-002": 4, "bu-005": 2 },
    quiero: ["bu-009", "bu-010"],
  });
  const leido = importarColeccion(archivo);
  assert.ok(leido);
  assert.equal(leido.descartadas, 0);
  const una = fusionar(actual, leido.coleccion);
  assert.deepEqual(una, {
    tengo: { "bu-001": 3, "bu-002": 4, "bu-005": 2 },
    quiero: ["bu-009", "bu-010"],
  });
  assert.deepEqual(fusionar(una, leido.coleccion), una);

  // Un respaldo de barajas no es un respaldo de coleccion.
  assert.equal(
    importarColeccion(JSON.stringify({ app: "deckforge", v: 1, mazos: [] })),
    null,
  );
  assert.equal(importarColeccion("{"), null);
});

test("porTipo reparte todo el catalogo y la lista de texto lleva cada carta", () => {
  const grupos = porTipo(CATALOGO);
  assert.equal(
    grupos.reduce((s, g) => s + g.cards.length, 0),
    CATALOGO.length,
  );
  const muestra = CATALOGO.slice(0, 5);
  const texto = coleccionComoTexto("Me faltan", muestra, COLECCION_VACIA, false);
  for (const c of muestra) assert.ok(texto.includes(`${c.nombre} (${c.codigo})`));
});
