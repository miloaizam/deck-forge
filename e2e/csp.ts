import { readFileSync } from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";

/**
 * La CSP de verdad en las pruebas. `pnpm run preview` no aplica
 * `out/_headers`, y sin eso no se ve lo que bloquea Cloudflare: el 25-11-2026
 * la mesa no conectaba al entrar desde la navbar, porque la pagina seguia
 * con la CSP del catalogo, sin el wss:// del tiempo real, y aqui todo
 * pasaba. Esto le pone a cada documento la CSP que le daria Cloudflare, con
 * sus mismas reglas (CLAUDE.md, «La CSP por hashes»): en orden, ruta exacta
 * o con `*` al final, `!` borra y una cabecera repetida se une con coma.
 */

interface Regla {
  ruta: string;
  borra: string[];
  pone: [string, string][];
}

function reglas(): Regla[] {
  // Playwright corre desde la raiz del repo (playwright.config.ts).
  const texto = readFileSync(path.join(process.cwd(), "out", "_headers"), "utf8");
  const lista: Regla[] = [];
  for (const linea of texto.split("\n")) {
    if (!linea.trim() || linea.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(linea)) {
      lista.push({ ruta: linea.trim(), borra: [], pone: [] });
      continue;
    }
    const actual = lista.at(-1);
    if (!actual) continue;
    const l = linea.trim();
    if (l.startsWith("!")) actual.borra.push(l.slice(1).trim().toLowerCase());
    else {
      const i = l.indexOf(":");
      actual.pone.push([l.slice(0, i).trim().toLowerCase(), l.slice(i + 1).trim()]);
    }
  }
  return lista;
}

/** La CSP que Cloudflare le daria a un documento servido en `ruta`. */
export function cspPara(ruta: string): string | undefined {
  const cabeceras = new Map<string, string>();
  for (const r of reglas()) {
    const coincide = r.ruta.endsWith("*")
      ? ruta.startsWith(r.ruta.slice(0, -1))
      : ruta === r.ruta;
    if (!coincide) continue;
    for (const b of r.borra) cabeceras.delete(b);
    for (const [k, v] of r.pone) {
      const antes = cabeceras.get(k);
      cabeceras.set(k, antes ? `${antes}, ${v}` : v);
    }
  }
  return cabeceras.get("content-security-policy");
}

/** Cada documento que cargue `page` llega con su CSP de Cloudflare. */
export async function conCspDeVerdad(page: Page) {
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.resourceType() !== "document" || !req.url().startsWith("http://localhost")) {
      return route.fallback();
    }
    const respuesta = await route.fetch();
    const csp = cspPara(new URL(req.url()).pathname);
    await route.fulfill({
      response: respuesta,
      headers: {
        ...respuesta.headers(),
        ...(csp ? { "content-security-policy": csp } : {}),
      },
    });
  });
}
