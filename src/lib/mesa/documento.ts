/**
 * De que documento viene la pagina, para saber que CSP trae (ver
 * `src/components/mesa/documento-de-la-mesa.ts`). Logica pura.
 */

/** La ruta con que se cargo el documento: la URL de su navegacion inicial. */
export function rutaDelDocumento(
  nombreNavegacion: string | undefined,
  actual: string,
): string {
  try {
    return new URL(nombreNavegacion ?? actual).pathname;
  } catch {
    return new URL(actual).pathname;
  }
}

/** Si un documento cargado en esa ruta trae la CSP de la mesa. */
export function traeLaCspDeLaMesa(ruta: string): boolean {
  return ruta === "/mesa" || ruta.startsWith("/mesa/");
}
