import { test } from "node:test";
import assert from "node:assert/strict";

import { FAQ, segmentos } from "./faq";
import { NOVEDADES, TIPOS_NOVEDAD } from "./novedades";

/**
 * La pagina /novedades agrupa por fecha en el orden en que vienen: si una
 * entrada quedara fuera de orden, la linea de tiempo mostraria la misma fecha
 * dos veces o un salto hacia atras.
 */

test("cada novedad tiene fecha valida, tipo conocido y texto", () => {
  for (const n of NOVEDADES) {
    assert.match(n.fecha, /^\d{4}-\d{2}-\d{2}$/, `fecha mal escrita: ${n.titulo}`);
    assert.ok(
      !Number.isNaN(Date.parse(`${n.fecha}T12:00:00Z`)),
      `fecha invalida: ${n.fecha}`,
    );
    assert.ok(TIPOS_NOVEDAD.includes(n.tipo), `tipo desconocido: ${n.tipo}`);
    assert.ok(n.titulo.trim() && n.texto.length > 0, `entrada vacia: ${n.fecha}`);
  }
});

test("las novedades van de la mas nueva a la mas antigua", () => {
  for (let i = 1; i < NOVEDADES.length; i++) {
    assert.ok(
      NOVEDADES[i - 1].fecha >= NOVEDADES[i].fecha,
      `${NOVEDADES[i].titulo} (${NOVEDADES[i].fecha}) esta despues de una mas vieja`,
    );
  }
});

test("las versiones bajan de una entrada a la siguiente y la primera es 0.1.0", () => {
  const partes = (v: string) => v.split(".").map(Number);
  for (const n of NOVEDADES) assert.match(n.version, /^\d+\.\d+\.\d+$/, n.titulo);
  for (let i = 1; i < NOVEDADES.length; i++) {
    const [a, b] = [partes(NOVEDADES[i - 1].version), partes(NOVEDADES[i].version)];
    const mayor = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    assert.ok(
      mayor > 0,
      `${NOVEDADES[i - 1].titulo} no es mas nueva que ${NOVEDADES[i].titulo}`,
    );
  }
  assert.equal(NOVEDADES.at(-1)?.version, "0.1.0");
});

test("dos entradas no comparten titulo, que es su clave al pintarlas", () => {
  const titulos = NOVEDADES.map((n) => n.titulo);
  assert.equal(new Set(titulos).size, titulos.length);
  const preguntas = FAQ.flatMap((s) => s.items.map((i) => i.pregunta));
  assert.equal(
    new Set(preguntas).size,
    preguntas.length,
    "preguntas repetidas en la ayuda",
  );
});

test("la ayuda no deja asteriscos sueltos ni resaltados vacios", () => {
  const textos = FAQ.flatMap((sec) =>
    sec.items.flatMap((i) => [...i.respuesta, ...(i.lista ?? [])]),
  );
  for (const t of textos) {
    // Un ** sin pareja se veria tal cual en pantalla.
    assert.ok(
      !segmentos(t).some((s) => s.texto.includes("**")),
      `asteriscos sueltos: ${t}`,
    );
  }
  assert.deepEqual(segmentos("Ve a **Mis barajas** ya"), [
    { texto: "Ve a ", destacado: false },
    { texto: "Mis barajas", destacado: true },
    { texto: " ya", destacado: false },
  ]);
});
