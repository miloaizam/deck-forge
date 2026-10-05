import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  agruparImpresiones,
  compareCards,
  esOroInicial,
  ORDENES,
  ordenarCartas,
  sortCards,
} from "./card-order";
import { claseDeOro } from "./oros";
import { EDITIONS, ORIGENES } from "./editions";
import {
  catalogSchema,
  FRECUENCIAS,
  RAZAS,
  type Card,
  type Frecuencia,
  type Raza,
} from "./types";

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

  // En Arte Alternativo manda antes el origen: los tramos van por origen.
  const grupos = [
    ...EDITIONS.filter((e) => e.slug !== "arte-alternativo").map(({ slug }) => ({
      slug,
      cartas: ORDENADO.filter((c) => c.edicion === slug),
    })),
    ...ORIGENES.map(({ slug }) => ({
      slug: `arte-alternativo/${slug}`,
      cartas: ORDENADO.filter(
        (c) => c.edicion === "arte-alternativo" && c.origen === slug,
      ),
    })),
  ];
  for (const { slug, cartas } of grupos) {
    const tramos: Frecuencia[] = [];
    for (const c of cartas) {
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
    // Como mucho hay un oro inicial DE EDICION por edicion. Los de raza son
    // tres por raza y viven todos en Adicionales.
    const deEdicion = oros.filter(
      (c) =>
        claseDeOro(c) === "inicial" &&
        !RAZAS.includes(c.nombre.slice("Oro Inicial ".length) as Raza),
    );
    assert.ok(deEdicion.length <= 1, slug);
  }
});

test("Arte Alternativo va por origen, de la edicion mas nueva a la mas vieja", () => {
  const rango = new Map<string, number>(ORIGENES.map((o, i) => [o.slug, i]));
  const aa = ORDENADO.filter((c) => c.edicion === "arte-alternativo");
  assert.ok(aa.length > 0);
  const rangos = aa.map((c) => rango.get(c.origen!)!);
  assert.deepEqual(
    rangos,
    [...rangos].sort((a, b) => a - b),
  );
  // Dentro de un mismo origen manda la frecuencia, como en cualquier edicion:
  // la promo de Sarras abre Templarios.
  const templarios = aa.filter((c) => c.origen === "templarios");
  assert.equal(templarios[0].id, "aa-001");
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

test("el selector de impresiones agrupa por identidad, en el orden del catalogo", () => {
  const grupos = agruparImpresiones(CATALOGO);
  let total = 0;
  for (const [identidad, cartas] of grupos) {
    total += cartas.length;
    assert.ok(
      cartas.every((c) => c.identidad === identidad),
      identidad,
    );
    assert.deepEqual(cartas, sortCards(cartas), identidad);
  }
  assert.equal(total, CATALOGO.length);
  const sarras = CATALOGO.find((c) => c.nombre === "Sarras")!;
  assert.ok(grupos.get(sarras.identidad)!.some((c) => c.edicion === "arte-alternativo"));
});

test("los ordenes elegibles: monotonos, sin perder cartas y con empates en orden de catalogo", () => {
  const base = sortCards(CATALOGO);
  for (const o of ORDENES) {
    const r = ordenarCartas(base, o);
    assert.equal(r.length, base.length, o);
    assert.notEqual(r, base); // copia, no el mismo arreglo
  }
  assert.equal(ordenarCartas(base, ""), base);

  const costes = ordenarCartas(base, "coste-asc").map((c) => c.coste);
  const conCoste = costes.filter((c) => c !== null);
  assert.deepEqual(
    conCoste,
    [...conCoste].sort((a, b) => a! - b!),
  );
  // Los que no tienen coste (Oros) van al final en los dos sentidos.
  assert.equal(costes.indexOf(null), conCoste.length);
  assert.equal(ordenarCartas(base, "coste-desc").at(-1)!.coste, null);

  const fuerzas = ordenarCartas(base, "fuerza-desc")
    .map((c) => c.fuerza)
    .filter((f) => f !== null);
  assert.deepEqual(
    fuerzas,
    [...fuerzas].sort((a, b) => b! - a!),
  );

  // Dos cartas del mismo coste conservan el orden del catalogo.
  const posicion = new Map(base.map((c, i) => [c.id, i]));
  const dos = ordenarCartas(base, "coste-asc").filter((c) => c.coste === 2);
  for (let i = 1; i < dos.length; i++) {
    assert.ok(posicion.get(dos[i - 1].id)! < posicion.get(dos[i].id)!);
  }

  // Por nombre, sin que las tildes manden al final ("Águila" junto a "Aguja").
  const nombres = ordenarCartas(base, "nombre").map((c) => c.nombre);
  assert.ok(!/^[ÁÉÍÓÚ]/.test(nombres.at(-1)!));
});
