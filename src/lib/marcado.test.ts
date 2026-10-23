import { test } from "node:test";
import assert from "node:assert/strict";

import { leerMarcado, textoPlano } from "./marcado";

test("lee las cuatro marcas y deja el resto como texto", () => {
  assert.deepEqual(
    leerMarcado("Ver [[8.1|8.1 Jugar]] con {{Venus}}: **ojo** y *nota*."),
    [
      { tipo: "texto", texto: "Ver " },
      { tipo: "ref", id: "8.1", texto: "8.1 Jugar" },
      { tipo: "texto", texto: " con " },
      { tipo: "carta", nombre: "Venus" },
      { tipo: "texto", texto: ": " },
      { tipo: "negrita", texto: "ojo" },
      { tipo: "texto", texto: " y " },
      { tipo: "cursiva", texto: "nota" },
      { tipo: "texto", texto: "." },
    ],
  );
});

test("una marca sin cerrar queda como texto, y se nota", () => {
  assert.equal(textoPlano("a **b"), "a **b");
  assert.equal(textoPlano("{{Venus"), "{{Venus");
});
