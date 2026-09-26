import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity } from "./deck";
import { mergeImported, parseDecks, MAX_BARAJAS } from "./deck-storage";

/**
 * `localStorage` lo puede editar el usuario o cualquier extension del
 * navegador, asi que lo que importa aqui es que ninguna entrada rara lance ni
 * se lleve por delante las barajas que si estan bien.
 */

const sobre = (barajas: unknown[]) => JSON.stringify({ v: 1, mazos: barajas });

test("lee un sobre normal", () => {
  const uno = setQuantity(createDeck("Uno"), "bu-001", "principal", 3);
  const dos = createDeck("Dos");
  const leidos = parseDecks(sobre([uno, dos]));
  assert.equal(leidos.length, 2);
  assert.equal(leidos[0].nombre, "Uno");
});

test("una baraja corrupta no se lleva a las demas", () => {
  const bueno = createDeck("Bueno");
  const leidos = parseDecks(sobre([{ nombre: "roto" }, bueno, null, 42, []]));
  assert.equal(leidos.length, 1, "el bueno se rescata");
  assert.equal(leidos[0].nombre, "Bueno");
});

test("acepta tambien un array pelado, por si el sobre cambia", () => {
  assert.equal(parseDecks(JSON.stringify([createDeck("Suelto")])).length, 1);
});

test("nada de lo que llegue hace lanzar", () => {
  const basura = [
    null,
    "",
    "{",
    "no es json",
    "null",
    "[]",
    "42",
    '"texto"',
    JSON.stringify({ v: 1 }),
    JSON.stringify({ v: 1, mazos: "no es lista" }),
    sobre([{ v: 99, id: "x" }]),
  ];
  for (const raw of basura) {
    assert.doesNotThrow(() => parseDecks(raw), `deberia aguantar ${raw}`);
    assert.ok(Array.isArray(parseDecks(raw)));
  }
});

test("un valor gigante se descarta antes de parsearlo", () => {
  assert.deepEqual(parseDecks("x".repeat(600 * 1024)), []);
});

test("se acota el numero de barajas", () => {
  const muchos = Array.from({ length: MAX_BARAJAS + 20 }, (_, i) => createDeck(`M${i}`));
  assert.equal(parseDecks(sobre(muchos)).length, MAX_BARAJAS);
});

test("importar nunca desplaza las barajas que ya habia", () => {
  const mias = [createDeck("Una"), createDeck("Otra"), createDeck("Tercera")];
  const llegan = Array.from({ length: MAX_BARAJAS }, (_, i) => createDeck(`Nueva ${i}`));

  const r = mergeImported(mias, llegan);
  assert.equal(r.lista.length, MAX_BARAJAS);
  for (const d of mias) {
    assert.ok(
      r.lista.some((x) => x.id === d.id),
      `${d.nombre} sigue en la lista`,
    );
  }
  assert.equal(r.entraron, MAX_BARAJAS - mias.length);
  assert.equal(r.sobraron, mias.length);
});

test("con la lista llena no entra ninguna importada", () => {
  const llenas = Array.from({ length: MAX_BARAJAS }, (_, i) => createDeck(`${i}`));
  const r = mergeImported(llenas, [createDeck("Sobra")]);
  assert.equal(r.entraron, 0);
  assert.equal(r.sobraron, 1);
  assert.deepEqual(r.lista, llenas);
});

test("una fecha fuera de rango se recorta y se puede formatear", () => {
  // 2**53 - 1 pasa `.int()`, pero con un Date asi Intl lanza RangeError y la
  // lista de barajas se caia en cada carga.
  const rota = {
    ...createDeck("Del futuro"),
    creado: 2 ** 53 - 1,
    actualizado: 2 ** 53 - 1,
  };
  const [leida] = parseDecks(sobre([rota]));
  assert.ok(leida, "la baraja se conserva");
  const fmt = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });
  assert.doesNotThrow(() => fmt.format(new Date(leida.actualizado)));
  assert.doesNotThrow(() => fmt.format(new Date(leida.creado)));
});

test("el nombre y la nota pierden los controles y los cambios de direccion", () => {
  const trucada = {
    ...createDeck(),
    nombre: "Baraja‮gnp.exe",
    descripcion: "linea uno\nlinea dos\u0000⁦fin",
  };
  const [leida] = parseDecks(sobre([trucada]));
  assert.equal(leida.nombre, "Barajagnp.exe");
  assert.equal(leida.descripcion, "linea uno linea dosfin");
});

test("los emojis compuestos no se rompen al limpiar", () => {
  // El unidor de ancho cero (U+200D) es parte del emoji: no es un control.
  const familia = "\u{1F468}‍\u{1F469}‍\u{1F467}";
  const [leida] = parseDecks(sobre([{ ...createDeck(), nombre: `Mesa ${familia}` }]));
  assert.equal(leida.nombre, `Mesa ${familia}`);
});
