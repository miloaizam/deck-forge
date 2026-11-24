import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity, setStartingGold, totalCards } from "../deck";
import { leerSala, type Sala } from "./sala";
import {
  cambiarConSide,
  cambiosConSide,
  cuantosCambios,
  numeroDeJuego,
  semillaDeRonda,
  textoDelUltimo,
  victoriasParaGanar,
} from "./serie";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

function sala(cambios: Record<string, unknown> = {}): Sala {
  const s = leerSala({
    id: "10000000-0000-4000-8000-000000000001",
    codigo: "AB3XYZ",
    formato: "estandar",
    mejor_de: 3,
    estado: "entre_juegos",
    jugador_a: A,
    jugador_b: B,
    alias_a: "Ana",
    alias_b: "Beto",
    listo_a: false,
    listo_b: false,
    victorias_a: 0,
    victorias_b: 0,
    ganador: null,
    senal_a: null,
    senal_b: null,
    creada: null,
    ...cambios,
  });
  assert.ok(s);
  return s;
}

function baraja() {
  let d = setStartingGold(createDeck("x"), "bu-237");
  d = setQuantity(d, "bu-001", "principal", 3);
  d = setQuantity(d, "bu-002", "principal", 46);
  d = setQuantity(d, "bu-003", "side", 2);
  return setQuantity(d, "bu-004", "side", 1);
}

test("cuantas victorias pide cada serie", () => {
  assert.equal(victoriasParaGanar(3), 2);
  assert.equal(victoriasParaGanar(5), 3);
});

test("el numero del juego cuenta los empates y no los anulados", () => {
  assert.equal(numeroDeJuego(sala()), 1);
  assert.equal(numeroDeJuego(sala({ victorias_a: 1, empates: 1, ronda: 4 })), 3);
});

test("la sala sin los campos de la serie se lee con sus valores de siempre", () => {
  const s = sala();
  assert.equal(s.ronda, 1);
  assert.equal(s.declara, null);
  assert.equal(s.ultimo, null);
  assert.equal(s.rendido, false);
  assert.equal(leerSala({ ...s, declarado: "nadie" }), null);
});

test("cada ronda baraja con otra semilla, y la primera con la de siempre", () => {
  assert.equal(semillaDeRonda(12345, 1), 12345);
  const vistas = new Set([1, 2, 3, 4, 5].map((r) => semillaDeRonda(12345, r)));
  assert.equal(vistas.size, 5);
  for (const v of vistas) assert.ok(v > 0 && Number.isInteger(v));
});

test("como termino el ultimo juego, dicho a cada uno", () => {
  assert.equal(textoDelUltimo(sala({ ultimo: "a" }), "a"), "Ganaste el juego.");
  assert.equal(textoDelUltimo(sala({ ultimo: "a" }), "b"), "Ana ganó el juego.");
  assert.equal(
    textoDelUltimo(sala({ ultimo: "b", rendido: true }), "b"),
    "Ganaste el juego: Ana se rindió.",
  );
  assert.equal(
    textoDelUltimo(sala({ ultimo: "b", rendido: true }), "a"),
    "Beto ganó el juego: te rendiste.",
  );
  assert.match(textoDelUltimo(sala({ ultimo: "anulado" }), "a"), /se anula/);
  assert.match(textoDelUltimo(sala({ ultimo: "empate" }), "b"), /no suma/);
});

test("cambiar con el side: una por una y siempre 50 en el Castillo", () => {
  const d = baraja();
  const c = cambiarConSide(d, "bu-002", "bu-003");
  assert.ok(c);
  assert.equal(totalCards(c.principal), 50);
  assert.equal(totalCards(c.side), 3);
  assert.deepEqual(cambiosConSide(d, c), {
    entraron: [{ id: "bu-003", n: 1 }],
    salieron: [{ id: "bu-002", n: 1 }],
  });
  // Y se deshace con el cambio inverso.
  const vuelta = cambiarConSide(c, "bu-003", "bu-002");
  assert.ok(vuelta);
  assert.equal(cuantosCambios(d, vuelta), 0);
});

test("no se cambia el oro inicial ni lo que no esta donde debe", () => {
  const d = baraja();
  assert.equal(cambiarConSide(d, "bu-237", "bu-003"), null, "oro inicial");
  assert.equal(cambiarConSide(d, "bu-003", "bu-004"), null, "no esta en el Castillo");
  assert.equal(cambiarConSide(d, "bu-001", "bu-002"), null, "no esta en el side");
  assert.equal(d.oroInicial, "bu-237");
});
