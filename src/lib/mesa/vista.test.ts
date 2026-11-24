import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity, setStartingGold } from "../deck";
import type { Deck } from "../types";
import { apply, puede, type Accion } from "./apply";
import { avisos, MANO_MAXIMA } from "./avisos";
import { textoDeEntrada } from "./registro";
import { newTable } from "./setup";
import type { EntradaRegistro, Mesa } from "./table";
import { esPublica, veCarta, vista } from "./vista";

/** Azar fijo y repetible, como en hand-test.test.ts. */
function semilla(s: number): () => number {
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

/** 50 cartas de 17 ids distintos y 2 en el side. La mesa no mira el catalogo. */
function baraja(): Deck {
  let deck = setStartingGold(createDeck("Prueba"), "oro-001");
  for (let i = 1; i <= 16; i++) {
    deck = setQuantity(deck, `ali-${String(i).padStart(3, "0")}`, "principal", 3);
  }
  deck = setQuantity(deck, "arm-001", "principal", 1);
  return setQuantity(deck, "sid-001", "side", 2);
}

function mesa(): Mesa {
  return newTable(
    [
      { id: "a", deck: baraja() },
      { id: "b", deck: baraja() },
    ],
    semilla(1),
  );
}

const de = (m: Mesa, id: string) => m.jugadores.find((j) => j.id === id)!;

/** Aplica varias acciones de un mismo jugador. */
function hacer(m: Mesa, por: string, ...acciones: Accion[]): Mesa {
  return acciones.reduce((x, a) => apply(x, a, semilla(9), por), m);
}

const ultima = (m: Mesa): EntradaRegistro => m.registro.at(-1)!;

test("la mesa nueva arranca en el turno 1, en Agrupacion, con su linea en el registro", () => {
  const m = mesa();
  assert.deepEqual(m.turno, {
    numero: 1,
    activo: "a",
    fase: "agrupacion",
    prioridad: null,
  });
  assert.equal(m.revelado, null);
  assert.deepEqual(
    m.registro.map((e) => e.tipo),
    ["preparar"],
  );
});

test("los uids no siguen el orden de la baraja: las copias no quedan seguidas", () => {
  const m = mesa();
  const ids = Array.from({ length: 49 }, (_, i) => m.fichas[`a-${i + 2}`]?.cartaId);
  const seguidas = ids.filter((id, i) => i > 0 && id === ids[i - 1]).length;
  // En el orden de la baraja serian 32 parejas seguidas (16 cartas x 3 copias).
  assert.ok(seguidas < 10, `quedaron ${seguidas} copias seguidas`);
});

test("vista: la mano solo la ve su dueno, y el Castillo nadie", () => {
  const m = mesa();
  const manoA = de(m, "a").zonas.mano[0];
  const castilloA = de(m, "a").zonas.castillo[0];
  assert.equal(veCarta(m, manoA, "a"), true);
  assert.equal(veCarta(m, manoA, "b"), false);
  assert.equal(veCarta(m, castilloA, "a"), false);
  assert.equal(veCarta(m, castilloA, "b"), false);
  assert.equal(vista(m, "b").fichas[manoA].cartaId, null);
  assert.equal(vista(m, "a").fichas[manoA].cartaId, m.fichas[manoA].cartaId);
  // El Soporte es como la mano; el oro inicial, en juego, lo ven los dos.
  assert.equal(veCarta(m, de(m, "a").zonas.soporte[0], "b"), false);
  assert.equal(esPublica(m, de(m, "a").zonas.reserva[0]), true);
});

test("vista: boca abajo en juego, solo la ve su controlador", () => {
  let m = mesa();
  const uid = de(m, "a").zonas.mano[0];
  m = hacer(
    m,
    "a",
    { tipo: "mover", uid, jugador: "a", zona: "defensa" },
    { tipo: "voltear", uid },
  );
  assert.equal(veCarta(m, uid, "a"), true);
  assert.equal(veCarta(m, uid, "b"), false);
  assert.equal(esPublica(m, uid), false);
});

test("permisos: el rival no toca tu mano ni roba por ti, pero si bota de tu Castillo", () => {
  const m = mesa();
  const manoA = de(m, "a").zonas.mano[0];
  assert.equal(
    puede(m, { tipo: "mover", uid: manoA, jugador: "b", zona: "defensa" }, "b"),
    false,
  );
  assert.equal(puede(m, { tipo: "voltear", uid: manoA }, "b"), false);
  assert.equal(puede(m, { tipo: "robar", jugador: "a" }, "b"), false);
  assert.equal(puede(m, { tipo: "mulligan", jugador: "a" }, "b"), false);
  assert.equal(puede(m, { tipo: "barajar", jugador: "a" }, "b"), false);
  assert.equal(puede(m, { tipo: "botar", jugador: "a", n: 2 }, "b"), true);
  assert.equal(puede(m, { tipo: "mirar", jugador: "a", n: 2 }, "b"), true);
  assert.equal(puede(m, { tipo: "robar", jugador: "a" }, "nadie"), false);

  // Y apply lo respeta: la misma mesa, sin linea nueva.
  assert.equal(apply(m, { tipo: "robar", jugador: "a" }, semilla(1), "b"), m);
  const botada = apply(m, { tipo: "botar", jugador: "a", n: 2 }, semilla(1), "b");
  assert.equal(de(botada, "a").zonas.cementerio.length, 2);
  assert.equal(ultima(botada).por, "b");

  // Lo que esta en juego lo mueven los dos.
  const enJuego = hacer(m, "a", {
    tipo: "mover",
    uid: manoA,
    jugador: "a",
    zona: "defensa",
  });
  assert.equal(
    puede(enJuego, { tipo: "mover", uid: manoA, jugador: "a", zona: "ataque" }, "b"),
    true,
  );
});

test("cada accion deja su linea, numerada y con quien la hizo", () => {
  let m = mesa();
  const uid = de(m, "a").zonas.mano[0];
  m = hacer(
    m,
    "a",
    { tipo: "robar", jugador: "a" },
    { tipo: "mover", uid, jugador: "a", zona: "defensa" },
    { tipo: "agrupar", jugador: "a" },
    { tipo: "siguienteFase" },
  );
  assert.deepEqual(
    m.registro.map((e) => [e.n, e.por, e.tipo]),
    [
      [1, "a", "preparar"],
      [2, "a", "robar"],
      [3, "a", "mover"],
      [4, "a", "agrupar"],
      [5, "a", "fase"],
    ],
  );
  // Una accion imposible no deja linea.
  assert.equal(apply(m, { tipo: "robar", jugador: "zz" }).registro.length, 5);
});

test("el registro nombra lo publico y nunca lo oculto", () => {
  let m = mesa();
  const [jugada, devuelta] = de(m, "a").zonas.mano;
  m = hacer(
    m,
    "a",
    // De la mano al juego: se ve al llegar, se nombra.
    { tipo: "mover", uid: jugada, jugador: "a", zona: "defensa" },
    // De la mano al Castillo: nadie la vio, no se nombra.
    { tipo: "mover", uid: devuelta, jugador: "a", zona: "castillo" },
    { tipo: "robar", jugador: "a", n: 2 },
    { tipo: "mirar", jugador: "a", n: 3 },
  );
  const [, juego, castillo, robo, mirada] = m.registro;
  assert.deepEqual(juego.cartas, [m.fichas[jugada].cartaId]);
  assert.deepEqual(castillo.cartas, [null]);
  assert.deepEqual(robo.cartas, []);
  assert.deepEqual(mirada.cartas, []);
  // Botar si las nombra: van al Cementerio, que ven los dos.
  m = hacer(m, "b", { tipo: "botar", jugador: "a", n: 2 });
  assert.ok(ultima(m).cartas.every((c) => c !== null));
});

test("mirar: solo las ve quien mira; mostrar: los dos", () => {
  let m = hacer(mesa(), "b", { tipo: "mirar", jugador: "a", n: 3 });
  const tope = de(m, "a").zonas.castillo.slice(0, 3);
  assert.deepEqual(m.revelado?.uids, tope);
  assert.ok(tope.every((u) => veCarta(m, u, "b") && !veCarta(m, u, "a")));
  // Solo quien abrio lo cierra.
  assert.equal(puede(m, { tipo: "cerrarRevelado" }, "a"), false);
  m = hacer(m, "b", { tipo: "cerrarRevelado" });
  assert.equal(m.revelado, null);

  m = hacer(m, "a", { tipo: "mostrar", jugador: "a", n: 2 });
  const mostradas = de(m, "a").zonas.castillo.slice(0, 2);
  assert.ok(mostradas.every((u) => esPublica(m, u)));
  assert.deepEqual(
    ultima(m).cartas,
    mostradas.map((u) => m.fichas[u].cartaId),
  );
});

test("ordenarTope devuelve arriba en el orden elegido, y solo con las mismas cartas", () => {
  let m = hacer(mesa(), "a", { tipo: "mirar", jugador: "a", n: 3 });
  const [x, y, z] = de(m, "a").zonas.castillo;
  const resto = de(m, "a").zonas.castillo.slice(3);
  // Otro conjunto, o repetidas: no.
  assert.equal(apply(m, { tipo: "ordenarTope", uids: [x, y, resto[0]] }), m);
  assert.equal(apply(m, { tipo: "ordenarTope", uids: [x, x, y] }), m);

  m = hacer(m, "a", { tipo: "ordenarTope", uids: [z, x, y] });
  assert.deepEqual(de(m, "a").zonas.castillo.slice(0, 3), [z, x, y]);
  assert.deepEqual(de(m, "a").zonas.castillo.slice(3), resto);
  assert.equal(m.revelado, null);
});

test("lo mirado deja de valer si el Castillo cambia debajo", () => {
  let m = hacer(mesa(), "b", { tipo: "mirar", jugador: "a", n: 3 });
  m = hacer(m, "a", { tipo: "robar", jugador: "a" });
  assert.equal(m.revelado, null);
});

test("buscar: oculta para el rival, mostrada para los dos, y el Castillo se baraja siempre", () => {
  let m = mesa();
  const antes = [...de(m, "a").zonas.castillo];
  // Sin busqueda abierta no se toma nada.
  assert.equal(apply(m, { tipo: "buscar", uid: antes[5] }), m);

  m = hacer(m, "a", { tipo: "abrirBusqueda", zona: "castillo", mostrar: false });
  assert.ok(antes.every((u) => veCarta(m, u, "a") && !veCarta(m, u, "b")));
  assert.equal(puede(m, { tipo: "buscar", uid: antes[5] }, "b"), false);
  m = hacer(m, "a", { tipo: "buscar", uid: antes[5] });
  assert.ok(de(m, "a").zonas.mano.includes(antes[5]));
  assert.deepEqual(ultima(m).cartas, [null], "la busqueda oculta no nombra la carta");
  assert.notDeepEqual(
    de(m, "a").zonas.castillo,
    antes.filter((u) => u !== antes[5]),
    "se baraja",
  );

  // Buscar y mostrar: se nombra.
  const otra = de(m, "a").zonas.castillo[10];
  m = hacer(
    m,
    "a",
    { tipo: "abrirBusqueda", zona: "castillo", mostrar: true },
    { tipo: "buscar", uid: otra },
  );
  assert.deepEqual(ultima(m).cartas, [m.fichas[otra].cartaId]);
  assert.equal(ultima(m).detalle, "mostrar");

  // Fallar a proposito tambien baraja.
  const quieto = [...de(m, "a").zonas.castillo];
  m = hacer(
    m,
    "a",
    { tipo: "abrirBusqueda", zona: "castillo", mostrar: false },
    { tipo: "buscar", uid: null },
  );
  assert.equal(ultima(m).detalle, "nada");
  assert.notDeepEqual(de(m, "a").zonas.castillo, quieto);
  assert.equal(m.revelado, null);
});

test("buscar en el Cementerio no baraja el Castillo", () => {
  let m = hacer(mesa(), "a", { tipo: "botar", jugador: "a", n: 3 });
  const castillo = [...de(m, "a").zonas.castillo];
  const elegida = de(m, "a").zonas.cementerio[1];
  m = hacer(
    m,
    "a",
    { tipo: "abrirBusqueda", zona: "cementerio", mostrar: false },
    { tipo: "buscar", uid: elegida },
  );
  assert.ok(de(m, "a").zonas.mano.includes(elegida));
  assert.deepEqual(de(m, "a").zonas.castillo, castillo);
  // Venia del Cementerio, que es publico: se nombra igual.
  assert.deepEqual(ultima(m).cartas, [m.fichas[elegida].cartaId]);
});

test("barajar desde el Cementerio muestra las cartas y las mete al Castillo", () => {
  let m = hacer(mesa(), "a", { tipo: "botar", jugador: "a", n: 4 });
  const [x, y] = de(m, "a").zonas.cementerio;
  m = hacer(m, "a", {
    tipo: "barajarDesdeCementerio",
    jugador: "a",
    uids: [x, y, "nadie"],
  });
  assert.equal(de(m, "a").zonas.cementerio.length, 2);
  assert.equal(de(m, "a").zonas.castillo.length, 39);
  assert.ok(de(m, "a").zonas.castillo.includes(x));
  assert.deepEqual(ultima(m).cartas, [m.fichas[x].cartaId, m.fichas[y].cartaId]);
  assert.equal(apply(m, { tipo: "barajarDesdeCementerio", jugador: "a", uids: [] }), m);
});

test("turno y fase: siguiente, saltar, prioridad y pasar turno al otro", () => {
  let m = hacer(
    mesa(),
    "a",
    { tipo: "siguienteFase" },
    { tipo: "fase", fase: "guerraTalismanes" },
  );
  assert.equal(m.turno.fase, "guerraTalismanes");
  m = hacer(m, "b", { tipo: "prioridad", jugador: "b" });
  assert.equal(m.turno.prioridad, "b");
  m = hacer(m, "a", { tipo: "siguienteFase" });
  assert.equal(m.turno.fase, "dano");
  assert.equal(m.turno.prioridad, null, "la prioridad es de la Guerra de Talismanes");
  m = hacer(m, "a", { tipo: "fase", fase: "robar" });
  assert.equal(apply(m, { tipo: "siguienteFase" }), m, "tras Robar se pasa el turno");
  m = hacer(m, "a", { tipo: "pasarTurno" });
  assert.deepEqual(m.turno, {
    numero: 2,
    activo: "b",
    fase: "agrupacion",
    prioridad: null,
  });

  // Con un solo jugador, el turno siguiente sigue siendo suyo.
  const solo = apply(newTable([{ id: "a", deck: baraja() }], semilla(3)), {
    tipo: "pasarTurno",
  });
  assert.deepEqual([solo.turno.numero, solo.turno.activo], [2, "a"]);
});

test("la moneda: cara o sello, y con dos jugadores decide quien comienza", () => {
  const cara = apply(mesa(), { tipo: "sortear" }, () => 0.1);
  const sello = apply(mesa(), { tipo: "sortear" }, () => 0.9);
  assert.deepEqual([ultima(cara).detalle, cara.turno.activo], ["cara", "a"]);
  assert.deepEqual([ultima(sello).detalle, sello.turno.activo], ["sello", "b"]);
});

test("el registro guarda las ultimas 200 lineas", () => {
  let m = mesa();
  for (let i = 0; i < 260; i++) m = apply(m, { tipo: "fase", fase: "vigilia" });
  assert.equal(m.registro.length, 200);
  assert.equal(ultima(m).n, 261);
});

test("avisos: Castillo vacio y mano de mas de 8", () => {
  let m = mesa();
  assert.deepEqual(avisos(m, "a"), []);
  m = hacer(m, "a", { tipo: "robar", jugador: "a", n: 2 });
  assert.deepEqual(avisos(m, "a"), [{ tipo: "mano-larga", cartas: MANO_MAXIMA + 2 }]);
  m = hacer(m, "a", { tipo: "botar", jugador: "a", n: 100 });
  assert.deepEqual(avisos(m, "a")[0], { tipo: "castillo-vacio" });
  assert.deepEqual(avisos(m, "nadie"), []);
});

test("el texto de cada linea, impersonal y sin nombrar lo oculto", () => {
  let m = mesa();
  const nombre = (id: string) => `«${id}»`;
  const [jugada, oculta] = de(m, "a").zonas.mano;
  m = hacer(
    m,
    "a",
    { tipo: "robar", jugador: "a" },
    { tipo: "mover", uid: jugada, jugador: "a", zona: "defensa" },
    { tipo: "mover", uid: oculta, jugador: "a", zona: "castillo" },
    { tipo: "contador", uid: jugada, contador: "honor", delta: 2 },
    { tipo: "fuerza", uid: jugada, delta: 2 },
    { tipo: "mirar", jugador: "a", n: 3 },
    { tipo: "cerrarRevelado" },
    { tipo: "abrirBusqueda", zona: "castillo", mostrar: false },
    { tipo: "buscar", uid: null },
    { tipo: "fase", fase: "vigilia" },
  );
  m = apply(m, { tipo: "sortear" }, () => 0.1, "b");
  const solo = m.registro.slice(1, -1).map((e) => textoDeEntrada(e, nombre));
  const carta = nombre(m.fichas[jugada].cartaId);
  assert.deepEqual(solo, [
    "Robó una carta.",
    `Mandó ${carta} de la mano a la Línea de Defensa.`,
    "Mandó una carta de la mano al Castillo.",
    `Puso 2 contadores de Honor en ${carta}.`,
    `${carta}: +2 a la Fuerza.`,
    "Miró las 3 de arriba del Castillo.",
    "Dejó las cartas como estaban.",
    "Empezó a buscar en el Castillo.",
    "No tomó ninguna carta del Castillo. Barajó el Castillo.",
    "Fase: Vigilia.",
  ]);
  // Con dos jugadores, cada frase dice quien fue y nombra al otro.
  const quien = (id: string) => (id === "a" ? "Ana" : "Beto");
  assert.equal(
    textoDeEntrada(ultima(m), nombre, quien),
    "Beto: Moneda: cara. Comienza Ana.",
  );
  const botar = apply(m, { tipo: "botar", jugador: "a", n: 1 }, semilla(1), "b");
  assert.match(
    textoDeEntrada(ultima(botar), nombre, quien),
    /^Beto: Botó «.+» del Castillo de Ana\.$/,
  );
  // Ninguna frase deja un «de el» sin contraer.
  assert.ok(solo.every((t) => !/\bde el\b|\ba el\b/.test(t)));
});
