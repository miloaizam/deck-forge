import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity, setStartingGold } from "../deck";
import type { Deck } from "../types";
import { apply, type Accion } from "./apply";
import { newTable } from "./setup";
import { ZONAS, ubicar, type Mesa, type Zona } from "./table";

/** Azar fijo y repetible, como en hand-test.test.ts. */
function semilla(s: number): () => number {
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

/** 50 cartas (16 x 3, el oro inicial y una mas) y 2 en el side. La mesa no mira el catalogo. */
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

function zonaDe(m: Mesa, uid: string): Zona | undefined {
  return ubicar(m, uid)?.zona;
}

function cuantas(m: Mesa, j: string, zona: Zona): number {
  return m.jugadores.find((x) => x.id === j)!.zonas[zona].length;
}

/** Aplica varias acciones seguidas. */
function hacer(m: Mesa, ...acciones: Accion[]): Mesa {
  return acciones.reduce((x, a) => apply(x, a, semilla(9)), m);
}

/** Cada ficha esta exactamente una vez: en una lista o colgando de otra. */
function sinPerdidas(m: Mesa): void {
  const vistas = new Map<string, number>();
  for (const j of m.jugadores) {
    for (const z of ZONAS)
      for (const uid of j.zonas[z]) vistas.set(uid, (vistas.get(uid) ?? 0) + 1);
  }
  for (const f of Object.values(m.fichas)) {
    const anexada = f.portadaPor !== null || f.debajoDe !== null;
    assert.equal(vistas.get(f.uid) ?? 0, anexada ? 0 : 1, f.uid);
  }
}

test("preparar: oro inicial en la Reserva, mano de 8, Castillo de 41 y side aparte", () => {
  const m = mesa();
  for (const j of ["a", "b"]) {
    assert.equal(cuantas(m, j, "reserva"), 1);
    assert.equal(
      m.fichas[m.jugadores.find((x) => x.id === j)!.zonas.reserva[0]].cartaId,
      "oro-001",
    );
    assert.equal(cuantas(m, j, "mano"), 8);
    assert.equal(cuantas(m, j, "castillo"), 41);
    assert.equal(cuantas(m, j, "soporte"), 2);
  }
  assert.equal(Object.keys(m.fichas).length, 104);
  sinPerdidas(m);
});

test("preparar: con copias de mas del oro inicial, solo una va a la Reserva", () => {
  const deck = setQuantity(baraja(), "oro-001", "principal", 3);
  const m = newTable([{ id: "a", deck }], semilla(2));
  assert.equal(cuantas(m, "a", "reserva"), 1);
  const resto = [...m.jugadores[0].zonas.castillo, ...m.jugadores[0].zonas.mano];
  assert.equal(resto.filter((u) => m.fichas[u].cartaId === "oro-001").length, 2);
});

test("preparar: el mismo azar da la misma mesa, y otro azar otro orden", () => {
  const una = newTable([{ id: "a", deck: baraja() }], semilla(5));
  const otra = newTable([{ id: "a", deck: baraja() }], semilla(5));
  const distinta = newTable([{ id: "a", deck: baraja() }], semilla(6));
  assert.deepEqual(una, otra);
  // Los uids se reparten despues de barajar: lo que cambia es que carta es cada uno.
  const cartas = (m: Mesa) =>
    m.jugadores[0].zonas.castillo.map((u) => m.fichas[u].cartaId);
  assert.notDeepEqual(cartas(una), cartas(distinta));
});

test("apply no toca la mesa que recibe", () => {
  const m = mesa();
  const antes = structuredClone(m);
  hacer(m, { tipo: "robar", jugador: "a", n: 3 }, { tipo: "agrupar", jugador: "a" });
  assert.deepEqual(m, antes);
});

test("una accion imposible devuelve la misma mesa, sin lanzar", () => {
  const m = mesa();
  for (const a of [
    { tipo: "mover", uid: "nadie", jugador: "a", zona: "defensa" },
    { tipo: "mover", uid: "a-1", jugador: "z", zona: "defensa" },
    { tipo: "robar", jugador: "z" },
    { tipo: "robar", jugador: "a", n: Number.NaN },
    { tipo: "botar", jugador: "a", n: 0 },
    { tipo: "fuerza", uid: "a-1", delta: Number.POSITIVE_INFINITY },
    { tipo: "portar", uid: "a-1", portador: "a-1" },
  ] satisfies Accion[]) {
    assert.equal(apply(m, a), m, JSON.stringify(a));
  }
});

test("robar y botar sacan del tope del Castillo, y paran si se vacia", () => {
  let m = mesa();
  const tope = m.jugadores[0].zonas.castillo.slice(0, 3);
  m = hacer(m, { tipo: "robar", jugador: "a" }, { tipo: "botar", jugador: "a", n: 2 });
  assert.equal(m.jugadores[0].zonas.mano.at(-1), tope[0]);
  assert.deepEqual(m.jugadores[0].zonas.cementerio, tope.slice(1));
  assert.equal(cuantas(m, "a", "castillo"), 38);

  m = hacer(m, { tipo: "botar", jugador: "a", n: 100 });
  assert.equal(cuantas(m, "a", "castillo"), 0);
  assert.equal(cuantas(m, "a", "cementerio"), 40);
  assert.equal(apply(m, { tipo: "robar", jugador: "a" }), m);
  sinPerdidas(m);
});

test("barajar cambia el orden del Castillo y no las cartas", () => {
  const m = mesa();
  const despues = hacer(m, { tipo: "barajar", jugador: "a" });
  const antes = m.jugadores[0].zonas.castillo;
  const ahora = despues.jugadores[0].zonas.castillo;
  assert.notDeepEqual(ahora, antes);
  assert.deepEqual([...ahora].sort(), [...antes].sort());
});

test("mulligan: la mano vuelve, se baraja y se roba una menos, hasta 1", () => {
  let m = mesa();
  const tamanos: number[] = [];
  for (let i = 0; i < 9; i++) {
    m = hacer(m, { tipo: "mulligan", jugador: "a" });
    tamanos.push(cuantas(m, "a", "mano"));
  }
  assert.deepEqual(tamanos, [7, 6, 5, 4, 3, 2, 1, 1, 1]);
  assert.equal(cuantas(m, "a", "mano") + cuantas(m, "a", "castillo"), 49);
  assert.equal(cuantas(m, "a", "reserva"), 1, "el oro inicial no vuelve al Castillo");
  sinPerdidas(m);
});

test("mover entre zonas en juego conserva las marcas; salir del juego las borra", () => {
  let m = mesa();
  const uid = m.jugadores[0].zonas.mano[0];
  m = hacer(
    m,
    { tipo: "mover", uid, jugador: "a", zona: "defensa" },
    { tipo: "contador", uid, contador: "honor", delta: 2 },
    { tipo: "fuerza", uid, delta: 2 },
    { tipo: "nota", uid, texto: "  Convertido en Dragón  " },
    { tipo: "voltear", uid },
    { tipo: "mover", uid, jugador: "a", zona: "ataque" },
  );
  assert.equal(zonaDe(m, uid), "ataque");
  assert.deepEqual(m.fichas[uid].contadores, { honor: 2 });
  assert.equal(m.fichas[uid].fuerza, 2);
  assert.equal(m.fichas[uid].nota, "Convertido en Dragón");
  assert.equal(m.fichas[uid].bocaAbajo, true);

  m = hacer(m, { tipo: "mover", uid, jugador: "a", zona: "cementerio" });
  const f = m.fichas[uid];
  assert.deepEqual([f.contadores, f.fuerza, f.nota, f.bocaAbajo], [{}, 0, "", false]);
});

test("tomar el control cambia el controlador, y al salir vuelve a las zonas del dueno", () => {
  let m = mesa();
  const uid = m.jugadores[0].zonas.mano[0];
  m = hacer(
    m,
    { tipo: "mover", uid, jugador: "a", zona: "defensa" },
    { tipo: "mover", uid, jugador: "b", zona: "defensa" },
  );
  assert.equal(m.fichas[uid].dueno, "a");
  assert.equal(m.fichas[uid].controlador, "b");
  assert.ok(m.jugadores[1].zonas.defensa.includes(uid));

  // b la manda a SU Cementerio, pero la carta es de a.
  m = hacer(m, { tipo: "mover", uid, jugador: "b", zona: "cementerio" });
  assert.ok(m.jugadores[0].zonas.cementerio.includes(uid));
  assert.equal(cuantas(m, "b", "cementerio"), 0);
  assert.equal(m.fichas[uid].controlador, "a");
});

test("al Castillo va arriba por defecto, o debajo con la posicion", () => {
  let m = mesa();
  const [arriba, abajo] = m.jugadores[0].zonas.mano;
  m = hacer(
    m,
    { tipo: "mover", uid: arriba, jugador: "a", zona: "castillo" },
    { tipo: "mover", uid: abajo, jugador: "a", zona: "castillo", posicion: Infinity },
  );
  assert.equal(m.jugadores[0].zonas.castillo[0], arriba);
  assert.equal(m.jugadores[0].zonas.castillo.at(-1), abajo);
});

test("portar: el Arma va con el Aliado, y si el Aliado sale va al Cementerio de su dueno", () => {
  let m = mesa();
  const [aliado, arma] = m.jugadores[0].zonas.mano;
  m = hacer(
    m,
    { tipo: "mover", uid: aliado, jugador: "a", zona: "defensa" },
    { tipo: "portar", uid: arma, portador: aliado },
    { tipo: "contador", uid: arma, contador: "generico", delta: 1 },
  );
  assert.equal(m.fichas[arma].portadaPor, aliado);
  assert.equal(zonaDe(m, arma), undefined, "una anexada no esta en ninguna lista");
  sinPerdidas(m);

  // El Aliado ataca: el Arma no se mueve, porque va con el.
  m = hacer(m, { tipo: "mover", uid: aliado, jugador: "a", zona: "ataque" });
  assert.equal(m.fichas[arma].portadaPor, aliado);

  // Pasa a b: el Arma cambia de controlador con el.
  m = hacer(m, { tipo: "mover", uid: aliado, jugador: "b", zona: "defensa" });
  assert.equal(m.fichas[arma].controlador, "b");

  m = hacer(m, { tipo: "mover", uid: aliado, jugador: "b", zona: "destierro" });
  assert.equal(zonaDe(m, aliado), "destierro");
  assert.ok(m.jugadores[0].zonas.cementerio.includes(arma));
  assert.deepEqual(m.fichas[arma].contadores, {});
  assert.equal(m.fichas[arma].portadaPor, null);
  sinPerdidas(m);
});

test("poner debajo, en cadena, y mover la de abajo la suelta", () => {
  let m = mesa();
  const [arriba, medio, fondo] = m.jugadores[0].zonas.mano;
  m = hacer(
    m,
    { tipo: "mover", uid: arriba, jugador: "a", zona: "apoyo" },
    { tipo: "ponerDebajo", uid: medio, encima: arriba },
    { tipo: "ponerDebajo", uid: fondo, encima: medio },
  );
  sinPerdidas(m);
  // Ciclos: ni la de arriba bajo una que cuelga de ella.
  assert.equal(apply(m, { tipo: "ponerDebajo", uid: arriba, encima: fondo }), m);
  assert.equal(apply(m, { tipo: "ponerDebajo", uid: medio, encima: fondo }), m);

  m = hacer(m, { tipo: "mover", uid: medio, jugador: "a", zona: "defensa" });
  assert.equal(m.fichas[medio].debajoDe, null);
  assert.equal(m.fichas[fondo].debajoDe, medio, "lo que tenia debajo se queda con ella");
  sinPerdidas(m);

  m = hacer(m, { tipo: "mover", uid: medio, jugador: "a", zona: "mano" });
  assert.ok(m.jugadores[0].zonas.cementerio.includes(fondo));
  sinPerdidas(m);
});

test("no se anexa a una carta que no esta en juego", () => {
  const m = mesa();
  const [uno, otro] = m.jugadores[0].zonas.mano;
  assert.equal(apply(m, { tipo: "portar", uid: uno, portador: otro }), m);
});

test("contadores: nunca bajo cero, y el que llega a cero desaparece", () => {
  let m = mesa();
  const uid = m.jugadores[0].zonas.reserva[0];
  m = hacer(
    m,
    { tipo: "contador", uid, contador: "alimento", delta: 3 },
    { tipo: "contador", uid, contador: "conquista", delta: -2 },
  );
  assert.deepEqual(m.fichas[uid].contadores, { alimento: 3 });
  m = hacer(m, { tipo: "contador", uid, contador: "alimento", delta: -5 });
  assert.deepEqual(m.fichas[uid].contadores, {});
});

test("limpiar temporales borra la Fuerza de toda la mesa y deja contadores y notas", () => {
  let m = mesa();
  const uid = m.jugadores[0].zonas.reserva[0];
  m = hacer(
    m,
    { tipo: "fuerza", uid, delta: 3 },
    { tipo: "contador", uid, contador: "honor", delta: 1 },
    { tipo: "nota", uid, texto: "x".repeat(500) },
    { tipo: "limpiarTemporales" },
  );
  assert.equal(m.fichas[uid].fuerza, 0);
  assert.deepEqual(m.fichas[uid].contadores, { honor: 1 });
  assert.equal(m.fichas[uid].nota.length, 200);
});

test("una partida de ejemplo: robar, pagar, jugar, atacar, agrupar y al Cementerio", () => {
  let m = mesa();
  const a = () => m.jugadores[0];
  const oroInicial = a().zonas.reserva[0];
  const [aliado, otro] = a().zonas.mano;

  m = hacer(
    m,
    // Primer turno: sin robar (DAR §9). Se paga con el oro inicial y se juega un Aliado.
    { tipo: "mover", uid: oroInicial, jugador: "a", zona: "oroPagado" },
    { tipo: "mover", uid: aliado, jugador: "a", zona: "defensa" },
    // Turno siguiente: agrupar, robar, atacar.
    { tipo: "agrupar", jugador: "a" },
    { tipo: "robar", jugador: "a" },
    { tipo: "mover", uid: aliado, jugador: "a", zona: "ataque" },
    // El rival bota el daño desde el Castillo de b.
    { tipo: "botar", jugador: "b", n: 2 },
    // Un efecto destruye al Aliado; otro se descarta por exceso.
    { tipo: "mover", uid: aliado, jugador: "a", zona: "cementerio" },
    { tipo: "mover", uid: otro, jugador: "a", zona: "cementerio" },
    { tipo: "agrupar", jugador: "a" },
  );

  assert.deepEqual(a().zonas.reserva, [oroInicial]);
  assert.deepEqual(a().zonas.oroPagado, []);
  assert.deepEqual(a().zonas.ataque, []);
  assert.deepEqual(a().zonas.cementerio, [aliado, otro]);
  assert.equal(cuantas(m, "a", "mano"), 7);
  assert.equal(cuantas(m, "a", "castillo"), 40);
  assert.equal(cuantas(m, "b", "cementerio"), 2);
  assert.equal(cuantas(m, "b", "castillo"), 39);
  sinPerdidas(m);
});
