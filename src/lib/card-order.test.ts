import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { compareCards, esOroInicial, sortCards } from "./card-order";
import { EDITIONS } from "./editions";
import { catalogSchema, FRECUENCIAS, type Card, type Frecuencia } from "./types";

/**
 * El orden del catalogo lo comparten tres vistas —/catalogo, la grilla del
 * constructor y el contenido de una baraja—, asi que una carta tiene que caer en
 * el mismo sitio en las tres. Va contra el catalogo real, como los demas tests
 * del repo: lo que se comprueba es que los DATOS entren en el orden, no que un
 * comparador escrito a mano se compare consigo mismo.
 */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);

const ORDENADO = sortCards(CATALOGO);

/** Los slugs de las diez del formato, de la ultima en salir a la primera. */
const DEL_FORMATO = EDITIONS.filter((e) => !e.parcial)
  .map((e) => e.slug)
  .reverse();

test("las ediciones van de la ultima en salir a la primera", () => {
  const vistas: string[] = [];
  for (const c of ORDENADO) if (!vistas.includes(c.edicion)) vistas.push(c.edicion);

  assert.deepEqual(
    vistas.slice(0, DEL_FORMATO.length),
    DEL_FORMATO,
    "Escuelas Elementales abre y Bushido cierra",
  );
  // Y cada edicion sale de una sola vez, sin volver a aparecer mas abajo.
  assert.equal(new Set(vistas).size, vistas.length);
});

test("dentro de una edicion las frecuencias van de la mas rara a la mas comun", () => {
  const rango = new Map(FRECUENCIAS.map((f, i) => [f, i]));

  for (const { slug } of EDITIONS) {
    const tramos: Frecuencia[] = [];
    for (const c of ORDENADO.filter((c) => c.edicion === slug)) {
      if (tramos.at(-1) !== c.frecuencia) tramos.push(c.frecuencia);
    }
    // Cada frecuencia aparece en un tramo unico y en el orden de FRECUENCIAS.
    assert.equal(new Set(tramos).size, tramos.length, `${slug} parte una frecuencia`);
    assert.deepEqual(
      tramos,
      [...tramos].sort((a, b) => rango.get(a)! - rango.get(b)!),
      `${slug} desordena las frecuencias`,
    );
  }
});

test("el tramo de Oros abre con el oro inicial y cierra con los normales", () => {
  for (const { slug } of EDITIONS) {
    const oros = ORDENADO.filter((c) => c.edicion === slug && c.frecuencia === "Oro");
    if (oros.length === 0) continue;

    // 0 el oro inicial, 1 los que traen habilidad, 2 los normales.
    const rangos = oros.map((c) => (esOroInicial(c) ? 0 : c.habilidad === "" ? 2 : 1));
    assert.deepEqual(rangos, [...rangos].sort(), `${slug} mezcla sus Oros`);
    // Como mucho hay un oro inicial por edicion.
    assert.ok(rangos.filter((r) => r === 0).length <= 1);
  }
});

test("el orden no depende de con que cartas se compare", () => {
  // Un comparador que no sea transitivo da resultados distintos segun el orden
  // de entrada, y entonces la misma carta cae en un sitio en /catalogo y en
  // otro en el constructor, que es justo lo que no puede pasar.
  const alreves = sortCards([...CATALOGO].reverse());
  assert.deepEqual(
    alreves.map((c) => c.id),
    ORDENADO.map((c) => c.id),
  );
});

test("ninguna pareja de cartas queda empatada", () => {
  // Un empate deja el desempate en manos del sort, y de ahi salen los saltos de
  // posicion que esto viene a evitar.
  for (let i = 1; i < ORDENADO.length; i++) {
    assert.notEqual(
      compareCards(ORDENADO[i - 1], ORDENADO[i]),
      0,
      `${ORDENADO[i - 1].codigo} y ${ORDENADO[i].codigo} empatan`,
    );
  }
});
