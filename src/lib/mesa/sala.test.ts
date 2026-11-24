import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CODIGO_SALA,
  leerMisSalas,
  leerSala,
  miLado,
  nombreEnSala,
  normalizarCodigo,
} from "./sala";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

/** Una fila como la devuelve `ver_mesa()`. */
function fila(cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    codigo: "AB3XYZ",
    formato: "vcr",
    mejor_de: 3,
    estado: "esperando",
    jugador_a: A,
    jugador_b: null,
    alias_a: "Anfitrion",
    alias_b: null,
    listo_a: false,
    listo_b: false,
    victorias_a: 0,
    victorias_b: 0,
    ganador: null,
    senal_a: "2026-11-24T00:00:00Z",
    senal_b: null,
    creada: "2026-11-24T00:00:00Z",
    ...cambios,
  };
}

test("el codigo se normaliza al escribirlo o pegarlo", () => {
  assert.equal(normalizarCodigo("ab3xyz"), "AB3XYZ");
  assert.equal(normalizarCodigo(" AB3-XYZ "), "AB3XYZ");
  assert.equal(normalizarCodigo("ab3 xyz"), "AB3XYZ");
  // Los que se confunden no existen: 0, O, 1, I, L.
  for (const malo of [
    "AB0XYZ",
    "ABOXYZ",
    "AB1XYZ",
    "ABIXYZ",
    "ABLXYZ",
    "ABCDE",
    "ABCDEFG",
  ]) {
    assert.equal(normalizarCodigo(malo), null, malo);
  }
});

test("el alfabeto de la base y el del sitio son el mismo", () => {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (const l of letras) assert.ok(CODIGO_SALA.test(l.repeat(6)), l);
  for (const l of "01ILO") assert.ok(!CODIGO_SALA.test(l.repeat(6)), l);
});

test("una sala buena se lee, y una rota no tumba nada", () => {
  const sala = leerSala(fila());
  assert.equal(sala?.formato, "vcr");
  assert.equal(leerSala(null), null, "no existe o no es tuya");
  assert.equal(leerSala(fila({ formato: "otro" })), null);
  assert.equal(leerSala(fila({ mejor_de: 7 })), null);
  assert.equal(leerSala(fila({ jugador_a: "no-es-uuid" })), null);
  assert.equal(leerSala(fila({ codigo: "<script>" })), null);
  assert.equal(leerSala(fila({ victorias_a: 99 })), null);
});

test("el alias del rival se limpia: sin controles, sin cambios de direccion, 20 letras", () => {
  const sala = leerSala(fila({ alias_b: "Mi‮lo\u0007" + "x".repeat(40) }))!;
  assert.ok(!/[‮\u0007]/.test(sala.alias_b ?? ""));
  assert.equal(sala.alias_b?.length, 20);
});

test("mis salas descarta las filas rotas y topa la lista", () => {
  const lista = leerMisSalas([fila(), { basura: true }, fila({ codigo: "BBBBBB" })]);
  assert.deepEqual(
    lista.map((s) => s.codigo),
    ["AB3XYZ", "BBBBBB"],
  );
  assert.deepEqual(leerMisSalas("no es lista"), []);
  assert.equal(leerMisSalas(Array.from({ length: 30 }, () => fila())).length, 10);
});

test("mi lado y el nombre de cada jugador", () => {
  const sala = leerSala(fila({ jugador_b: B, alias_b: null }))!;
  assert.equal(miLado(sala, A), "a");
  assert.equal(miLado(sala, B), "b");
  assert.equal(miLado(sala, "otro"), null);
  assert.equal(nombreEnSala(sala, "a"), "Anfitrion");
  assert.equal(nombreEnSala(sala, "b"), "Invitado");
});
