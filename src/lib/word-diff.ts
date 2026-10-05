/**
 * Diferencia por palabras entre dos textos (LCS), para resaltar lo que cambia
 * una errata: de un lado se tacha lo que sale, del otro se marca lo que entra.
 *
 * Devuelve tokens y no HTML: los pinta `<del>` e `<ins>` desde React, sin
 * `dangerouslySetInnerHTML`. La puntuacion va pegada a su palabra, que es como
 * se lee, y los espacios nunca se marcan (solo ensuciarian el resaltado). Es
 * la misma logica que `diff()` de documentos/fuente/generar.mjs, que arma los
 * PDF: si cambia una, se cambia la otra.
 */

export type TipoTramo = "igual" | "sale" | "entra";

export interface Tramo {
  texto: string;
  tipo: TipoTramo;
}

const trocear = (s: string) => s.split(/(\s+)/).filter((t) => t !== "");
const esEspacio = (t: string) => /^\s+$/.test(t);

/** Suma un token al lado, fundiendolo con el tramo anterior si es del mismo tipo. */
function sumar(lado: Tramo[], texto: string, tipo: TipoTramo) {
  const ultimo = lado.at(-1);
  if (ultimo && ultimo.tipo === tipo) ultimo.texto += texto;
  else lado.push({ texto, tipo });
}

/**
 * Los dos lados de la diferencia: `antes` (con lo que sale) y `despues` (con
 * lo que entra). Un espacio entre dos palabras marcadas queda dentro del
 * tramo, para que "de esta" se resalte de una vez y no palabra por palabra.
 */
export function wordDiff(a: string, b: string): { antes: Tramo[]; despues: Tramo[] } {
  const A = trocear(a);
  const B = trocear(b);
  const n = A.length;
  const m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);

  const antes: Tramo[] = [];
  const despues: Tramo[] = [];
  const marcar = (lado: Tramo[], tok: string, tipo: TipoTramo) => {
    if (!esEspacio(tok)) return sumar(lado, tok, tipo);
    // Un espacio se une a la marca en curso; si la marca no sigue, se
    // devuelve a "igual" al cerrar (ver `limpiar`).
    sumar(lado, tok, lado.at(-1)?.tipo === tipo ? tipo : "igual");
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      sumar(antes, A[i++], "igual");
      sumar(despues, B[j++], "igual");
    } else if (L[i + 1][j] >= L[i][j + 1]) marcar(antes, A[i++], "sale");
    else marcar(despues, B[j++], "entra");
  }
  while (i < n) marcar(antes, A[i++], "sale");
  while (j < m) marcar(despues, B[j++], "entra");
  return { antes: limpiar(antes), despues: limpiar(despues) };
}

/** Un tramo marcado no termina en espacio: se pasa al tramo igual siguiente. */
function limpiar(lado: Tramo[]): Tramo[] {
  const out: Tramo[] = [];
  for (const t of lado) {
    if (t.tipo !== "igual") {
      const m = t.texto.match(/^([\s\S]*?)(\s*)$/);
      const [, cuerpo, cola] = m ?? ["", t.texto, ""];
      if (cuerpo) sumar(out, cuerpo, t.tipo);
      if (cola) sumar(out, cola, "igual");
    } else sumar(out, t.texto, "igual");
  }
  return out;
}
