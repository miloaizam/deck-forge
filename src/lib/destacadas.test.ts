import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sortCards } from "./card-order";
import {
  CARTAS_EN_CINTA,
  DESTACADAS_FIJAS,
  MIN_BARAJAS,
  elegirDestacadas,
  gruposDePortada,
  leerFilas,
  leerGrupos,
  type FilaDestacada,
} from "./destacadas";
import { catalogSchema, type Card } from "./types";

/** Contra el catalogo real, como el resto de las pruebas de `src/lib`. */
const cards: Card[] = sortCards(
  catalogSchema.parse(
    JSON.parse(
      readFileSync(
        path.join(import.meta.dirname, "..", "..", "public", "data", "cards.json"),
        "utf-8",
      ),
    ),
  ),
);
const grupos = gruposDePortada(cards);
const porId = new Map(cards.map((c) => [c.id, c]));

const fila = (carta: string, barajas: number, total = 20): FilaDestacada => ({
  carta,
  barajas,
  total,
});

/** Las primeras `n` cartas que no son Oro, una impresion de cada una. */
const otras = (n: number) => grupos.slice(0, n).map((g, i) => fila(g[0][0], 1 + (i % 2)));

test("el archivo de la portada valida y lleva una entrada por carta", () => {
  // Lo que se publica en /data/portada.json, ida y vuelta por JSON.
  const leido = leerGrupos(JSON.parse(JSON.stringify(grupos)));
  assert.ok(leido, "gruposDePortada no pasa su propio esquema");
  const ids = grupos.flatMap((g) => g[0]);
  assert.equal(new Set(ids).size, ids.length, "un id en dos grupos");
  for (const [, nombre, slug] of grupos) {
    assert.ok(nombre.length > 0);
    assert.match(slug, /^[a-z0-9-]+$/);
  }
});

test("los Oros sin habilidad no entran; los Oros con habilidad si", () => {
  const ids = new Set(grupos.flatMap((g) => g[0]));
  for (const c of cards) {
    const sinHabilidad = c.tipo === "Oro" && c.habilidad === "";
    assert.equal(ids.has(c.id), !sinHabilidad, `${c.id} ${c.nombre}`);
  }
});

test("las impresiones de una carta suman juntas", () => {
  // Kirin tiene impresion normal y Milenaria: dos ids, un grupo.
  const kirin = grupos.find((g) => g[1] === "Kirin");
  assert.ok(kirin && kirin[0].length >= 2, "Kirin deberia tener varias impresiones");
  const [a, b] = kirin[0];
  const filas = [
    fila(a, 6),
    fila(b, 6),
    ...otras(CARTAS_EN_CINTA + 3).map((f) => ({ ...f, barajas: 10 })),
  ];
  const elegidas = elegirDestacadas(filas, grupos);
  assert.ok(elegidas);
  assert.equal(elegidas[0].nombre, "Kirin");
  assert.equal(elegidas.filter((c) => c.nombre === "Kirin").length, 1);
});

test("con pocas barajas o pocas cartas se queda el grupo fijo", () => {
  assert.equal(elegirDestacadas([], grupos), null);
  const pocas = otras(CARTAS_EN_CINTA).map((f) => ({ ...f, total: MIN_BARAJAS - 1 }));
  assert.equal(elegirDestacadas(pocas, grupos), null);
  assert.equal(elegirDestacadas(otras(CARTAS_EN_CINTA - 1), grupos), null);
  assert.equal(elegirDestacadas(otras(CARTAS_EN_CINTA), grupos)?.length, CARTAS_EN_CINTA);
});

test("un Oro sin habilidad o un id que no existe no ocupan lugar", () => {
  const oro = cards.find((c) => c.tipo === "Oro" && c.habilidad === "");
  assert.ok(oro);
  const filas = [fila(oro.id, 99), fila("zz-999", 98), ...otras(CARTAS_EN_CINTA)];
  const elegidas = elegirDestacadas(filas, grupos);
  assert.ok(elegidas);
  assert.ok(!elegidas.some((c) => c.nombre === oro.nombre));
  assert.equal(elegidas.length, CARTAS_EN_CINTA);
});

test("las respuestas de afuera se validan", () => {
  assert.deepEqual(leerFilas([{ carta: "ee-001", barajas: 3, total: 12 }]), [
    { carta: "ee-001", barajas: 3, total: 12 },
  ]);
  assert.equal(leerFilas([{ carta: "../x", barajas: 3, total: 12 }]), null);
  assert.equal(leerFilas([{ carta: "ee-001", barajas: -1, total: 12 }]), null);
  assert.equal(leerFilas({ carta: "ee-001" }), null);
  assert.equal(leerGrupos([[["ee-001"], "Leonardo", "../../evil"]]), null);
  assert.equal(leerGrupos([[["ee-001"], "Leonardo", "https://x"]]), null);
});

test("el grupo fijo son cartas que existen y no son Oro", () => {
  assert.equal(DESTACADAS_FIJAS.length, CARTAS_EN_CINTA);
  for (const id of DESTACADAS_FIJAS) {
    const c = porId.get(id);
    assert.ok(c, `${id} no existe`);
    assert.notEqual(c.tipo, "Oro");
  }
});
