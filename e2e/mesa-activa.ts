import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Si el build que se prueba tiene la mesa encendida, con el mismo criterio
 * que `src/lib/mesa/activa.ts`: `activa.json`, y NEXT_PUBLIC_MESA_ACTIVA
 * ("1" o "0") lo pisa. `pnpm run e2e:mesa-apagada` construye y prueba con
 * la mesa apagada.
 */
export function mesaActiva(): boolean {
  const forzada = process.env.NEXT_PUBLIC_MESA_ACTIVA;
  if (forzada === "1") return true;
  if (forzada === "0") return false;
  // Playwright corre desde la raiz del repo (playwright.config.ts).
  const archivo = path.join(process.cwd(), "src", "lib", "mesa", "activa.json");
  return (
    (JSON.parse(readFileSync(archivo, "utf8")) as { activa?: unknown }).activa === true
  ); // se revisa el campo
}
