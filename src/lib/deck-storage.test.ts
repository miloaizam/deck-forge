import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity } from "./deck";
import {
  insertDeck,
  mensajeNoGuardada,
  mergeImported,
  nombreLibre,
  nombreOcupado,
  parseDecks,
  MAX_BARAJAS,
} from "./deck-storage";
import { exportFile, importFile } from "./deck-code";
import { deckSchema, MAX_DESCRIPCION_BARAJA, MAX_NOMBRE_BARAJA } from "./types";

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

test("dos barajas no comparten nombre: mayusculas y espacios no cuentan", () => {
  const mias = [createDeck("Dragón Control")];
  assert.equal(nombreOcupado("dragón  control ", mias), true);
  assert.equal(
    nombreOcupado("Dragón Control", mias, mias[0].id),
    false,
    "la propia no choca",
  );
  assert.equal(nombreOcupado("Otra", mias), false);
  assert.equal(nombreOcupado("  ", mias), false);
});

test("nombreLibre agrega (copia) y cuenta, sin apilar sufijos", () => {
  const mias = [createDeck("Dragón"), createDeck("Dragón (copia)")];
  assert.equal(nombreLibre("Nueva", mias), "Nueva");
  assert.equal(nombreLibre("Dragón", mias), "Dragón (copia 2)");
  assert.equal(nombreLibre("Dragón (copia)", mias), "Dragón (copia 2)");
  const largo = "x".repeat(MAX_NOMBRE_BARAJA);
  const libre = nombreLibre(largo, [createDeck(largo)]);
  assert.ok(libre.length <= MAX_NOMBRE_BARAJA && libre.endsWith(" (copia)"), libre);
});

test("importar renombra lo que choca, tambien dentro del mismo archivo", () => {
  const mias = [createDeck("Dragón")];
  const r = mergeImported(mias, [
    createDeck("Dragón"),
    createDeck("Sombra"),
    createDeck("sombra"),
  ]);
  assert.deepEqual(
    r.lista.slice(0, 3).map((d) => d.nombre),
    ["Dragón (copia)", "Sombra", "sombra (copia)"],
  );
  assert.equal(r.renombradas, 2);
});

test("guardar una baraja nueva con la lista llena no desplaza a ninguna", () => {
  const llenas = Array.from({ length: MAX_BARAJAS }, (_, i) => createDeck(`L${i}`));
  assert.equal(insertDeck(llenas, createDeck("La 51")), null);
  assert.equal(llenas.length, MAX_BARAJAS);
  assert.match(mensajeNoGuardada("lleno"), new RegExp(`${MAX_BARAJAS} barajas`));
});

test("con la lista llena, reemplazar una que ya existe si se puede", () => {
  const llenas = Array.from({ length: MAX_BARAJAS }, (_, i) => createDeck(`L${i}`));
  const editada = { ...llenas[30], nombre: "Editada" };
  const lista = insertDeck(llenas, editada);
  assert.ok(lista);
  assert.equal(lista.length, MAX_BARAJAS);
  assert.equal(lista[0].nombre, "Editada");
  assert.equal(new Set(lista.map((d) => d.id)).size, MAX_BARAJAS);
});

test("una baraja nueva entra primera si hay espacio", () => {
  const pocas = [createDeck("A"), createDeck("B")];
  const lista = insertDeck(pocas, createDeck("Nueva"));
  assert.deepEqual(
    lista?.map((d) => d.nombre),
    ["Nueva", "A", "B"],
  );
});

test("un respaldo con ids gigantes no entra: dejaria la lista sin poder leerse", () => {
  // Menos de 1 MB (lo que admite el importador) y, sin tope en el id, mas de lo
  // que parseDecks acepta leer despues: la lista salia vacia.
  const hostil = {
    ...createDeck("Hostil"),
    principal: Array.from({ length: 60 }, (_, i) => ({ id: `a${i}`.repeat(1500), n: 1 })),
  };
  const archivo = exportFile([hostil]);
  assert.ok(archivo.length < 1024 * 1024);
  assert.deepEqual(importFile(archivo)?.barajas, []);
});

test("cincuenta barajas en el peor caso valido se siguen pudiendo leer", () => {
  // Lo que mas crece al pasar a JSON: una mitad de surrogate suelta se escribe
  // con 6 caracteres (\ud800) y una comilla con 2. Se pasa por el esquema,
  // porque lo que se guarda es lo que el esquema deja pasar.
  const larga = (i: number) =>
    deckSchema.parse({
      ...createDeck(`${'"'.repeat(MAX_NOMBRE_BARAJA)}${i}`.slice(-MAX_NOMBRE_BARAJA)),
      descripcion: "\ud800".repeat(MAX_DESCRIPCION_BARAJA),
      oroInicial: "x".repeat(40),
      portada: "x".repeat(40),
      principal: Array.from({ length: 60 }, (_, k) => ({
        id: `${k}`.padStart(40, "x"),
        n: 50,
      })),
      side: Array.from({ length: 20 }, (_, k) => ({
        id: `${k}`.padStart(40, "y"),
        n: 50,
      })),
    });
  const barajas = Array.from({ length: MAX_BARAJAS }, (_, i) => larga(i));
  assert.equal(
    barajas[0].descripcion.length,
    MAX_DESCRIPCION_BARAJA,
    "el esquema no la recorto",
  );
  assert.equal(parseDecks(sobre(barajas)).length, MAX_BARAJAS);
});
