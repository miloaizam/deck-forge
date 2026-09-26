import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildFacets } from "./catalog";
import { EDITIONS } from "./editions";
import { esClaseDeOro } from "./oros";
import { catalogSchema, FRECUENCIAS, type Card } from "./types";

/**
 * El orden de las opciones de cada filtro. Va contra el catalogo real, como
 * los demas tests: las facetas salen de lo que las cartas declaran.
 */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);
const facets = buildFacets(CATALOGO);

test("las ediciones van de la mas nueva a la mas vieja, y las parciales al final", () => {
  const delFormato = EDITIONS.filter((e) => !e.parcial).map((e) => e.slug);
  const parciales = new Set(EDITIONS.filter((e) => e.parcial).map((e) => e.slug));

  const principales = facets.ediciones.filter((e) => !parciales.has(e));
  assert.deepEqual(principales, [...delFormato].reverse());
  assert.equal(facets.ediciones[0], "escuelas-elementales");
  assert.equal(principales.at(-1), "bushido");

  // Hoy no hay parciales en el filtro; si las hay, van todas despues.
  const primeraParcial = facets.ediciones.findIndex((e) => parciales.has(e));
  if (primeraParcial !== -1) {
    assert.ok(
      facets.ediciones.slice(primeraParcial).every((e) => parciales.has(e)),
      "ninguna edicion del formato queda detras de una parcial",
    );
  }
});

test("tipo, raza, escuela y habilidad van en orden alfabetico, tildes incluidas", () => {
  const collator = new Intl.Collator("es");
  // En tipos, los tres tipos de Oro van bajo "Oro" (oros.test.ts): el orden
  // alfabetico es el de los tipos de carta.
  const tiposDeCarta = facets.tipos.filter((t) => !esClaseDeOro(t));
  for (const [nombre, lista] of Object.entries({
    tipos: tiposDeCarta,
    razas: facets.razas,
    escuelas: facets.escuelas,
    habilidades: facets.habilidades,
  })) {
    assert.deepEqual(
      lista,
      [...lista].sort(collator.compare),
      `${nombre} fuera de orden`,
    );
  }
  // Un sort() a secas pondria las palabras con tilde detras de la Z.
  assert.deepEqual(tiposDeCarta, ["Aliado", "Arma", "Oro", "Talismán", "Tótem"]);
  assert.ok(facets.razas.indexOf("Bárbaro") < facets.razas.indexOf("Bestia"));
});

test("la frecuencia conserva su orden natural, de la mas rara a la mas comun", () => {
  assert.deepEqual(facets.frecuencias, [...FRECUENCIAS]);
});
