import { Space_Grotesk } from "next/font/google";

/**
 * Space Grotesk es la tipografia de marca. `next/font` la descarga en tiempo
 * de build y la auto-hospeda: en produccion no se pide nada a Google, lo que
 * mantiene la CSP cerrada a `font-src 'self'`.
 *
 * Vive aqui y no en el layout porque la usan dos documentos: el layout raiz y
 * `global-error.tsx`, que reemplaza al layout cuando es el quien falla y tiene
 * que traer su propia fuente.
 */
export const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
