import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ALTO_MAXIMO,
  altoFila,
  altoTramos,
  COLUMNAS,
  medidas,
  paginar,
  type TramoEnPagina,
} from "./plancha-paginas";

interface Carta {
  id: number;
  pie?: string[];
}

/** Tramos como los de la coleccion: por tipo, con el pie de tres lineas. */
function tramosDe(cuantas: number[]) {
  let id = 0;
  return cuantas.map((n, i) => ({
    titulo: `Tipo ${i}`,
    cuenta: n,
    cartas: Array.from({ length: n }, () => ({
      id: id++,
      pie: ["Nombre", "Edición", "Frecuencia"],
    })),
  }));
}

// Lo que gasta cada pagina fuera de las cartas en la coleccion: margen,
// cabecera sin nota y el pie del logotipo (card-sheet-image.ts).
const FIJO = 56 + (34 + 70 + 28) + (80 + 28);

function comprobar(
  tramos: ReturnType<typeof tramosDe>,
  paginas: TramoEnPagina<Carta>[][],
) {
  const fila = altoFila(tramos);
  for (const p of paginas) {
    assert.ok(p.length > 0, "pagina vacia");
    assert.ok(FIJO + altoTramos(p, fila) <= ALTO_MAXIMO, "pagina pasada de alto");
    for (const t of p) assert.ok(t.cartas.length > 0, `titulo sin cartas: ${t.titulo}`);
  }
  // Ninguna carta perdida, repetida ni fuera de orden.
  const ids = paginas.flat().flatMap((t) => t.cartas.map((c) => c.id));
  assert.deepEqual(
    ids,
    tramos.flatMap((t) => t.cartas.map((c) => c.id)),
  );
  // «(cont.)» solo en el trozo que sigue de la pagina anterior.
  paginas.forEach((p, i) =>
    p.forEach((t, j) => {
      const sigue =
        i > 0 && j === 0 && paginas[i - 1][paginas[i - 1].length - 1].titulo === t.titulo;
      assert.equal(t.continua, sigue, `${t.titulo} en la pagina ${i + 1}`);
    }),
  );
}

test("una baraja o una coleccion chica cabe en una pagina", () => {
  const tramos = tramosDe([20, 8, 6, 4, 12]);
  const paginas = paginar(tramos, altoFila(tramos), FIJO, FIJO);
  assert.equal(paginas.length, 1);
  comprobar(tramos, paginas);
});

test("una coleccion grande se parte sin achicar las cartas", () => {
  const tramos = tramosDe([420, 230, 150, 90, 80, 30]);
  const paginas = paginar(tramos, altoFila(tramos), FIJO + 60, FIJO);
  assert.ok(paginas.length > 2, `${paginas.length} paginas`);
  comprobar(tramos, paginas);
  // Diez por fila en todas: la carta mide lo mismo en cada parte.
  assert.equal(COLUMNAS, 10);
  assert.equal(medidas().w, 136);
  // Una pagina llena aprovecha el alto: no se parte antes de tiempo.
  const fila = altoFila(tramos);
  assert.ok(FIJO + altoTramos(paginas[1], fila) > ALTO_MAXIMO - fila - 64);
});

test("un titulo no queda solo al pie de una pagina", () => {
  // Un primer tramo que deja menos de una fila libre: el segundo empieza en
  // la pagina siguiente, entero.
  const fila = altoFila(tramosDe([1]));
  const disponible = ALTO_MAXIMO - FIJO;
  const filasPrimero = Math.floor((disponible - 64) / fila);
  const tramos = tramosDe([filasPrimero * 10, 15]);
  const paginas = paginar(tramos, fila, FIJO, FIJO);
  comprobar(tramos, paginas);
  assert.equal(paginas.length, 2);
  assert.equal(paginas[1][0].titulo, "Tipo 1");
  assert.equal(paginas[1][0].continua, false);
});
