import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity } from "./deck";
import {
  AFINIDADES,
  claveAfinidad,
  esAfinidad,
  etiquetaAfinidad,
  leerBarajaPublica,
  leerListaPublica,
} from "./comunidad";

const PID = "6f1c1c3e-2b0a-4c47-9a63-2f6f0b1e8d11";

const fila = {
  public_id: PID,
  nombre: "Dragones",
  afinidad: "raza:Dragón",
  portada: "hs-040",
  alias: "Milo",
  likes: 3,
  copias: 1,
  likes_semana: 2,
  publicada_en: "2026-10-20T12:00:00+00:00",
  total: 7,
};

test("la lista se lee y una fila rota no se lleva a las demas", () => {
  const { filas, total } = leerListaPublica([
    fila,
    { ...fila, public_id: "no-es-uuid" },
    { ...fila, likes: -3 },
    { ...fila, portada: "javascript:alert(1)" },
    null,
  ]);
  assert.equal(filas.length, 1);
  assert.equal(total, 7);
  assert.equal(filas[0].publicada_en, Date.parse(fila.publicada_en));
  assert.doesNotThrow(() => leerListaPublica("basura"));
  assert.deepEqual(leerListaPublica({}).filas, []);
});

test("el texto de otro jugador pierde los caracteres de control y se acota", () => {
  const { filas } = leerListaPublica([
    { ...fila, nombre: "Dra‮gones\n2", alias: "Mi\u0000lo" + "x".repeat(40) },
  ]);
  assert.equal(filas[0].nombre, "Dragones 2");
  assert.equal(filas[0].alias.length, 20);
  assert.ok(!filas[0].alias.includes("\u0000"));
});

test("una afinidad desconocida llega como null", () => {
  const { filas } = leerListaPublica([{ ...fila, afinidad: "raza:Inventada" }]);
  assert.equal(filas[0].afinidad, null);
  assert.ok(AFINIDADES.every(esAfinidad));
  assert.equal(etiquetaAfinidad("raza:Dragón"), "Raza Dragón");
  assert.equal(etiquetaAfinidad("atributo:Luz"), "Luz");
  assert.equal(etiquetaAfinidad(null), "Sin Aliados");
});

test("la afinidad es la via mas estrecha que cumple", () => {
  assert.equal(
    claveAfinidad({
      vacio: false,
      vias: [
        { modo: "raza", raza: "Dragón" },
        { modo: "escuela", escuela: "Clan Desafiante", razas: ["Dragón", "Guerrero"] },
      ],
    }),
    "raza:Dragón",
  );
  assert.equal(claveAfinidad({ vacio: true, vias: [] }), null);
  assert.equal(claveAfinidad({ vacio: false, vias: [] }), null);
});

test("una baraja publica se valida con deckSchema", () => {
  const deck = setQuantity(createDeck("Publica"), "bu-001", "principal", 3);
  const publica = {
    public_id: PID,
    datos: deck,
    afinidad: null,
    alias: "Milo",
    likes: 0,
    copias: 0,
    publicada_en: "2026-10-20T12:00:00Z",
    mia: false,
    me_gusta: false,
  };
  assert.equal(leerBarajaPublica([publica])?.datos.nombre, "Publica");
  assert.equal(leerBarajaPublica([{ ...publica, datos: { nombre: "rota" } }]), null);
  assert.equal(leerBarajaPublica([]), null);
  assert.equal(leerBarajaPublica(null), null);
});
