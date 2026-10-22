import { expect, test, type Page } from "@playwright/test";

import { sinViolaciones } from "./axe";

/**
 * Accesibilidad con axe-core: recorre las paginas del sitio construido, en los
 * dos temas, y falla con cualquier violacion seria o critica de WCAG 2.2 AA.
 * `pnpm run a11y` (tras `pnpm run build`).
 *
 * axe se inyecta desde node_modules con addScriptTag (`axe.ts`): el sitio no
 * lo carga y la CSP de produccion no entra en juego (el preview no aplica
 * `_headers`). Las paginas de la cuenta y la Comunidad con la nube encendida
 * se revisan en `nube.spec.ts`.
 */

/** Arma y guarda una baraja chica; devuelve la URL de su detalle. */
async function armarBaraja(page: Page): Promise<string> {
  await page.goto("/constructor/");
  const agregar = page.getByRole("button", { name: /^Agregar .+ a la baraja$/ });
  for (const i of [0, 1, 2, 3]) await agregar.nth(i).click();
  await page
    .getByRole("textbox", { name: "Nombre de la baraja" })
    .first()
    .fill("Accesible");
  await page
    .getByRole("button", { name: "Guardar baraja" })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "Guardar igual" }).click();
  await page.waitForURL(/\/baraja\/\?m=/);
  return page.url();
}

const PAGINAS = [
  "/",
  "/catalogo/",
  "/catalogo/escuelas-elementales/",
  "/coleccion/",
  "/coleccion/?ver=faltan",
  "/coleccion/?ver=agregar",
  "/documentos/",
  "/documentos/fe-de-erratas/",
  "/documentos/banlist/",
  "/novedades/",
  "/cuenta/",
  "/comunidad/",
  "/privacidad/",
  "/no-existe/",
];

for (const tema of ["dark", "light"] as const) {
  test.describe(`@a11y tema ${tema === "dark" ? "oscuro" : "claro"}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => {
        try {
          localStorage.setItem("deckforge-theme", t);
        } catch {
          // sin almacenamiento: queda el tema por defecto
        }
      }, tema);
    });

    for (const ruta of PAGINAS) {
      test(`${ruta}`, async ({ page }) => {
        await page.goto(ruta);
        await sinViolaciones(page, ruta);
      });
    }

    test("constructor, baraja y modales", async ({ page, isMobile }) => {
      test.skip(isMobile, "el recorrido usa el panel de escritorio");
      const detalle = await armarBaraja(page);
      await sinViolaciones(page, "detalle de la baraja");

      await page.goto("/barajas/");
      await sinViolaciones(page, "Mis barajas");

      await page.goto("/constructor/");
      await sinViolaciones(page, "constructor con borrador");
      await page
        .getByRole("button", { name: /^Ver detalle de / })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await sinViolaciones(page, "modal de carta");
      await page.keyboard.press("Escape");

      await page.goto(detalle);
      await page.getByRole("button", { name: "Borrar la baraja" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await sinViolaciones(page, "modal de confirmar");
    });
  });
}
