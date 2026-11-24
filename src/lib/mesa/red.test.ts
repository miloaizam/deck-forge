import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity, setStartingGold } from "../deck";
import type { Deck } from "../types";
import type { Accion } from "./apply";
import { completar, leerMensaje, publicar, type Lado, type Mensaje } from "./red";
import { newTable } from "./setup";
import { accionLocal, iniciar, mesaDe, reconectar, recibir, type Red } from "./sincronia";
import { ubicar } from "./table";

function semilla(s: number): () => number {
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

/** 50 cartas de 17 ids distintos. A y B usan ids distintos para distinguirlas. */
function baraja(prefijo: string): Deck {
  let deck = setStartingGold(createDeck("Prueba"), `${prefijo}o-001`);
  for (let i = 1; i <= 16; i++) {
    deck = setQuantity(deck, `${prefijo}c-${String(i).padStart(3, "0")}`, "principal", 3);
  }
  return setQuantity(deck, `${prefijo}x-001`, "principal", 1);
}

interface Partida {
  a: Red;
  b: Red;
  /** Todo lo que se mando, para revisar que nada oculto viaje. */
  enviados: Mensaje[];
}

/** Lleva los mensajes de uno al otro, en orden, hasta que no quede ninguno. */
function entregar(p: Partida, cola: Mensaje[]): Partida {
  const azar = semilla(11);
  let { a, b } = p;
  const enviados = [...p.enviados];
  const pendientes = [...cola];
  while (pendientes.length > 0) {
    const msg = pendientes.shift()!;
    enviados.push(msg);
    // Por el canal pasa como JSON y se valida al llegar, como en el sitio.
    const leido = leerMensaje(JSON.parse(JSON.stringify(msg)));
    assert.ok(leido, `un mensaje propio no paso la validacion: ${msg.t}`);
    if (msg.de === "a") {
      const r = recibir(b, leido, azar);
      b = r.red;
      pendientes.push(...r.enviar);
    } else {
      const r = recibir(a, leido, azar);
      a = r.red;
      pendientes.push(...r.enviar);
    }
  }
  return { a, b, enviados };
}

function empezar(): Partida {
  const ia = iniciar("a", newTable([{ id: "a", deck: baraja("a") }], semilla(1)));
  const ib = iniciar("b", newTable([{ id: "b", deck: baraja("b") }], semilla(2)));
  return entregar({ a: ia.red, b: ib.red, enviados: [] }, [...ia.enviar, ...ib.enviar]);
}

/** Una accion hecha por `quien`, y la entrega de lo que mande. */
function hacer(p: Partida, quien: Lado, accion: Accion): Partida {
  const r = accionLocal(p[quien], accion, semilla(5));
  return entregar({ ...p, [quien]: r.red }, r.enviar);
}

/** Ningun estado ni mitad lleva el id de una carta que no ven los dos. */
function nadaOcultoViajo(p: Partida): void {
  for (const msg of p.enviados) {
    if (msg.t !== "estado" && msg.t !== "mitad") continue;
    const mesa = completar(msg.mesa, {});
    for (const f of Object.values(msg.mesa.fichas)) {
      if (f.cartaId === null) continue;
      const zona = ubicar(mesa, f.portadaPor ?? f.debajoDe ?? f.uid)?.zona;
      const oculta =
        zona === "castillo" || zona === "mano" || zona === "soporte" || f.bocaAbajo;
      const revelada =
        msg.mesa.revelado?.para === "todos" && msg.mesa.revelado.uids.includes(f.uid);
      assert.ok(!oculta || revelada, `viajo ${f.uid} (${f.cartaId}) desde ${zona}`);
    }
  }
}

test("al empezar, los dos tienen la misma mesa y cada uno solo sus cartas", () => {
  const p = empezar();
  assert.equal(p.a.v, 1);
  assert.equal(p.b.v, 1);
  assert.deepEqual(p.a.publica, p.b.publica);
  const ma = mesaDe(p.a)!;
  const mb = mesaDe(p.b)!;
  const manoA = ma.jugadores[0].zonas.mano;
  assert.equal(manoA.length, 8);
  // A conoce su mano; B no.
  assert.ok(
    manoA.every(
      (u) =>
        ma.fichas[u].cartaId.startsWith("ac-") || ma.fichas[u].cartaId.startsWith("ax-"),
    ),
  );
  assert.ok(manoA.every((u) => mb.fichas[u].cartaId === ""));
  // El oro inicial de cada uno lo ven los dos.
  const oroB = mb.jugadores[1].zonas.reserva[0];
  assert.equal(ma.fichas[oroB].cartaId, "bo-001");
  nadaOcultoViajo(p);
});

test("jugar una carta la muestra al rival; robar no", () => {
  let p = empezar();
  const uid = mesaDe(p.a)!.jugadores[0].zonas.mano[0];
  const carta = mesaDe(p.a)!.fichas[uid].cartaId;
  p = hacer(p, "a", { tipo: "robar", jugador: "a" });
  p = hacer(p, "a", { tipo: "mover", uid, jugador: "a", zona: "defensa" });
  assert.equal(p.b.v, 3);
  assert.equal(mesaDe(p.b)!.fichas[uid].cartaId, carta);
  const robada = mesaDe(p.a)!.jugadores[0].zonas.mano.at(-1)!;
  assert.equal(mesaDe(p.b)!.fichas[robada].cartaId, "");
  nadaOcultoViajo(p);
});

test("el rival bota de tu Castillo: lo hace tu navegador y se ven las botadas", () => {
  let p = empezar();
  const tope = mesaDe(p.a)!.jugadores[0].zonas.castillo.slice(0, 2);
  p = hacer(p, "b", { tipo: "botar", jugador: "a", n: 2 });
  const mb = mesaDe(p.b)!;
  assert.deepEqual(mb.jugadores[0].zonas.cementerio, tope);
  assert.ok(tope.every((u) => mb.fichas[u].cartaId !== ""));
  const linea = mb.registro.at(-1)!;
  assert.deepEqual([linea.tipo, linea.por, linea.objetivo], ["botar", "b", "a"]);
  nadaOcultoViajo(p);
});

test("mirar tu Castillo: solo quien mira lo sabe, y lo olvida al cerrar", () => {
  let p = empezar();
  const tope = mesaDe(p.a)!.jugadores[0].zonas.castillo.slice(0, 3);
  p = hacer(p, "b", { tipo: "mirar", jugador: "a", n: 3 });
  const mb = mesaDe(p.b)!;
  assert.deepEqual(mb.revelado?.uids, tope);
  assert.ok(tope.every((u) => mb.fichas[u].cartaId === mesaDe(p.a)!.fichas[u].cartaId));
  // Fue por un mensaje privado, no por el estado publico.
  assert.ok(p.enviados.some((m) => m.t === "privado" && m.para === "b"));
  nadaOcultoViajo(p);

  // B las devuelve en otro orden: lo hace su navegador, con lo que sabe.
  p = hacer(p, "b", { tipo: "ordenarTope", uids: [tope[2], tope[0], tope[1]] });
  assert.deepEqual(mesaDe(p.a)!.jugadores[0].zonas.castillo.slice(0, 3), [
    tope[2],
    tope[0],
    tope[1],
  ]);
  assert.deepEqual(p.b.conocidas, {}, "lo olvida al cerrar");
  assert.ok(tope.every((u) => mesaDe(p.b)!.fichas[u].cartaId === ""));
});

test("el rival no roba ni toca tu mano", () => {
  let p = empezar();
  const antes = p.a.v;
  const manoA = mesaDe(p.a)!.jugadores[0].zonas.mano[0];
  p = hacer(p, "b", { tipo: "robar", jugador: "a" });
  p = hacer(p, "b", { tipo: "mover", uid: manoA, jugador: "b", zona: "defensa" });
  assert.equal(p.a.v, antes);
  assert.equal(p.b.v, antes);
});

test("si los dos mueven a la vez, terminan con la misma mesa", () => {
  let p = empezar();
  const ua = mesaDe(p.a)!.jugadores[0].zonas.mano[0];
  const ub = mesaDe(p.b)!.jugadores[1].zonas.mano[0];
  const ra = accionLocal(
    p.a,
    { tipo: "mover", uid: ua, jugador: "a", zona: "defensa" },
    semilla(3),
  );
  const rb = accionLocal(
    p.b,
    { tipo: "mover", uid: ub, jugador: "b", zona: "defensa" },
    semilla(4),
  );
  assert.equal(ra.red.v, rb.red.v, "los dos publicaron la misma version");
  p = entregar({ a: ra.red, b: rb.red, enviados: p.enviados }, [
    ...ra.enviar,
    ...rb.enviar,
  ]);
  assert.equal(p.a.v, p.b.v);
  assert.deepEqual(p.a.publica, p.b.publica);
  // Las dos jugadas quedaron: la de "a" y la de "b" rehecha encima.
  assert.ok(mesaDe(p.a)!.jugadores[0].zonas.defensa.includes(ua));
  assert.ok(mesaDe(p.a)!.jugadores[1].zonas.defensa.includes(ub));
});

test("lo que llega roto o incoherente no se usa", () => {
  const p = empezar();
  const bueno = { t: "estado", de: "a", v: 9, mesa: p.a.publica };
  assert.ok(leerMensaje(JSON.parse(JSON.stringify(bueno))));
  const copia = () => JSON.parse(JSON.stringify(p.a.publica));

  const duplicada = copia();
  duplicada.jugadores[0].zonas.mano.push(duplicada.jugadores[0].zonas.castillo[0]);
  assert.equal(
    leerMensaje({ ...bueno, mesa: duplicada }),
    null,
    "una carta en dos zonas",
  );

  const fantasma = copia();
  fantasma.jugadores[0].zonas.mano.push("a-999");
  assert.equal(
    leerMensaje({ ...bueno, mesa: fantasma }),
    null,
    "una carta que no existe",
  );

  const hostil = copia();
  hostil.fichas["a-1"].cartaId = "javascript:alert(1)";
  assert.equal(leerMensaje({ ...bueno, mesa: hostil }), null);

  const nota = copia();
  nota.fichas["a-1"].nota = "hola‮mundo" + "x".repeat(300);
  const leido = leerMensaje({ ...bueno, mesa: nota });
  assert.ok(leido && leido.t === "estado");
  assert.equal(leido.mesa.fichas["a-1"].nota.length, 200);
  assert.ok(!leido.mesa.fichas["a-1"].nota.includes("‮"));

  assert.equal(
    leerMensaje({ t: "pedido", de: "b", accion: { tipo: "borrarTodo" } }),
    null,
  );
  assert.equal(leerMensaje({ t: "estado", de: "c", v: 1, mesa: p.a.publica }), null);
});

test("publicar no cambia lo que ya es publico y vacia lo oculto", () => {
  const p = empezar();
  const m = mesaDe(p.a)!;
  const pub = publicar(m);
  const manoA = m.jugadores[0].zonas.mano;
  assert.ok(manoA.every((u) => pub.fichas[u].cartaId === null));
  assert.deepEqual(publicar(completar(pub, {})), pub);
});

test("volver con una foto vieja de la base trae la mas nueva del rival", () => {
  let p = empezar();
  const uid = mesaDe(p.a)!.jugadores[0].zonas.mano[0];
  p = hacer(p, "a", { tipo: "mover", uid, jugador: "a", zona: "defensa" });
  const guardada = { v: p.a.v, publica: p.a.publica! };
  // Despues de guardar, A juega otra; luego recarga y vuelve con la foto vieja.
  const otra = mesaDe(p.a)!.jugadores[0].zonas.mano[0];
  p = hacer(p, "a", { tipo: "mover", uid: otra, jugador: "a", zona: "apoyo" });
  const ultima = p.b.v;

  const vuelta = iniciar(
    "a",
    newTable([{ id: "a", deck: baraja("a") }], semilla(1)),
    guardada,
  );
  assert.deepEqual(
    vuelta.enviar.map((m) => m.t),
    ["hola"],
    "con foto guardada solo saluda",
  );
  p = entregar({ ...p, a: vuelta.red }, vuelta.enviar);
  assert.equal(p.a.v, ultima);
  assert.deepEqual(p.a.publica, p.b.publica);
  // Y conoce sus cartas igual que antes: la misma semilla arma la misma mitad.
  assert.equal(mesaDe(p.a)!.fichas[otra].cartaId, mesaDe(p.b)!.fichas[otra].cartaId);
  assert.notEqual(
    mesaDe(p.a)!
      .jugadores[0].zonas.mano.map((u) => mesaDe(p.a)!.fichas[u].cartaId)
      .join(),
    "",
  );
});

test("si se van los dos y vuelven desde la base, quedan con la misma mesa", () => {
  let p = empezar();
  p = hacer(p, "b", { tipo: "robar", jugador: "b" });
  const guardada = { v: p.b.v, publica: p.b.publica! };
  const va = iniciar(
    "a",
    newTable([{ id: "a", deck: baraja("a") }], semilla(1)),
    guardada,
  );
  const vb = iniciar(
    "b",
    newTable([{ id: "b", deck: baraja("b") }], semilla(2)),
    guardada,
  );
  const q = entregar({ a: va.red, b: vb.red, enviados: [] }, [
    ...va.enviar,
    ...vb.enviar,
  ]);
  assert.equal(q.a.v, guardada.v);
  assert.deepEqual(q.a.publica, q.b.publica);
  // Y se sigue jugando.
  const r = hacer(q, "a", { tipo: "robar", jugador: "a" });
  assert.equal(r.b.v, guardada.v + 1);
});

test("lo que se jugo sin conexion llega al volver, y si los dos jugaron, quedan iguales", () => {
  const p = empezar();
  const v0 = p.a.v;
  // B se queda sin conexion: su robo no llega a nadie.
  const sola = accionLocal(p.b, { tipo: "robar", jugador: "b" }, semilla(5)).red;
  // Mientras, A tambien juega, con la misma version.
  const r = hacer({ ...p, b: sola }, "a", { tipo: "robar", jugador: "a" });
  assert.notDeepEqual(r.a.publica, sola.publica);
  // Vuelve la conexion de B: gana lo de A y B rehace su robo encima.
  const q = entregar({ ...r, b: sola }, reconectar(sola).enviar);
  assert.deepEqual(q.a.publica, q.b.publica);
  assert.equal(q.a.v, v0 + 2);
  const mano = (red: Red, lado: Lado) =>
    mesaDe(red)!.jugadores.find((j) => j.id === lado)!.zonas.mano.length;
  assert.equal(mano(q.a, "a"), mano(p.a, "a") + 1);
  assert.equal(mano(q.a, "b"), mano(p.a, "b") + 1);
});
