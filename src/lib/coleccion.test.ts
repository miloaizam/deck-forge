import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  alternarQuiero,
  COLECCION_VACIA,
  coleccionComoTexto,
  conCopias,
  conFaltantes,
  conseguiUna,
  fusionar,
  MAX_COPIAS_COLECCION,
  parseColeccion,
  porTipo,
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
    // Una que tiene puede faltarle (quiere mas), y una faltante lleva el mismo tope.
    quiero: { "bu-010": 2, "bu-001": 1, "bu-011": 9 },
  });
  // La version anterior guardaba las faltantes como lista: una copia de cada una.
  assert.deepEqual(parseColeccion(JSON.stringify({ v: 1, quiero: ["bu-020"] })), {
    tengo: {},
    quiero: { "bu-020": 1 },
  });
  assert.deepEqual(parseColeccion("no es json"), COLECCION_VACIA);
  assert.deepEqual(parseColeccion(null), COLECCION_VACIA);
});

test("las faltantes llevan las copias que se quieran y conviven con las que tiene", () => {
  let col = alternarQuiero(COLECCION_VACIA, "bu-001");
  assert.deepEqual(col.quiero, { "bu-001": 1 });
  col = conFaltantes(col, "bu-001", 7);
  assert.equal(col.quiero["bu-001"], 7);
  assert.equal(conFaltantes(col, "bu-001", 500).quiero["bu-001"], MAX_COPIAS_COLECCION);
  assert.equal(conCopias(col, "bu-002", 500).tengo["bu-002"], MAX_COPIAS_COLECCION);

  // Tiene 1 y quiere 3: le faltan 2.
  col = conFaltantes(conCopias(COLECCION_VACIA, "bu-001", 1), "bu-001", 2);
  assert.deepEqual(col, { tengo: { "bu-001": 1 }, quiero: { "bu-001": 2 } });
  // Sumar en «Tengo» descuenta de las que faltan; bajar no las repone.
  col = conCopias(col, "bu-001", 2);
  assert.deepEqual(col, { tengo: { "bu-001": 2 }, quiero: { "bu-001": 1 } });
  assert.deepEqual(conCopias(col, "bu-001", 1).quiero, { "bu-001": 1 });
  assert.deepEqual(conCopias(col, "bu-001", 0), { tengo: {}, quiero: { "bu-001": 1 } });
  // Pasarse de lo que faltaba la saca de la lista sin dejar negativos.
  assert.deepEqual(conCopias(col, "bu-001", 5), { tengo: { "bu-001": 5 }, quiero: {} });

  // «Conseguí una» pasa de a una copia.
  col = conFaltantes(col, "bu-001", 2);
  col = conseguiUna(col, "bu-001");
  assert.deepEqual(col, { tengo: { "bu-001": 3 }, quiero: { "bu-001": 1 } });
  col = conseguiUna(col, "bu-001");
  assert.deepEqual(col, { tengo: { "bu-001": 4 }, quiero: {} });
  // Sin faltantes no hace nada.
  assert.equal(conseguiUna(col, "bu-001"), col);
});

test("fusionar se queda con la mayor cantidad y no duplica", () => {
  // Es como se juntan la coleccion del navegador y la de la cuenta la primera
  // vez que se inicia sesion en un equipo.
  const actual = {
    tengo: { "bu-001": 3, "bu-002": 1 },
    quiero: { "bu-009": 1, "bu-002": 2 },
  };
  const otra = {
    tengo: { "bu-001": 1, "bu-002": 4, "bu-005": 2 },
    quiero: { "bu-009": 2, "bu-010": 1 },
  };
  const una = fusionar(actual, otra);
  assert.deepEqual(una, {
    tengo: { "bu-001": 3, "bu-002": 4, "bu-005": 2 },
    // La que tiene y le faltan conserva sus faltantes.
    quiero: { "bu-009": 2, "bu-002": 2, "bu-010": 1 },
  });
  assert.deepEqual(fusionar(una, otra), una);
});

test("la coleccion va y vuelve por el enlace, entera y corta", () => {
  // Una coleccion grande y desordenada: varias ediciones, copias altas y bajas.
  const tengo: Record<string, number> = {};
  const quiero: Record<string, number> = {};
  CATALOGO.forEach((c, i) => {
    if (i % 3 === 0) tengo[c.id] = (i % 7) + 1;
    // Algunas en las dos listas: las que tiene y quiere mas.
    if (i % 11 === 0) quiero[c.id] = (i % 3) + 1;
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

test("la lista como texto: titulo, tipos y una linea por carta", () => {
  const akiko = CATALOGO.find((c) => c.id === "ee-050");
  const oro = CATALOGO.find((c) => c.tipo === "Oro" && !c.origen);
  const alterna = CATALOGO.find((c) => c.origen);
  assert.ok(akiko && oro && alterna);
  const texto = coleccionComoTexto("Tengo", [akiko, alterna, oro], {
    [akiko.id]: 3,
    [oro.id]: 1,
    [alterna.id]: 2,
  });
  const lineas = texto.split("\n");
  assert.equal(lineas[0], "*Tengo* (6 cartas)");
  assert.ok(
    lineas.includes(`3x Akiko Yamamoto (Escuelas Elementales, ${akiko.frecuencia})`),
  );
  // El arte alternativo dice de donde sale, como en la imagen.
  assert.ok(lineas.some((l) => l.startsWith(`2x ${alterna.nombre} (Arte de `)));
  // Los Oros van al final, como en la baraja y en la imagen.
  assert.equal(lineas.at(-2), "*Oros* (1)");
  assert.equal(coleccionComoTexto("Me faltan", [], {}), "*Me faltan* (0 cartas)");
});
