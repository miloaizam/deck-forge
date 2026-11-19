import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { applyFilters, buildFacets, buildSearchIndex, EMPTY_FILTERS } from "./catalog";
import { EFECTOS, efectosDe, NOMBRES_DE_EFECTOS } from "./efectos";
import { conErratas } from "./erratas";
import { catalogSchema, type Card } from "./types";

/**
 * El filtro "Efecto", contra el catalogo real y erratado, como lo ve el
 * sitio. Los casos son los que costo dejar bien al ajustar los patrones.
 */
const CATALOGO: Card[] = catalogSchema
  .parse(
    JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
  )
  .map((c) => conErratas(c));
const porId = new Map(CATALOGO.map((c) => [c.id, c]));
const efectos = (id: string) => {
  const c = porId.get(id);
  assert.ok(c, `falta ${id}`);
  return efectosDe(c);
};

test("cada efecto encuentra cartas y la faceta los ofrece en su orden", () => {
  for (const e of EFECTOS) {
    assert.ok(
      CATALOGO.some((c) => efectosDe(c).has(e.nombre)),
      `${e.nombre} no encuentra ninguna carta`,
    );
  }
  assert.deepEqual(buildFacets(CATALOGO).efectos, NOMBRES_DE_EFECTOS);
});

test("los verbos con sus formas", () => {
  assert.ok(efectos("ee-083").has("Desterrar"), "Astra destierra");
  assert.ok(efectos("ai-043").has("Robar"), "Cartago roba dos cartas");
  assert.ok(efectos("bu-238").has("Recuperar del Cementerio"), "Koryo sube un Talismán");
  assert.ok(efectos("ai-131").has("Tomar el control"), "Baco gana el control");
  assert.ok(efectos("do-180").has("Jugar sin pagar o más barato"), "Samael abarata");
  assert.ok(efectos("ai-205").has("Cambiar la Fuerza"), "Petasos da Fuerza");
});

test("lo que nombra la palabra sin hacerlo no cuenta", () => {
  // Indesterrable no es desterrar, ni Indestructible destruir.
  assert.ok(!efectos("bu-050").has("Desterrar"), "Inugami solo es Indesterrable");
  assert.ok(!efectos("ai-032").has("Destruir"), "Espartacus solo es Indestructible");
  // "entra en juego bajo tu control" no le quita nada a nadie.
  assert.ok(!efectos("ca-002").has("Tomar el control"), "Adapa");
  // Desterrar o barajar desde el Cementerio no es recuperar.
  for (const id of ["ai-115", "ai-199", "do-017", "sn-002"]) {
    assert.ok(!efectos(id).has("Recuperar del Cementerio"), id);
  }
  // Prohibir que el coste baje no lo abarata.
  assert.ok(!efectos("do-108").has("Jugar sin pagar o más barato"), "Puertas de Perla");
});

test("dar una keyword es nombrarla en el cuerpo, no declararla", () => {
  assert.ok(efectos("sn-139").has("Dar Indestructible"), "Kaidan");
  assert.ok(efectos("ai-205").has("Dar Imbloqueable"), "Petasos");
  assert.ok(efectos("ai-085").has("Dar Indestructible"), "Trajano");
  assert.ok(!efectos("ai-032").has("Dar Indestructible"), "Espartacus la declara");
  assert.ok(!efectos("bu-050").has("Dar Indesterrable"), "Inugami la declara");
});

test("el filtro de efecto se combina con los demas", () => {
  const indice = buildSearchIndex(CATALOGO);
  const desterrar = applyFilters(
    CATALOGO,
    { ...EMPTY_FILTERS, efecto: "Desterrar" },
    indice,
  );
  assert.ok(desterrar.length > 0);
  assert.ok(desterrar.every((c) => efectosDe(c).has("Desterrar")));
  const aliados = applyFilters(
    CATALOGO,
    { ...EMPTY_FILTERS, efecto: "Desterrar", tipo: "Aliado" },
    indice,
  );
  assert.ok(aliados.length > 0 && aliados.length < desterrar.length);
  assert.ok(aliados.every((c) => c.tipo === "Aliado"));
});
