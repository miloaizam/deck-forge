import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  banlistSchema,
  bloquesDelDar,
  cartasDeLaBanlist,
  darSchema,
  DOCUMENTOS,
  EDICIONES_FE_DE_ERRATAS,
  FALTAN_EN_EL_CATALOGO,
  claveDeNombre,
  feDeErratasSchema,
  type BloqueDar,
} from "./documentos";
import { cartasDe, leerMarcado, refsDe, textoPlano } from "./marcado";
import { FORMATOS, catalogSchema, type Card, type Formato } from "./types";

/**
 * La Fe de Erratas y la Banlist transcritas (`documentos/fuente/`), contra el
 * catalogo real. Las cartas que nombran tienen que existir, o estar en una de
 * las dos listas de abajo, que dicen por que no estan.
 */

const leer = (archivo: string): unknown =>
  JSON.parse(readFileSync(path.join(process.cwd(), archivo), "utf8"));

const CATALOGO: Card[] = catalogSchema.parse(leer("public/data/cards.json"));
const FE = feDeErratasSchema.parse(leer("documentos/fuente/fe-de-erratas.json"));
const ARCHIVO_BANLIST = (f: Formato) => `documentos/fuente/banlist-${f}.json`;
const BANLISTS = Object.fromEntries(
  FORMATOS.map((f) => [f, banlistSchema.parse(leer(ARCHIVO_BANLIST(f)))]),
) as Record<Formato, ReturnType<typeof banlistSchema.parse>>; // una por formato
const BAN = BANLISTS.estandar;
const DAR = darSchema.parse(leer("documentos/fuente/dar.json"));

const porNombre = new Map<string, Card[]>();
for (const c of CATALOGO) {
  const k = claveDeNombre(c.nombre);
  porNombre.set(k, [...(porNombre.get(k) ?? []), c]);
}

/**
 * Cartas que alguna Banlist nombra y que el catalogo no tiene: las nueve de
 * fuera del bloque de VCR y "Maquina del Tiempo" (`FALTAN_EN_EL_CATALOGO`).
 * Las nueve "en observacion" de la Estandar estan en Adicionales desde que
 * llegaron Wotan y Jarnvid.
 */
const FUERA_DEL_FORMATO: string[] = [...FALTAN_EN_EL_CATALOGO];

/**
 * Entradas de la banlist que no son una carta sino una regla de construccion:
 * "Mazo Desafiante y/o Guerrero" dice como se pueden llevar Shingas y Karna.
 */
const NO_SON_CARTAS = ["Mazo Desafiante y/o Guerrero"];

const EXCEPCIONES = new Set([...FUERA_DEL_FORMATO, ...NO_SON_CARTAS].map(claveDeNombre));

test("validar los documentos no los cambia", () => {
  // `erratas.ts` usa los JSON sin validarlos en el navegador: eso solo es
  // seguro si el esquema los deja tal cual (sin recortar espacios, sin
  // defaults que rellenar).
  assert.deepStrictEqual(FE, leer("documentos/fuente/fe-de-erratas.json"));
  for (const f of FORMATOS)
    assert.deepStrictEqual(BANLISTS[f], leer(ARCHIVO_BANLIST(f)), f);
});

test("los conteos son los de la revision contra los originales", () => {
  assert.equal(FE.entradas.length, 63);
  assert.equal(BAN.prohibidas.length, 9);
  assert.equal(BAN.unicas.length, 31);
  assert.equal(BAN.erratas.length, 37);
  // VCR e Infanteria, contra sus imagenes.
  assert.equal(BANLISTS.vcr.prohibidas.length, 15);
  assert.equal(BANLISTS.vcr.unicas.length, 47);
  assert.equal(BANLISTS.vcr.errantes?.length, 15);
  assert.equal(BANLISTS.vcr.fueraDelBloque?.length, 13);
  assert.equal(BANLISTS.infanteria.prohibidas.length, 8);
  assert.equal(BANLISTS.infanteria.unicas.length, 40);
  assert.equal(BANLISTS.infanteria.errantes?.length, 7);
});

test("ninguna carta se repite dentro de una misma lista", () => {
  const listas: [string, string[]][] = [
    ["Fe de Erratas", FE.entradas.map((e) => e.nombre)],
    ...FORMATOS.flatMap((f): [string, string[]][] => [
      [`prohibidas ${f}`, BANLISTS[f].prohibidas],
      [`Únicas ${f}`, BANLISTS[f].unicas],
      [`Errantes ${f}`, BANLISTS[f].errantes ?? []],
      [`erratas de la banlist ${f}`, BANLISTS[f].erratas.map((e) => e.carta)],
    ]),
  ];
  for (const [lista, nombres] of listas) {
    const vistos = new Set<string>();
    for (const n of nombres) {
      assert.ok(!vistos.has(claveDeNombre(n)), `${n} sale dos veces en ${lista}`);
      vistos.add(claveDeNombre(n));
    }
  }
});

/** Lo que nombran la Fe de Erratas y las tres Banlists. */
const NOMBRADAS = [
  ...FE.entradas.map((e) => e.nombre),
  ...FORMATOS.flatMap((f) => cartasDeLaBanlist(BANLISTS[f])),
];

test("una carta va en una sola lista de cada Banlist", () => {
  for (const f of FORMATOS) {
    const b = BANLISTS[f];
    const listas = [b.prohibidas, b.unicas, b.errantes ?? []].map(
      (l) => new Set(l.map(claveDeNombre)),
    );
    for (const [i, a] of listas.entries()) {
      for (const otra of listas.slice(i + 1)) {
        for (const n of a) assert.ok(!otra.has(n), `${f}: ${n} va en dos listas`);
      }
    }
  }
});

test("cada carta nombrada esta en el catalogo, o se sabe por que no", () => {
  const nombres = NOMBRADAS;
  const faltan = nombres.filter(
    (n) => !porNombre.has(claveDeNombre(n)) && !EXCEPCIONES.has(claveDeNombre(n)),
  );
  assert.deepEqual([...new Set(faltan)], []);
});

test("las excepciones siguen siendo excepciones", () => {
  // Si una carta de fuera del formato llega al catalogo, la lista miente: hay
  // que sacarla de aqui (y de TODO.md).
  const nombres = new Set(NOMBRADAS.map(claveDeNombre));
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

// --- El DAR ---

const BLOQUES_DAR: BloqueDar[] = DAR.secciones.flatMap((s) => [
  ...bloquesDelDar(s.bloques),
]);

/** Cada texto del DAR que lleva marcado. */
function textosDelDar(): string[] {
  return BLOQUES_DAR.flatMap((b) => {
    switch (b.tipo) {
      case "parrafo":
      case "nota":
        return [b.texto];
      case "lista":
        return b.items;
      case "etiquetada":
        return b.items.map((i) => i.texto);
      case "cartas":
        return b.pie ? [b.pie] : [];
      case "caso":
        return b.cita ?? [];
      default:
        return [];
    }
  });
}

/**
 * Cartas de ejemplo del DAR que no son del formato y no estan en el catalogo:
 * se nombran sin imagen. Si una llega al catalogo, sale de aqui.
 */
const DAR_SIN_IMAGEN = ["Ningirsu", "Soma", "Sir Héctor", "Aphofis", "Kay", "Walkirias"];

test("validar el DAR no lo cambia", () => {
  assert.deepStrictEqual(DAR, leer("documentos/fuente/dar.json"));
});

test("el DAR tiene las secciones y reglas de la revision contra el original", () => {
  assert.deepEqual(
    DAR.secciones.map((s) => s.id),
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "anexo-1"],
  );
  assert.equal(BLOQUES_DAR.filter((b) => b.tipo === "regla").length, 90);
  // Los 48 conceptos de juego, numerados en orden: 10.1 Agrupar … 10.48 Traicion.
  const conceptos = DAR.secciones[9].bloques.filter((b) => b.tipo === "apartado");
  assert.equal(conceptos.length, 48);
  conceptos.forEach((c, i) =>
    assert.equal(c.tipo === "apartado" && c.numero, `10.${i + 1}`),
  );
});

test("las anclas del DAR no se repiten y toda referencia tiene destino", () => {
  const ids = [
    ...DAR.secciones.map((s) => s.id),
    ...BLOQUES_DAR.flatMap((b) => ("id" in b ? [b.id] : [])),
  ];
  assert.equal(new Set(ids).size, ids.length);
  const destinos = new Set(ids);
  for (const t of textosDelDar()) {
    for (const r of refsDe(t))
      assert.ok(destinos.has(r), `[[${r}]] no lleva a ningún sitio`);
  }
});

test("el marcado del DAR esta cerrado", () => {
  for (const t of [
    ...textosDelDar(),
    ...BLOQUES_DAR.flatMap((b) => ("titulo" in b && b.titulo ? [b.titulo] : [])),
  ]) {
    const plano = textoPlano(t);
    assert.ok(!/\*|\[\[|\]\]|\{\{|\}\}/.test(plano), `marca suelta en: ${t}`);
    assert.ok(leerMarcado(t).length > 0, t);
  }
});

test("las cartas del DAR estan en el catalogo, o se sabe por que no", () => {
  const sinImagen = new Set(DAR_SIN_IMAGEN.map(claveDeNombre));
  const enLinea = textosDelDar().flatMap(cartasDe);
  for (const n of enLinea) assert.ok(porNombre.has(claveDeNombre(n)), `{{${n}}}`);
  const ejemplos = BLOQUES_DAR.flatMap((b): string[] => {
    if (b.tipo === "cartas") return b.cartas;
    if (b.tipo === "caso" && b.carta) return [b.carta];
    return [];
  });
  for (const n of ejemplos) {
    assert.ok(porNombre.has(claveDeNombre(n)) || sinImagen.has(claveDeNombre(n)), n);
  }
  for (const n of DAR_SIN_IMAGEN) {
    assert.ok(!porNombre.has(claveDeNombre(n)), `${n} ya está en el catálogo`);
    assert.ok(ejemplos.includes(n), `${n} ya no sale en el DAR`);
  }
});
