import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  coleccionComoTexto,
  conCopias,
  exportarColeccion,
  fusionar,
  importarColeccion,
  MAX_COPIAS_COLECCION,
  parseColeccion,
  porcentaje,
  porTipo,
  resumir,
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
  });
  assert.deepEqual(parseColeccion(raw), { "bu-001": 2, "ad-001": 1 });
  assert.deepEqual(parseColeccion("no es json"), {});
  assert.deepEqual(parseColeccion(JSON.stringify([1, 2])), {});
  assert.deepEqual(parseColeccion(null), {});
});

test("conCopias acota y saca la impresion al llegar a cero", () => {
  let col = conCopias({}, "bu-001", 3);
  assert.deepEqual(col, { "bu-001": 3 });
  col = conCopias(col, "bu-001", 0);
  assert.deepEqual(col, {});
  assert.equal(conCopias({}, "bu-001", 500)["bu-001"], MAX_COPIAS_COLECCION);
});

test("importar se queda con la mayor cantidad y no duplica", () => {
  const actual = { "bu-001": 3, "bu-002": 1 };
  const archivo = exportarColeccion({ "bu-001": 1, "bu-002": 4, "bu-005": 2 });
  const leido = importarColeccion(archivo);
  assert.ok(leido);
  assert.equal(leido.descartadas, 0);
  const una = fusionar(actual, leido.cartas);
  assert.deepEqual(una, { "bu-001": 3, "bu-002": 4, "bu-005": 2 });
  assert.deepEqual(fusionar(una, leido.cartas), una);

  // Un respaldo de barajas no es un respaldo de coleccion.
  assert.equal(
    importarColeccion(JSON.stringify({ app: "deckforge", v: 1, mazos: [] })),
    null,
  );
  assert.equal(importarColeccion("{"), null);
});

test("el resumen cuenta contra el catalogo real", () => {
  const vacio = resumir(CATALOGO, {});
  assert.equal(vacio.impresiones.tengo, 0);
  assert.equal(vacio.impresiones.total, CATALOGO.length);
  assert.equal(
    vacio.porEdicion.reduce((s, e) => s + e.total, 0),
    CATALOGO.length,
  );

  // Dos impresiones de la misma carta son una carta distinta, no dos.
  const porIdentidad = new Map<string, Card[]>();
  for (const c of CATALOGO) {
    porIdentidad.set(c.identidad, [...(porIdentidad.get(c.identidad) ?? []), c]);
  }
  const [a, b] = [...porIdentidad.values()].find((l) => l.length >= 2) ?? [];
  assert.ok(a && b);
  const r = resumir(CATALOGO, { [a.id]: 5, [b.id]: 1, "zz-999": 2 });
  assert.equal(r.impresiones.tengo, 2);
  assert.equal(r.cartas.tengo, 1);
  assert.equal(r.copias, 6); // la id desconocida no cuenta
  assert.equal(r.repetidas, 1);
});

test("porcentaje no dice 100 sin estar completa", () => {
  assert.equal(porcentaje({ tengo: 2651, total: 2652 }), 99);
  assert.equal(porcentaje({ tengo: 2652, total: 2652 }), 100);
  assert.equal(porcentaje({ tengo: 0, total: 0 }), 0);
});

test("porTipo reparte todo el catalogo y la lista de texto lleva cada carta", () => {
  const grupos = porTipo(CATALOGO);
  assert.equal(
    grupos.reduce((s, g) => s + g.cards.length, 0),
    CATALOGO.length,
  );
  const muestra = CATALOGO.slice(0, 5);
  const texto = coleccionComoTexto("Me faltan", muestra, {}, false);
  for (const c of muestra) assert.ok(texto.includes(`${c.nombre} (${c.codigo})`));
});
