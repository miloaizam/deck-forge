import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity } from "./deck";
import { MAX_BARAJAS, parseLapidas } from "./deck-storage";
import {
  fusionarBarajas,
  fusionarColecciones,
  leerColeccionRemota,
  leerFilas,
  type Remota,
} from "./sync";
import type { Deck } from "./types";

/** Una baraja con fecha fija, para que los tests no dependan del reloj. */
function baraja(nombre: string, actualizado: number, id?: string): Deck {
  const d = setQuantity(createDeck(nombre), "bu-001", "principal", 2);
  return { ...d, id: id ?? d.id, creado: 1, actualizado };
}

const remota = (d: Deck): Remota => ({ id: d.id, deck: d, actualizado: d.actualizado });
const borrada = (id: string, actualizado: number): Remota => ({
  id,
  deck: null,
  actualizado,
});

test("lo que esta en un solo lado pasa al otro", () => {
  const aqui = baraja("Aqui", 10);
  const alla = baraja("Alla", 20);
  const plan = fusionarBarajas([aqui], [remota(alla)], [], 99);
  assert.deepEqual(
    plan.locales.map((d) => d.nombre),
    ["Alla", "Aqui"],
  );
  assert.deepEqual(
    plan.subir.map((d) => d.nombre),
    ["Aqui"],
  );
  assert.equal(plan.traidas, 1);
  assert.equal(plan.cambioLocal, true);
});

test("en los dos lados gana el mas reciente", () => {
  const vieja = baraja("Vieja", 10, "aaaaaaaaaa");
  const nueva = { ...vieja, nombre: "Nueva", actualizado: 20 };

  const bajando = fusionarBarajas([vieja], [remota(nueva)], [], 99);
  assert.equal(bajando.locales[0].nombre, "Nueva");
  assert.equal(bajando.subir.length, 0);

  const subiendo = fusionarBarajas([nueva], [remota(vieja)], [], 99);
  assert.equal(subiendo.locales[0].nombre, "Nueva");
  assert.deepEqual(subiendo.subir, [nueva]);
  assert.equal(subiendo.cambioLocal, false);
});

test("empate: no se toca nada", () => {
  const d = baraja("Igual", 10);
  const plan = fusionarBarajas([d], [remota(d)], [], 99);
  assert.equal(plan.cambioLocal, false);
  assert.equal(plan.subir.length, 0);
  assert.equal(plan.borrar.length, 0);
});

test("un borrado aqui sube como lapida, salvo que alla la editaran despues", () => {
  const d = baraja("Borrame", 10);
  const plan = fusionarBarajas([], [remota(d)], [{ id: d.id, borrada: 15 }], 99);
  assert.deepEqual(plan.borrar, [{ id: d.id, borrada: 15 }]);
  assert.equal(plan.locales.length, 0, "no la revive");

  const editadaDespues = fusionarBarajas([], [remota(d)], [{ id: d.id, borrada: 5 }], 99);
  assert.equal(editadaDespues.borrar.length, 0);
  assert.equal(editadaDespues.locales[0].id, d.id, "gana la edicion mas nueva");
});

test("un borrado alla se lleva la de aqui, salvo que aqui la editaran despues", () => {
  const d = baraja("Borrada alla", 10);
  const plan = fusionarBarajas([d], [borrada(d.id, 15)], [], 99);
  assert.equal(plan.locales.length, 0);
  assert.equal(plan.cambioLocal, true);

  const editadaDespues = fusionarBarajas([d], [borrada(d.id, 5)], [], 99);
  assert.equal(editadaDespues.locales.length, 1);
  assert.deepEqual(editadaDespues.subir, [d], "vuelve a subir");
});

test("una lapida de algo que la nube no tiene no hace nada", () => {
  const plan = fusionarBarajas([], [], [{ id: "zzzzzzzzzz", borrada: 5 }], 99);
  assert.equal(plan.borrar.length, 0);
  assert.equal(plan.cambioLocal, false);
});

test("nunca desplaza: lo de la nube entra solo si cabe", () => {
  const llenas = Array.from({ length: MAX_BARAJAS - 1 }, (_, i) => baraja(`L${i}`, 10));
  const alla = [baraja("R1", 30), baraja("R2", 40), baraja("R3", 20)];
  const plan = fusionarBarajas(llenas, alla.map(remota), [], 99);
  assert.equal(plan.locales.length, MAX_BARAJAS);
  assert.equal(plan.traidas, 1);
  assert.equal(plan.noCupieron, 2);
  assert.equal(plan.locales[0].nombre, "R2", "entra la mas reciente");
  assert.ok(
    llenas.every((d) => plan.locales.includes(d)),
    "no se pierde ninguna de aqui",
  );
});

test("un choque de nombre entra renombrado y sube asi", () => {
  const aqui = baraja("Dragones", 10);
  const alla = baraja("dragones", 20);
  const plan = fusionarBarajas([aqui], [remota(alla)], [], 99);
  const llegada = plan.locales.find((d) => d.id === alla.id)!;
  assert.equal(llegada.nombre, "dragones (copia)");
  assert.equal(llegada.actualizado, 99);
  assert.ok(plan.subir.some((d) => d.id === alla.id && d.nombre === "dragones (copia)"));
});

test("las filas de la nube se validan: lo raro se ignora sin lanzar", () => {
  const d = baraja("Buena", 10);
  const fila = {
    id: d.id,
    datos: d,
    actualizado: 10,
    borrada: false,
    publica: true,
    public_id: "6f1c1c3e-2b0a-4c47-9a63-2f6f0b1e8d11",
    oculta: false,
    likes: 3,
    copias: 1,
    afinidad: null,
  };
  const { remotas, publicas } = leerFilas([
    fila,
    { ...fila, id: "otroidxxxx" }, // el id de adentro no coincide
    { ...fila, datos: { nombre: "rota" } },
    { ...fila, likes: -1 },
    null,
    "texto",
    { ...fila, id: "bbbbbbbbbb", borrada: true, datos: null },
  ]);
  assert.deepEqual(
    remotas.map((r) => [r.id, r.deck?.nombre ?? null]),
    [
      [d.id, "Buena"],
      ["bbbbbbbbbb", null],
    ],
  );
  assert.equal(publicas[d.id].likes, 3);
  assert.doesNotThrow(() => leerFilas("no es lista"));
  assert.deepEqual(leerFilas({}).remotas, []);
});

test("las lapidas del navegador se leen a la defensiva", () => {
  assert.deepEqual(parseLapidas(null), []);
  assert.deepEqual(parseLapidas("{"), []);
  assert.deepEqual(
    parseLapidas(
      JSON.stringify([
        { id: "aaaaaaaaaa", borrada: 5 },
        { id: "malo", borrada: 5 },
        { id: "bbbbbbbbbb", borrada: -1 },
        { id: "cccccccccc", borrada: 7, extra: "x" },
      ]),
    ),
    [
      { id: "aaaaaaaaaa", borrada: 5 },
      { id: "cccccccccc", borrada: 7 },
    ],
  );
});

/* ---------------------------- Coleccion ---------------------------- */

const col = (tengo: Record<string, number>, quiero: Record<string, number> = {}) => ({
  tengo,
  quiero,
});

test("la primera vez la coleccion se suma: no se pierde nada", () => {
  const aqui = { coleccion: col({ "bu-001": 2 }, { "do-010": 1 }), actualizado: 50 };
  const alla = { coleccion: col({ "bu-001": 1, "hs-040": 3 }), actualizado: 90 };
  const plan = fusionarColecciones(aqui, alla, true, 99);
  const esperada = col({ "bu-001": 2, "hs-040": 3 }, { "do-010": 1 });
  assert.deepEqual(plan.subir?.coleccion, esperada);
  assert.deepEqual(plan.local?.coleccion, esperada);
  assert.equal(plan.subir?.actualizado, 99);
});

test("la primera vez, si la de aqui ya esta contenida, solo baja", () => {
  const aqui = { coleccion: col({ "bu-001": 1 }), actualizado: 50 };
  const alla = { coleccion: col({ "bu-001": 2 }), actualizado: 40 };
  const plan = fusionarColecciones(aqui, alla, true, 99);
  assert.equal(plan.subir, null);
  assert.deepEqual(plan.local, alla);
});

test("despues gana la coleccion mas reciente, entera", () => {
  const aqui = { coleccion: col({ "bu-001": 1 }), actualizado: 50 };
  const alla = { coleccion: col({ "hs-040": 1 }), actualizado: 60 };
  assert.deepEqual(fusionarColecciones(aqui, alla, false, 99), {
    local: alla,
    subir: null,
  });
  assert.deepEqual(fusionarColecciones({ ...aqui, actualizado: 70 }, alla, false, 99), {
    local: null,
    subir: { ...aqui, actualizado: 70 },
  });
});

test("sin coleccion en la nube sube la de aqui, si tiene algo", () => {
  const vacia = { coleccion: col({}), actualizado: 0 };
  assert.deepEqual(fusionarColecciones(vacia, null, true, 99), {
    local: null,
    subir: null,
  });
  const plan = fusionarColecciones(
    { coleccion: col({ "bu-001": 1 }), actualizado: 0 },
    null,
    true,
    99,
  );
  assert.equal(plan.subir?.actualizado, 99, "sin fecha conocida, ahora");
});

test("la coleccion de la nube se valida entrada por entrada", () => {
  const leida = leerColeccionRemota(
    { cartas: { "bu-001": 2, "<script>": 1, "hs-040": 500 }, quiero: ["do-010"] },
    123,
  );
  assert.deepEqual(leida.coleccion.tengo, { "bu-001": 2 });
  assert.deepEqual(leida.coleccion.quiero, { "do-010": 1 });
  assert.equal(leida.actualizado, 123);
  assert.equal(leerColeccionRemota(null, "x").actualizado, 0);
});
