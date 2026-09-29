import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { claveDeNombre } from "./documentos";
import { EDITIONS } from "./editions";
import { catalogSchema, type Card } from "./types";

/**
 * Los productos especiales del formato, segun la tabla de "Escuelas
 * Elementales (Formato)" del fandom: cada carta que traen tiene que estar en
 * el catalogo, con la impresion del mazo o con la de una de las diez
 * ediciones (ver CLAUDE.md, "Los productos especiales del formato"). Las que
 * faltan porque no hay arte de su impresion de pack van en `SIN_ARTE`.
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

/**
 * Cartas de los mazos que solo existen en ediciones de fuera del formato y de
 * las que no se encontro el arte de la impresion del mazo (ver TODO.md). No
 * se cargan con la impresion vieja: el formato admite la del mazo, que tiene
 * otro diseno.
 */
const SIN_ARTE: Record<string, string[]> = {
  "Pack América": ["Nube Incendiaria", "Guadaña Dragón", "Kyrenia"],
  "Dominio de Tótems": ["Árbol del Grito"],
};

for (const [producto, cartas] of Object.entries(PRODUCTOS)) {
  const pendientes = new Set((SIN_ARTE[producto] ?? []).map(claveDeNombre));

  test(`todas las cartas de ${producto} estan en el catalogo`, () => {
    const faltan = cartas.filter(
      (n) => !nombres.has(claveDeNombre(n)) && !pendientes.has(claveDeNombre(n)),
    );
    assert.deepEqual(faltan, []);
  });

  test(`las cartas sin arte de ${producto} siguen sin cargar`, () => {
    // Si una llega al catalogo, se borra de SIN_ARTE (y de TODO.md).
    const cargadas = (SIN_ARTE[producto] ?? []).filter((n) =>
      nombres.has(claveDeNombre(n)),
    );
    assert.deepEqual(cargadas, []);
  });
}

test("las cartas de los mazos que no son de las diez ediciones van con el mazo", () => {
  // Nunca con la edicion vieja de donde salieron: el filtro de edicion dice el
  // mazo en que entraron al formato.
  const mazos = new Set(["pack-de-batalla-dominio", "pack-america", "dominio-de-totems"]);
  const principales = new Set(EDITIONS.filter((e) => !e.parcial).map((e) => e.slug));
  for (const c of CATALOGO) {
    assert.ok(
      principales.has(c.edicion) || mazos.has(c.edicion),
      `${c.id}: ${c.edicion}`,
    );
  }
});
