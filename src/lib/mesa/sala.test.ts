import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CODIGO_SALA,
  enLaSala,
  GRACIA_MS,
  restanteDeGracia,
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

test("la sala trae por que termino y la hora de la base; sin ellos, null", () => {
  const vieja = leerSala(fila())!;
  assert.equal(vieja.motivo, null);
  assert.equal(vieja.ahora, null);
  const terminada = leerSala(
    fila({ estado: "terminada", motivo: "abandono", ahora: "2026-11-24T00:05:00Z" }),
  )!;
  assert.equal(terminada.motivo, "abandono");
  assert.equal(
    leerSala(fila({ estado: "terminada", motivo: "retiro" }))?.motivo,
    "retiro",
  );
  assert.equal(leerSala(fila({ motivo: "otro" })), null);
});

test("la gracia se cuenta con la hora de la base, no con el reloj del navegador", () => {
  const sala = leerSala(
    fila({
      jugador_b: B,
      senal_b: "2026-11-24T00:00:00Z",
      ahora: "2026-11-24T00:01:00Z",
    }),
  )!;
  // Un reloj local adelantado una hora no cambia nada: cuenta lo que paso aqui.
  const recibida = Date.parse("2026-11-24T01:00:00Z");
  assert.equal(restanteDeGracia(sala, "b", recibida, recibida), 60_000);
  assert.equal(restanteDeGracia(sala, "b", recibida, recibida + 45_000), 15_000);
  assert.equal(restanteDeGracia(sala, "b", recibida, recibida + 90_000), 0);
  assert.equal(GRACIA_MS, 120_000);
  // Sin senal o sin hora de la base, no hay cuenta.
  assert.equal(restanteDeGracia(leerSala(fila({ jugador_b: B }))!, "b", 0, 0), null);
});

test("en la sala: una senal de menos de 45 s, contada con la hora de la base", () => {
  const sala = leerSala(
    fila({
      jugador_b: B,
      senal_a: "2026-11-24T00:00:30Z",
      senal_b: "2026-11-24T00:00:00Z",
      ahora: "2026-11-24T00:01:00Z",
    }),
  )!;
  const recibida = Date.parse("2026-11-24T05:00:00Z");
  // A dio senal hace 30 s; B, hace 60.
  assert.equal(enLaSala(sala, "a", recibida, recibida), true);
  assert.equal(enLaSala(sala, "b", recibida, recibida), false);
  // Pasan 20 s en este navegador: A ya lleva 50.
  assert.equal(enLaSala(sala, "a", recibida, recibida + 20_000), false);
  // Sin hora de la base no se sabe.
  assert.equal(enLaSala(leerSala(fila({ jugador_b: B }))!, "a", 0, 0), false);
});

test("la foto de cada jugador: una ruta valida o nada", () => {
  const conFoto = leerSala(fila({ avatar_a: `${A}?v=1700000000000`, avatar_b: null }))!;
  assert.equal(conFoto.avatar_a, `${A}?v=1700000000000`);
  assert.equal(conFoto.avatar_b, null);
  // Sin las claves (una base sin pegar el cambio), sin foto.
  assert.equal(leerSala(fila())!.avatar_a, null);
  // Una ruta rara no llega a un <img>: queda sin foto, la sala igual se lee.
  const rara = leerSala(fila({ avatar_a: "https://otro.host/x.png" }));
  assert.equal(rara?.avatar_a, null);
});
