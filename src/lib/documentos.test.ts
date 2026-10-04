import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  banlistSchema,
  cartasDeLaBanlist,
  DOCUMENTOS,
  EDICIONES_FE_DE_ERRATAS,
  claveDeNombre,
  feDeErratasSchema,
} from "./documentos";
import { catalogSchema, type Card } from "./types";

/**
 * La Fe de Erratas y la Banlist transcritas (`documentos/fuente/`), contra el
 * catalogo real. Las cartas que nombran tienen que existir, o estar en una de
 * las dos listas de abajo, que dicen por que no estan.
 */

const leer = (archivo: string): unknown =>
  JSON.parse(readFileSync(path.join(process.cwd(), archivo), "utf8"));

const CATALOGO: Card[] = catalogSchema.parse(leer("public/data/cards.json"));
const FE = feDeErratasSchema.parse(leer("documentos/fuente/fe-de-erratas.json"));
const BAN = banlistSchema.parse(leer("documentos/fuente/banlist-estandar.json"));

const porNombre = new Map<string, Card[]>();
for (const c of CATALOGO) {
  const k = claveDeNombre(c.nombre);
  porNombre.set(k, [...(porNombre.get(k) ?? []), c]);
}

/**
 * Cartas que la Banlist nombra y que el catalogo no tiene. Hoy ninguna: las
 * nueve "en observacion" estan en Adicionales desde que llegaron Wotan y
 * Jarnvid. Si se nombra otra que no se cargue, va aqui.
 */
const FUERA_DEL_FORMATO: string[] = [];

/**
 * Entradas de la banlist que no son una carta sino una regla de construccion:
 * "Mazo Desafiante y/o Guerrero" dice como se pueden llevar Shingas y Karna.
 */
const NO_SON_CARTAS = ["Mazo Desafiante y/o Guerrero"];

const EXCEPCIONES = new Set([...FUERA_DEL_FORMATO, ...NO_SON_CARTAS].map(claveDeNombre));

test("los conteos son los de la revision contra los originales", () => {
  assert.equal(FE.entradas.length, 63);
  assert.equal(BAN.prohibidas.length, 9);
  assert.equal(BAN.unicas.length, 31);
  assert.equal(BAN.erratas.length, 37);
});

test("ninguna carta se repite dentro de una misma lista", () => {
  const listas: [string, string[]][] = [
    ["Fe de Erratas", FE.entradas.map((e) => e.nombre)],
    ["prohibidas", BAN.prohibidas],
    ["Únicas", BAN.unicas],
    ["erratas de la banlist", BAN.erratas.map((e) => e.carta)],
  ];
  for (const [lista, nombres] of listas) {
    const vistos = new Set<string>();
    for (const n of nombres) {
      assert.ok(!vistos.has(claveDeNombre(n)), `${n} sale dos veces en ${lista}`);
      vistos.add(claveDeNombre(n));
    }
  }
});

test("cada carta nombrada esta en el catalogo, o se sabe por que no", () => {
  const nombres = [...FE.entradas.map((e) => e.nombre), ...cartasDeLaBanlist(BAN)];
  const faltan = nombres.filter(
    (n) => !porNombre.has(claveDeNombre(n)) && !EXCEPCIONES.has(claveDeNombre(n)),
  );
  assert.deepEqual([...new Set(faltan)], []);
});

test("las excepciones siguen siendo excepciones", () => {
  // Si una carta de fuera del formato llega al catalogo, la lista miente: hay
  // que sacarla de aqui (y de TODO.md).
  const nombres = new Set(
    [...FE.entradas.map((e) => e.nombre), ...cartasDeLaBanlist(BAN)].map(claveDeNombre),
  );
  for (const n of [...FUERA_DEL_FORMATO, ...NO_SON_CARTAS]) {
    assert.ok(!porNombre.has(claveDeNombre(n)), `${n} ya está en el catálogo`);
    assert.ok(nombres.has(claveDeNombre(n)), `${n} ya no sale en ningún documento`);
  }
});

test("el tipo de cada carta erratada coincide con el catalogo", () => {
  for (const e of FE.entradas) {
    const cartas = porNombre.get(claveDeNombre(e.nombre));
    if (!cartas) continue;
    assert.ok(
      cartas.some((c) => c.tipo === e.tipo),
      `${e.nombre}: ${e.tipo} en la Fe de Erratas, ${cartas[0].tipo} en el catálogo`,
    );
  }
});

test("las cartas que nombra la regla de Desafiante y Guerrero existen", () => {
  for (const n of ["Shingas", "Karna"]) assert.ok(porNombre.has(claveDeNombre(n)), n);
});

test("cada entrada de la Fe de Erratas cae en una edicion del indice", () => {
  const ediciones = new Set<string>(EDICIONES_FE_DE_ERRATAS);
  for (const e of FE.entradas) assert.ok(ediciones.has(e.edicion), e.edicion);
});

test("los PDF publicados existen y tienen las paginas que dice la ficha", () => {
  for (const doc of Object.values(DOCUMENTOS)) {
    const pdf = readFileSync(path.join(process.cwd(), "public", doc.pdf)).toString(
      "latin1",
    );
    // El arbol de paginas puede tener nodos intermedios: la raiz es el que
    // cuenta mas.
    const cuentas = [...pdf.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)];
    assert.equal(Math.max(...cuentas.map((c) => Number(c[1]))), doc.paginas, doc.pdf);
  }
});
