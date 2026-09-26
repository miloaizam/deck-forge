import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import lzString from "lz-string";

import { createDeck, setQuantity, setStartingGold } from "./deck";
import {
  decodeDeck,
  encodeDeck,
  codeFromHash,
  exportFile,
  importFile,
  shareUrl,
  LARGO_INCOMODO,
} from "./deck-code";
import type { Deck } from "./types";

/**
 * El codigo del enlace y el archivo de respaldo son entrada externa: los puede
 * escribir cualquiera. Lo que se prueba aqui no es solo que el viaje de ida y
 * vuelta funcione, sino sobre todo que **nada de lo que llegue haga lanzar**.
 */

function mazoDePrueba(): Deck {
  let deck = setStartingGold(createDeck("Dragones de prueba"), "bu-225");
  deck = setQuantity(deck, "bu-001", "principal", 1);
  deck = setQuantity(deck, "bu-058", "principal", 3);
  deck = setQuantity(deck, "bu-045", "side", 2);
  return deck;
}

test("una baraja sobrevive el viaje de ida y vuelta", () => {
  const original = mazoDePrueba();
  const resultado = decodeDeck(encodeDeck(original));

  assert.ok(resultado.ok);
  assert.equal(resultado.deck.nombre, original.nombre);
  assert.equal(resultado.deck.oroInicial, original.oroInicial);
  assert.deepEqual(
    [...resultado.deck.principal].sort((a, b) => a.id.localeCompare(b.id)),
    [...original.principal].sort((a, b) => a.id.localeCompare(b.id)),
  );
  assert.deepEqual(resultado.deck.side, original.side);
});

test("la baraja decodificada trae id propio y no el de quien la compartio", () => {
  const original = mazoDePrueba();
  const resultado = decodeDeck(encodeDeck(original));
  assert.ok(resultado.ok);
  assert.notEqual(resultado.deck.id, original.id, "el id local no debe viajar");
});

test("una baraja llena cabe comodo en una URL", () => {
  // 50 cartas distintas es el peor caso realista para el largo del codigo.
  let deck = setStartingGold(createDeck("Baraja larga"), "bu-225");
  for (let i = 1; i <= 49; i++) {
    deck = setQuantity(deck, `bu-${String(i).padStart(3, "0")}`, "principal", 1);
  }
  const url = shareUrl(deck, "https://deckforge-myl.pages.dev");
  assert.ok(
    url.length < LARGO_INCOMODO,
    `la URL mide ${url.length} y deberia bajar de ${LARGO_INCOMODO}`,
  );
  assert.match(url, /\/baraja\/#d=/, "la ruta lleva barra final antes del fragmento");
});

test("el codigo no lleva nada que la URL tenga que escapar", () => {
  // base64url: si se colara un +, un / o un =, el enlace se rompe al pegarlo.
  const codigo = encodeDeck(mazoDePrueba());
  assert.match(codigo, /^[A-Za-z0-9_-]+$/);
  assert.equal(encodeURIComponent(codigo), codigo);
});

test("el codigo binario es bastante mas corto que el JSON comprimido", () => {
  // El motivo de existir de la version 2. Si algun dia empata, no vale la pena.
  let deck = setStartingGold(createDeck("Comparacion"), "hs-040");
  for (let i = 1; i <= 20; i++) {
    deck = setQuantity(deck, `hs-${String(i).padStart(3, "0")}`, "principal", 3);
  }
  const binario = encodeDeck(deck).length;
  const lz = lzString.compressToEncodedURIComponent(
    JSON.stringify([
      1,
      deck.nombre,
      deck.oroInicial,
      deck.principal.map((e) => [e.id, e.n]),
      [],
    ]),
  ).length;
  assert.ok(
    binario * 2 < lz,
    `binario ${binario}, lz ${lz}: deberia ser menos de la mitad`,
  );
});

test("las copias sin tope de los Oros viajan enteras", () => {
  // Un Oro sin habilidad puede ir 35 veces: no cabe en los dos bits de siempre.
  let deck = setQuantity(createDeck("Oros"), "bu-237", "principal", 35);
  deck = setQuantity(deck, "bu-001", "principal", 1);
  const r = decodeDeck(encodeDeck(deck));
  assert.ok(r.ok);
  assert.equal(r.deck.principal.find((e) => e.id === "bu-237")?.n, 35);
});

test("todos los prefijos del catalogo estan en la tabla del enlace", () => {
  // Si una edicion nueva no esta, su enlace cae al formato 1 y se alarga sin
  // que nada falle. Este test es el que avisa.
  const catalogo: { id: string }[] = JSON.parse(
    readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8"),
  );
  const faltan = new Set<string>();
  for (const carta of catalogo) {
    const deck = setQuantity(createDeck("Prefijos"), carta.id, "principal", 1);
    // El formato 1 empieza siempre por el JSON `[1,` comprimido; el binario, no.
    if (!/^[A-Za-z0-9_-]+$/.test(encodeDeck(deck))) faltan.add(carta.id);
  }
  assert.deepEqual([...faltan], []);

  // Y la vuelta: el id de cada carta vuelve tal cual del codigo.
  const muestra = ["bu-001", "sn-141", "do-256", "ee-326", "sp-071"];
  for (const id of muestra) {
    const r = decodeDeck(encodeDeck(setQuantity(createDeck(""), id, "principal", 2)));
    assert.ok(r.ok, id);
    assert.deepEqual(r.deck.principal, [{ id, n: 2 }]);
  }
});

test("un id que el formato binario no sabe escribir cae al formato 1", () => {
  // `he-042` es de Helenica, que si esta en la tabla; `xx-001` no es de nadie.
  // Lo que no puede pasar es que la carta se pierda por el camino.
  for (const id of ["xx-001", "bu-0001"]) {
    const deck = setQuantity(createDeck("Rara"), id, "principal", 1);
    const r = decodeDeck(encodeDeck(deck));
    assert.ok(r.ok, id);
    assert.deepEqual(r.deck.principal, [{ id, n: 1 }]);
  }
});

test("un enlace del formato 1 se sigue leyendo", () => {
  // Codigo tal cual lo escribia la version anterior. Los que ya se compartieron
  // tienen que seguir abriendose.
  const v1 = lzString.compressToEncodedURIComponent(
    JSON.stringify([
      1,
      "Dragones de prueba",
      "bu-225",
      [
        ["bu-001", 1],
        ["bu-058", 3],
      ],
      [["bu-045", 2]],
    ]),
  );
  const r = decodeDeck(v1);
  assert.ok(r.ok);
  assert.equal(r.deck.nombre, "Dragones de prueba");
  assert.equal(r.deck.oroInicial, "bu-225");
  assert.deepEqual(r.deck.side, [{ id: "bu-045", n: 2 }]);
});

test("decodeDeck no lanza con basura", () => {
  const basura = [
    null,
    undefined,
    "",
    "no-es-un-codigo",
    "////",
    "%%%%",
    "a".repeat(5000),
    encodeDeck(mazoDePrueba()).slice(0, 12), // cortado a la mitad
  ];
  for (const c of basura) {
    const r = decodeDeck(c as string);
    assert.equal(r.ok, false, `deberia rechazar ${JSON.stringify(c)?.slice(0, 20)}`);
    assert.ok(r.ok === false && r.mensaje.length > 0, "y explicar por que");
  }
});

test("un codigo demasiado largo se rechaza antes de descomprimir", () => {
  const r = decodeDeck("x".repeat(5000));
  assert.equal(r.ok, false);
  assert.equal(r.ok === false ? r.motivo : "", "largo");
});

test("un codigo de otra version se distingue de uno ilegible", () => {
  // Forma perfectamente valida, version desconocida: el usuario merece saber
  // que el enlace es de otra version, no que "no se pudo leer".
  const deOtraVersion = lzString.compressToEncodedURIComponent(
    JSON.stringify([99, "Del futuro", null, [], []]),
  );
  const r = decodeDeck(deOtraVersion);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false ? r.motivo : "", "version");

  // Lo mismo con un codigo binario de una version futura: el primer byte es 7.
  const binarioDelFuturo = Buffer.from([7, 0, 0, 0]).toString("base64url");
  const rb = decodeDeck(binarioDelFuturo);
  assert.equal(rb.ok, false);
  assert.equal(rb.ok === false ? rb.motivo : "", "version");

  // Y la version actual si se lee.
  assert.ok(decodeDeck(encodeDeck(mazoDePrueba())).ok);
});

test("el archivo de respaldo va y vuelve", () => {
  const barajas = [mazoDePrueba(), createDeck("Otro")];
  const resultado = importFile(exportFile(barajas));

  assert.ok(resultado);
  assert.equal(resultado.barajas.length, 2);
  assert.equal(resultado.descartados, 0);
  assert.equal(resultado.barajas[0].nombre, "Dragones de prueba");
});

test("importar asigna ids nuevos, para no pisar lo que ya habia", () => {
  const original = mazoDePrueba();
  const resultado = importFile(exportFile([original]));
  assert.ok(resultado);
  assert.notEqual(resultado.barajas[0].id, original.id);
});

test("importFile rescata las barajas buenas y cuenta las malas", () => {
  const bueno = mazoDePrueba();
  const archivo = JSON.stringify({
    app: "deckforge",
    v: 1,
    mazos: [bueno, { nombre: "roto" }, null, 42],
  });

  const resultado = importFile(archivo);
  assert.ok(resultado);
  assert.equal(resultado.barajas.length, 1, "el bueno se rescata");
  assert.equal(resultado.descartados, 3, "los tres malos se cuentan");
});

test("importFile no lanza con basura", () => {
  for (const c of ["", "{", "null", "[]", '{"app":"otra","v":1,"mazos":[]}', "[1,2,3]"]) {
    assert.doesNotThrow(() => importFile(c));
  }
  assert.equal(importFile("no es json"), null);
});

test("un archivo con __proto__ no contamina los objetos del sitio", () => {
  const archivo = `{"app":"deckforge","v":1,"__proto__":{"infectado":true},"mazos":[${JSON.stringify(
    createDeck("Normal"),
  ).replace("{", '{"__proto__":{"infectado":true},')}]}`;
  const resultado = importFile(archivo);
  assert.equal(resultado?.barajas.length, 1);
  assert.equal(({} as Record<string, unknown>).infectado, undefined);
  assert.equal(Object.hasOwn(resultado!.barajas[0], "__proto__"), false);
});

test("un archivo con fechas imposibles importa sin romper el formato de fecha", () => {
  const rota = { ...createDeck("Futuro"), actualizado: 2 ** 53 - 1 };
  const resultado = importFile(exportFile([rota]));
  assert.equal(resultado?.barajas.length, 1);
  const fmt = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });
  assert.doesNotThrow(() => fmt.format(new Date(resultado!.barajas[0].actualizado)));
});

test("un nombre con cambio de direccion llega limpio por el enlace", () => {
  const trucada = { ...mazoDePrueba(), nombre: "Mia‮gnp" };
  const r = decodeDeck(encodeDeck(trucada));
  assert.ok(r.ok);
  assert.equal(r.ok && r.deck.nombre, "Miagnp");
});

test("el enlace lleva la baraja en el fragmento, que no llega al servidor", () => {
  const url = new URL(shareUrl(mazoDePrueba(), "https://deckforge.example"));
  assert.equal(url.search, "", "nada en la query string");
  const codigo = codeFromHash(url.hash);
  assert.ok(codigo);
  const r = decodeDeck(codigo);
  assert.ok(r.ok);
  assert.equal(r.ok && r.deck.nombre, mazoDePrueba().nombre);
});

test("codeFromHash no lanza y distingue lo que no es una baraja", () => {
  assert.equal(codeFromHash(""), null);
  assert.equal(codeFromHash("#"), null);
  assert.equal(codeFromHash("#m=abc"), null);
  assert.equal(codeFromHash("#d="), null);
  assert.equal(codeFromHash("#d=%E0%A4%A"), null, "un escape roto no revienta");
  assert.equal(codeFromHash("#x=1&d=abc"), "abc");
  // El formato 1 lleva `+`, que URLSearchParams convertiria en espacio.
  assert.equal(codeFromHash("#d=a+b$c"), "a+b$c");
});
