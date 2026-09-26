import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { applyFilters, buildFacets, buildSearchIndex, EMPTY_FILTERS } from "./catalog";
import { buildCardIndex } from "./deck-rules";
import { claseDeOro, CLASES_DE_ORO, subtituloDeCarta } from "./oros";
import { catalogSchema, type Card } from "./types";

/** Los tres tipos de Oro, contra el catalogo real. */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);
const oros = CATALOGO.filter((c) => c.tipo === "Oro");
const deClase = (k: string) => oros.filter((c) => claseDeOro(c) === k);

test("cada Oro cae en una sola clase, y ninguna otra carta tiene clase", () => {
  assert.equal(oros.length, 224);
  assert.equal(deClase("con-habilidad").length, 104);
  assert.equal(deClase("sin-habilidad").length, 111);
  assert.equal(deClase("inicial-edicion").length, 9);
  assert.ok(
    CATALOGO.filter((c) => c.tipo !== "Oro").every((c) => claseDeOro(c) === null),
  );
});

test("los iniciales de edicion funcionan como los sin habilidad", () => {
  const index = buildCardIndex(CATALOGO);
  for (const c of [...deClase("inicial-edicion"), ...deClase("sin-habilidad")]) {
    assert.ok(index.porId.get(c.id)?.oroSinHabilidad, c.id);
  }
  for (const c of deClase("con-habilidad")) {
    assert.equal(index.porId.get(c.id)?.oroSinHabilidad, false, c.id);
  }
  for (const c of deClase("inicial-edicion")) assert.match(c.nombre, /^Oro Inicial /);
});

test("el filtro de Oro ofrece las tres clases y devuelve cada una", () => {
  assert.deepEqual(buildFacets(CATALOGO).oros, [...CLASES_DE_ORO]);
  const indice = buildSearchIndex(CATALOGO);
  for (const [k, n] of [
    ["con-habilidad", 104],
    ["sin-habilidad", 111],
    ["inicial-edicion", 9],
  ] as const) {
    assert.equal(
      applyFilters(CATALOGO, { ...EMPTY_FILTERS, oro: k }, indice).length,
      n,
      k,
    );
  }
});

test("en una edicion sin Oro inicial de edicion, esa opcion no se ofrece", () => {
  const ee = CATALOGO.filter((c) => c.edicion === "escuelas-elementales");
  assert.ok(!buildFacets(ee).oros.includes("inicial-edicion"));
});

test("el subtitulo de un Oro dice su clase; el de un Aliado, su raza", () => {
  assert.equal(subtituloDeCarta(deClase("sin-habilidad")[0]), "Oro sin habilidad");
  const aliado = CATALOGO.find((c) => c.tipo === "Aliado")!;
  assert.equal(subtituloDeCarta(aliado), aliado.raza);
});
