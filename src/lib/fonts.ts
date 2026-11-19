import localFont from "next/font/local";

/**
 * Space Grotesk es la tipografia de marca, auto-hospedada: en produccion no se
 * pide nada a Google, lo que mantiene la CSP cerrada a `font-src 'self'`.
 *
 * El archivo va en el repo (`src/fonts/`, con su licencia OFL) y no se baja con
 * `next/font/google` en cada build: el 19-11-2026 el build de Cloudflare se
 * cayo porque Google no respondio en ese minuto, y Turbopack lo reporto como
 * un modulo que faltaba. Es el subconjunto latin, variable (400 a 700): en el
 * catalogo el unico caracter fuera de Latin-1 es U+2019, que esta dentro.
 *
 * Vive aqui y no en el layout porque la usan dos documentos: el layout raiz y
 * `global-error.tsx`, que reemplaza al layout cuando es el quien falla y tiene
 * que traer su propia fuente.
 */
export const spaceGrotesk = localFont({
  src: "../fonts/space-grotesk-latin.woff2",
  variable: "--font-space-grotesk",
  weight: "400 700",
  display: "swap",
});
