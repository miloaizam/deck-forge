/**
 * Sube al principio de la pagina, con suavidad salvo que el usuario pida
 * "reducir movimiento". La regla CSS de globals.css no alcanza aqui: el
 * `behavior: "smooth"` de JavaScript no mira `scroll-behavior`.
 */
export function irArriba(): void {
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reducir ? "auto" : "smooth" });
}
