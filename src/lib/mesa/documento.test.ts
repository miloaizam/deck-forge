import { test } from "node:test";
import assert from "node:assert/strict";

import { rutaDelDocumento, traeLaCspDeLaMesa } from "./documento";

test("la ruta es la del documento cargado, no la que se ve", () => {
  // Se entro por el catalogo y se navego con el router a la sala.
  assert.equal(
    rutaDelDocumento("https://x.cl/catalogo/", "https://x.cl/mesa/?s=1"),
    "/catalogo/",
  );
  // Sin entrada de navegacion, la actual.
  assert.equal(rutaDelDocumento(undefined, "https://x.cl/mesa/?s=1"), "/mesa/");
  assert.equal(rutaDelDocumento("no es url", "https://x.cl/mesa/"), "/mesa/");
});

test("solo las paginas de /mesa traen el wss:// del tiempo real", () => {
  for (const r of ["/mesa", "/mesa/", "/mesa/practica/"])
    assert.ok(traeLaCspDeLaMesa(r), r);
  for (const r of ["/", "/catalogo/", "/cuenta/", "/mesas/", "/barajas/"]) {
    assert.ok(!traeLaCspDeLaMesa(r), r);
  }
});
