import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { applyFilters, buildFacets, buildSearchIndex, EMPTY_FILTERS } from "./catalog";
import { buildCardIndex } from "./deck-rules";
import { claseDeOro, etiquetaDeTipo, subtituloDeCarta } from "./oros";
import { catalogSchema, RAZAS, type Card, type Raza } from "./types";

/** Los cuatro tipos de Oro, contra el catalogo real. */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);
const oros = CATALOGO.filter((c) => c.tipo === "Oro");
const deClase = (k: string) => oros.filter((c) => claseDeOro(c) === k);

test("cada Oro cae en una sola clase, y ninguna otra carta tiene clase", () => {
  assert.equal(oros.length, 258);
  assert.equal(deClase("con-habilidad").length, 104);
  assert.equal(deClase("sin-habilidad").length, 111);
  assert.equal(deClase("inicial-edicion").length, 10);
  // Tres por raza, de Dinastia del Dragon.
  assert.equal(deClase("inicial-raza").length, 33);
  assert.ok(
    CATALOGO.filter((c) => c.tipo !== "Oro").every((c) => claseDeOro(c) === null),
  );
});

test("los iniciales de edicion y de raza funcionan como los sin habilidad", () => {
  const index = buildCardIndex(CATALOGO);
  for (const c of [
    ...deClase("inicial-edicion"),
    ...deClase("inicial-raza"),
    ...deClase("sin-habilidad"),
  ]) {
    assert.ok(index.porId.get(c.id)?.oroSinHabilidad, c.id);
  }
  for (const c of deClase("con-habilidad")) {
    assert.equal(index.porId.get(c.id)?.oroSinHabilidad, false, c.id);
  }
  for (const c of deClase("inicial-edicion")) assert.match(c.nombre, /^Oro Inicial /);
  for (const c of deClase("inicial-raza")) {
    assert.equal(c.edicion, "adicionales", c.id);
    assert.ok(RAZAS.includes(c.nombre.slice("Oro Inicial ".length) as Raza), c.id);
  }
});

test("el filtro Tipo ofrece los cuatro tipos de Oro bajo Oro, y devuelve cada uno", () => {
  assert.deepEqual(buildFacets(CATALOGO).tipos, [
    "Aliado",
    "Arma",
    "Oro",
    "con-habilidad",
    "sin-habilidad",
    "inicial-edicion",
    "inicial-raza",
    "Talismán",
    "Tótem",
  ]);
  const indice = buildSearchIndex(CATALOGO);
  for (const [k, n] of [
    ["Oro", 258],
    ["con-habilidad", 104],
    ["sin-habilidad", 111],
    ["inicial-edicion", 10],
    ["inicial-raza", 33],
  ] as const) {
    assert.equal(
      applyFilters(CATALOGO, { ...EMPTY_FILTERS, tipo: k }, indice).length,
      n,
      k,
    );
  }
  assert.equal(etiquetaDeTipo("inicial-edicion"), "Oro inicial de edición");
  assert.equal(etiquetaDeTipo("inicial-raza"), "Oro inicial de raza");
  assert.equal(etiquetaDeTipo("Arma"), "Arma");
});

test("un tipo de Oro que la edicion no tiene no se ofrece", () => {
  // Escuelas Elementales solo trae Oros con habilidad (34): ni sin habilidad
  // ni inicial de edicion. "Oro" si sale, que es un tipo de carta.
  const ee = CATALOGO.filter((c) => c.edicion === "escuelas-elementales");
  const tipos = buildFacets(ee).tipos;
  assert.ok(tipos.includes("Oro"));
  assert.ok(tipos.includes("con-habilidad"));
  assert.ok(!tipos.includes("sin-habilidad"));
  assert.ok(!tipos.includes("inicial-edicion"));
  assert.ok(!tipos.includes("inicial-raza"));
});

test("el subtitulo de un Oro dice su clase; el de un Aliado, su raza", () => {
  assert.equal(subtituloDeCarta(deClase("sin-habilidad")[0]), "Oro sin habilidad");
  const aliado = CATALOGO.find((c) => c.tipo === "Aliado")!;
  assert.equal(subtituloDeCarta(aliado), aliado.raza);
});
