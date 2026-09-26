import { test } from "node:test";
import assert from "node:assert/strict";

import { wordDiff, type Tramo } from "./word-diff";

const texto = (l: Tramo[]) => l.map((t) => t.texto).join("");
const marcados = (l: Tramo[]) => l.filter((t) => t.tipo !== "igual").map((t) => t.texto);

test("reconstruye los dos textos tal cual", () => {
  const a = "Destruye un Aliado.\nLuego, roba una carta.";
  const b = "Destruye un Aliado oponente.\nLuego, roba dos cartas.";
  const { antes, despues } = wordDiff(a, b);
  assert.equal(texto(antes), a);
  assert.equal(texto(despues), b);
});

test("marca solo lo que cambia, con la puntuacion pegada", () => {
  const { antes, despues } = wordDiff(
    "Destruye un Aliado.",
    "Destruye un Aliado oponente.",
  );
  assert.deepEqual(marcados(antes), ["Aliado."]);
  assert.deepEqual(marcados(despues), ["Aliado oponente."]);
  assert.ok(antes.every((t) => t.tipo !== "entra"));
  assert.ok(despues.every((t) => t.tipo !== "sale"));
});

test("palabras vecinas forman un solo tramo y no terminan en espacio", () => {
  const { despues } = wordDiff("Roba una carta.", "Roba una carta de esta forma.");
  assert.deepEqual(marcados(despues), ["carta de esta forma."]);
});

test("textos iguales no marcan nada", () => {
  const { antes, despues } = wordDiff("Errante.", "Errante.");
  assert.deepEqual(marcados(antes), []);
  assert.deepEqual(marcados(despues), []);
});
