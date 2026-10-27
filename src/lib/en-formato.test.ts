import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { createDeck, setFormato } from "./deck";
import { buildCardIndex, canAdd, isLegal, validateDeck } from "./deck-rules";
import {
  cartasEnFormato,
  frecuenciasPorIdentidad,
  motivoFueraDeFormato,
} from "./en-formato";
import { esFormato } from "./formatos";
import { catalogSchema, type Card, type Formato } from "./types";

/** Las frecuencias de VCR e Infanteria, contra el catalogo real. */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);
const FRECUENCIAS = frecuenciasPorIdentidad(CATALOGO);
const porId = (id: string) => CATALOGO.find((c) => c.id === id)!;
const motivo = (id: string, f: Formato) =>
  motivoFueraDeFormato(porId(id), f, FRECUENCIAS);

test("en Estandar entra todo lo del bloque", () => {
  assert.equal(motivo("bu-001", "estandar"), null); // Kirin, Ultra Real
  assert.equal(cartasEnFormato(CATALOGO, "estandar").length, CATALOGO.length);
});

test("la frecuencia se mira por carta, en las diez ediciones", () => {
  // Acobardar: Vasallo en ContraAtaque, asi que entra en Infanteria con
  // cualquier arte, Milenaria incluida.
  for (const id of ["ca-111", "aa-376"]) assert.equal(motivo(id, "infanteria"), null, id);
  // Kirin: Ultra Real; su promo no la vuelve Vasallo.
  assert.equal(motivo("bu-001", "vcr"), "frecuencia");
  assert.equal(motivo("aa-202", "vcr"), "frecuencia");
  // Saint-Germain: Ultra Real en las diez, Real solo en Arte Alternativo.
  assert.equal(motivo("am-006", "vcr"), "frecuencia");
  assert.equal(motivo("aa-009", "vcr"), "frecuencia");
  // Taishakuten: solo Promocional.
  assert.equal(motivo("sn-141", "vcr"), "frecuencia");
  // Rayo de Luna: Real, entra en VCR y no en Infanteria.
  const rayo = CATALOGO.find((c) => c.nombre === "Rayo de Luna")!;
  assert.equal(motivoFueraDeFormato(rayo, "vcr", FRECUENCIAS), null);
  assert.equal(motivoFueraDeFormato(rayo, "infanteria", FRECUENCIAS), "frecuencia");
});

test("los Oros entran en los tres formatos", () => {
  for (const c of CATALOGO.filter((c) => c.frecuencia === "Oro")) {
    for (const f of ["vcr", "infanteria"] as const) {
      assert.notEqual(motivoFueraDeFormato(c, f, FRECUENCIAS), "frecuencia", c.id);
    }
  }
});

test("una carta que solo esta en Adicionales usa su propia frecuencia", () => {
  // Escarabajo de las Arenas, Vasallo del Pack de Batalla: Dominio.
  assert.equal(motivo("ad-001", "infanteria"), null);
  // Tiamat, Ultra Real del mismo pack.
  assert.equal(motivo("ad-002", "vcr"), "frecuencia");
});

test("las de fuera del bloque, segun cada Banlist", () => {
  assert.equal(motivo("ad-032", "vcr"), null); // Wyvern Dorado, Real
  assert.equal(motivo("ad-032", "infanteria"), "fuera-del-bloque");
  assert.equal(motivo("ad-039", "vcr"), "fuera-del-bloque"); // Wotan
  assert.equal(motivo("ad-039", "estandar"), null);
});

test("VCR e Infanteria se van acotando", () => {
  const vcr = cartasEnFormato(CATALOGO, "vcr");
  const infanteria = cartasEnFormato(CATALOGO, "infanteria");
  assert.ok(infanteria.length < vcr.length && vcr.length < CATALOGO.length);
  const ids = new Set(vcr.map((c) => c.id));
  for (const c of infanteria) assert.ok(ids.has(c.id), c.id);
});

test("una baraja con una carta fuera de formato no cumple, y el + la frena", () => {
  const index = buildCardIndex(CATALOGO, "vcr");
  const kirin = index.porId.get("bu-001")!;
  const deck = setFormato(createDeck("VCR"), "vcr");
  const check = canAdd(deck, kirin, "principal", index);
  assert.equal(check.ok, false);
  assert.match(check.ok ? "" : check.mensaje, /no entra en VCR/);

  const con = { ...deck, principal: [{ id: "bu-001", n: 1 }] };
  const issues = validateDeck(con, index);
  const fuera = issues.find((i) => i.code === "carta-fuera-de-formato");
  assert.ok(fuera);
  assert.equal(fuera.gravedad, "error");
  assert.ok(!isLegal(issues));
  // En Estandar la misma carta entra.
  const estandar = buildCardIndex(CATALOGO, "estandar");
  assert.ok(
    !validateDeck({ ...con, formato: "estandar" }, estandar).some(
      (i) => i.code === "carta-fuera-de-formato",
    ),
  );
});

test("esFormato solo admite los tres", () => {
  assert.ok(esFormato("vcr"));
  assert.ok(!esFormato("VCR"));
  assert.ok(!esFormato("__proto__"));
});
