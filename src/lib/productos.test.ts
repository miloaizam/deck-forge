import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { claveDeNombre } from "./documentos";
import { EDITIONS, ORIGENES } from "./editions";
import { catalogSchema, RAZAS_POR_ESCUELA, type Card } from "./types";

/**
 * Los productos especiales del formato, segun la tabla de "Escuelas
 * Elementales (Formato)" del fandom: cada carta que traen tiene que estar en
 * el catalogo, en una de las diez ediciones o en Adicionales (ver CLAUDE.md,
 * "Los mazos especiales del formato").
 *
 * Las listas son las del fandom, carta a carta. Kit Sanctum, Kit Terra
 * Orientalis y la extension de Escuelas Elementales no estan aqui: son
 * EE-301...326, con su propio codigo, y los cubre la edicion.
 */

const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);
const nombres = new Set(CATALOGO.map((c) => claveDeNombre(c.nombre)));

const PRODUCTOS: Record<string, string[]> = {
  // DO-RP y las tres promos buy-a-box (PB1).
  "Pack de Batalla: Dominio": [
    "Escarabajo de las Arenas",
    "Tiamat",
    "Acobardar",
    "Gente Escorpión",
    "Felino Colosal",
    "Lahmu",
    "Dragón de Marduk",
    "Ciervos de Ansu",
    "Esculpir Piedra",
    "Grindylow",
    "Ichneumon",
    "Sabuesos de Arawn",
    "Marca de la Bestia",
    "Lanzar Rocas",
    "Odontotyrannus",
    "Marool",
    "Monoceros",
    "Égremont",
    "Gerifalte Entrenado",
    "Puente Corredizo",
    "Ars Goetia",
    "Diezmo Colonial",
    "Imprenta",
    "Liber Cosmographicus",
    "Astrarium Dondi",
    "Hombre de Vitrubio",
    "Astrolabio",
    "Títere de Cachiporra",
    "Reloj Astronómico",
    "Planetario",
    "Bestiario",
    "Crear Runas",
    "Thor el Poderoso",
    "Vidar Vengativo",
    "Sól",
    "Bridei I",
    "Culhwch",
    "Puño Bendito",
    "Convertir en Polvo",
    "Flamel",
    "John Dee",
    "Arnold Von Winkelried",
    "Sadkó",
    "Perenelle Flamel",
    "Pulcinela",
    "Rafael",
    "Crear Quimera",
    "Selva Negra",
    "Codex Atlanticus",
    "Máscara Veneciana",
    "Mammón",
    "Spada da Lato",
    "Virgilio",
    "Dante",
    "Gólem de Praga",
  ],
  // SD1.
  "Pack América": [
    "Devastador",
    "Orochi",
    "Kami no Okami",
    "Lou Carcolh",
    "Arcoíris",
    "Lambton Worm",
    "Uktena",
    "Carpa Dragón",
    "Aceite de Oliva",
    "Wani",
    "Dama Dragón",
    "Cristalino Amarillo",
    "Dragón de Magma",
    "Balaur",
    "Cipactli",
    "Ataque de Dragón",
    "Rey Roble",
    "Citlali",
    "Nube Incendiaria",
    "Guadaña Dragón",
    "Kyrenia",
    "Seiryu",
    "Tugarín",
    "Dipsa",
    "Enjambre Pullomeñ",
    "Cunca Chucuna",
    "Estudio Dragón",
    "Chozuya",
    "Sello de Odín",
    "Joyas de la Reina",
    "Máscara de Oro",
    "Botín Vikingo",
    "Mesa Redonda",
    "Éufrates",
    "Avesta",
    "Trofeo de Guerra",
    "Calendario Lunar",
    "Tablillas del Destino",
    "Knarr",
  ],
  // SD2. El fandom escribe "Kojn"; la carta dice Kojh (HS-135).
  "Dominio de Tótems": [
    "Serapeum de Alejandría",
    "Yggdrasil",
    "Ira del Vesubio",
    "Kumamoto-Jo",
    "Viracocha",
    "Machu Picchu",
    "Castillo Bran",
    "Castillo en las Nubes",
    "Carmina Burana",
    "Antu",
    "Kuyén",
    "Chaac",
    "Cabeza Colosal",
    "Derribar Muros",
    "Gusanos Vampiros",
    "Tormenta de Murciélagos",
    "Danubio Salvaje",
    "Mal Nido",
    "Caverna de la Madre",
    "Cocijo",
    "Kojh",
    "Zipacná",
    "Árbol del Grito",
    "Mortuus Lingua",
    "Calavera de Turquesa",
    "Calendario Maya",
    "Sello de Odín",
    "Joyas de la Reina",
    "Máscara de Oro",
    "Botín Vikingo",
    "Mesa Redonda",
    "Éufrates",
    "Avesta",
    "Trofeo de Guerra",
    "Calendario Lunar",
    "Tablillas del Destino",
    "Knarr",
  ],
};

for (const [producto, cartas] of Object.entries(PRODUCTOS)) {
  test(`todas las cartas de ${producto} estan en el catalogo`, () => {
    const faltan = cartas.filter((n) => !nombres.has(claveDeNombre(n)));
    assert.deepEqual(faltan, []);
  });
}

test("toda carta va en una edicion conocida, y ningun pack es edicion", () => {
  // Los packs no son edicion en el filtro: sus cartas van a Adicionales. Las
  // ediciones de fuera del formato que hubo unos dias (Camelot, Templarios,
  // Kemet, Dharma) ya no existen.
  const conocidas = new Set(EDITIONS.map((e) => e.slug));
  for (const c of CATALOGO) {
    assert.ok(conocidas.has(c.edicion), `${c.id}: ${c.edicion}`);
    assert.ok(!c.edicion.startsWith("pack-"), `${c.id}: ${c.edicion}`);
  }
  for (const slug of ["camelot", "templarios", "kemet", "dharma"]) {
    assert.ok(!conocidas.has(slug), slug);
  }
});

test("un arte alternativo es otra impresion de una carta ya cargada", () => {
  const origenes = new Set<string>(ORIGENES.map((o) => o.slug));
  const fuera = new Set(
    CATALOGO.filter((c) => c.edicion !== "arte-alternativo").map((c) => c.identidad),
  );
  for (const c of CATALOGO) {
    if (c.edicion === "arte-alternativo") {
      assert.ok(c.origen && origenes.has(c.origen), `${c.id}: origen ${c.origen}`);
      // Sin la carta base, el arte alternativo seria una carta nueva.
      assert.ok(fuera.has(c.identidad), `${c.id}: ${c.nombre} no tiene carta base`);
    } else {
      assert.equal(c.origen, undefined, `${c.id} lleva origen sin ser arte alternativo`);
    }
  }
});

test("un arte alternativo dice lo mismo que su carta en DeckForge", () => {
  // Decision del proyecto: de la reimpresion solo valen la imagen, la
  // frecuencia, el ilustrador y el origen. Texto, tipo, raza, coste y Fuerza
  // son los de la carta ya cargada.
  const fuera = CATALOGO.filter((c) => c.edicion !== "arte-alternativo");
  for (const c of CATALOGO.filter((c) => c.edicion === "arte-alternativo")) {
    const base = fuera.find(
      (b) =>
        b.identidad === c.identidad &&
        b.nombre === c.nombre &&
        b.habilidad === c.habilidad &&
        b.tipo === c.tipo &&
        b.raza === c.raza &&
        b.coste === c.coste &&
        b.fuerza === c.fuerza,
    );
    assert.ok(base, `${c.id} (${c.nombre}) no coincide con ninguna impresion cargada`);
  }
});

test("toda carta de una raza de escuela lleva esa escuela", () => {
  // Las cartas cargadas a mano (Adicionales) no pasan por el fetch, que es
  // quien deduce la escuela de la raza: aqui se vigila que no se olvide.
  const escuelaDe = new Map<string, string>();
  for (const [escuela, razas] of Object.entries(RAZAS_POR_ESCUELA)) {
    for (const r of razas) escuelaDe.set(r, escuela);
  }
  const malas = CATALOGO.filter(
    (c) => c.raza !== null && (escuelaDe.get(c.raza) ?? null) !== c.escuela,
  ).map((c) => `${c.id} ${c.nombre}: ${c.raza} / ${c.escuela}`);
  assert.deepEqual(malas, []);
});
