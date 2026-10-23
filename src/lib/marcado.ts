/**
 * El marcado minimo del texto de los documentos (`documentos/fuente/dar.json`):
 *
 * - `**negrita**` y `*cursiva*`;
 * - `[[8.1|8.1 Jugar una carta]]`: un enlace a una seccion, apartado o regla
 *   del propio documento (el id es su ancla);
 * - `{{Ataque de Dragón}}`: una carta, que se pinta como enlace al catalogo.
 *
 * Se lee a tramos y se pinta con nodos de texto, sin HTML (seguridad #3 de
 * CLAUDE.md). La negrita y la cursiva no anidan otras marcas: el documento no
 * las necesita, y asi un `*` suelto no puede tragarse un enlace.
 */

export type Tramo =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrita"; texto: string }
  | { tipo: "cursiva"; texto: string }
  | { tipo: "ref"; id: string; texto: string }
  | { tipo: "carta"; nombre: string };

const MARCA = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[\[([^|\]]+)\|([^\]]+)\]\]|\{\{([^{}]+)\}\}/g;

export function leerMarcado(texto: string): Tramo[] {
  const tramos: Tramo[] = [];
  let desde = 0;
  for (const m of texto.matchAll(MARCA)) {
    if (m.index > desde)
      tramos.push({ tipo: "texto", texto: texto.slice(desde, m.index) });
    if (m[1] !== undefined) tramos.push({ tipo: "negrita", texto: m[1] });
    else if (m[2] !== undefined) tramos.push({ tipo: "cursiva", texto: m[2] });
    else if (m[3] !== undefined) tramos.push({ tipo: "ref", id: m[3], texto: m[4] });
    else tramos.push({ tipo: "carta", nombre: m[5] });
    desde = m.index + m[0].length;
  }
  if (desde < texto.length) tramos.push({ tipo: "texto", texto: texto.slice(desde) });
  return tramos;
}

/** El texto sin marcas, como se lee: para buscar, para el PDF sin enlaces. */
export function textoPlano(texto: string): string {
  return leerMarcado(texto)
    .map((t) => (t.tipo === "carta" ? t.nombre : t.texto))
    .join("");
}

/** Ids a los que apunta un texto. */
export function refsDe(texto: string): string[] {
  return leerMarcado(texto).flatMap((t) => (t.tipo === "ref" ? [t.id] : []));
}

/** Cartas que nombra un texto con `{{…}}`. */
export function cartasDe(texto: string): string[] {
  return leerMarcado(texto).flatMap((t) => (t.tipo === "carta" ? [t.nombre] : []));
}
