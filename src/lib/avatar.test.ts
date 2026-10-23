import { test } from "node:test";
import assert from "node:assert/strict";

import { esRutaAvatar, recorteCuadrado, rutaAvatar, urlAvatar } from "./avatar";

const UID = "0c9b7c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const BASE = "https://abc.supabase.co";

test("la ruta de la foto es el user_id con su version", () => {
  assert.equal(rutaAvatar(UID, 1700000000000), `${UID}?v=1700000000000`);
  assert.equal(rutaAvatar(UID, null), null);
  assert.equal(
    urlAvatar(BASE, `${UID}?v=5`),
    `${BASE}/storage/v1/object/public/avatares/${UID}?v=5`,
  );
});

test("una ruta que llega de afuera no puede salir del bucket", () => {
  // Lo que devuelve la base pasa por aqui antes de ir a un <img>.
  for (const mala of [
    null,
    42,
    "",
    UID, // sin version
    `${UID}?v=0`,
    `${UID}?v=-1`,
    `${UID}?v=1&x=2`,
    `../${UID}?v=1`,
    `${UID}/../otro?v=1`,
    `https://malo.com/${UID}?v=1`,
    `javascript:alert(1)//${UID}?v=1`,
    `${UID.toUpperCase()}?v=1`,
    `${UID}?v=1\n`,
  ]) {
    assert.equal(esRutaAvatar(mala), false, String(mala));
    assert.equal(urlAvatar(BASE, mala), null, String(mala));
  }
  // Sin nube no hay URL aunque la ruta sea buena.
  assert.equal(urlAvatar(null, `${UID}?v=1`), null);
});

test("el recorte es el cuadrado mas grande, al centro", () => {
  assert.deepEqual(recorteCuadrado(400, 300), { x: 50, y: 0, lado: 300 });
  assert.deepEqual(recorteCuadrado(300, 401), { x: 0, y: 50, lado: 300 });
  assert.deepEqual(recorteCuadrado(128, 128), { x: 0, y: 0, lado: 128 });
});
