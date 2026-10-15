import { expect, test, type Page } from "@playwright/test";

/**
 * Recorridos basicos del sitio construido. Cada prueba arranca con el
 * localStorage vacio (Playwright abre un contexto nuevo por prueba).
 */

/** Agrega al constructor la primera carta que se pueda agregar. */
async function agregarPrimera(page: Page) {
  await page
    .getByRole("button", { name: /^Agregar .+ a la baraja$/ })
    .first()
    .click();
}

test("el catalogo abre el detalle de una carta y Esc lo cierra", async ({ page }) => {
  await page.goto("/catalogo/");
  await page
    .getByRole("button", { name: /^Ver detalle de / })
    .first()
    .click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
});

test.describe("constructor", () => {
  // En el telefono la baraja va en una hoja aparte: estos recorridos son del
  // panel de escritorio.
  test.skip(({ isMobile }) => isMobile, "panel de escritorio");

  test("pregunta si recuperar la baraja sin guardar", async ({ page }) => {
    await page.goto("/constructor/");
    await agregarPrimera(page);
    await page.reload();
    // El aviso va dos veces en la pagina (sobre el panel y, bajo lg, sobre los
    // filtros) y la pregunta sale tambien en la ayuda: se mira el visible.
    const aviso = page
      .getByRole("status")
      .filter({ hasText: "¿Recuperar baraja sin guardar?", visible: true });
    await expect(aviso).toBeVisible();
    await aviso.getByRole("button", { name: "Recuperar", exact: true }).click();
    await expect(aviso).toBeHidden();
    await expect(page.getByText("Baraja sin guardar recuperada.").last()).toBeVisible();
  });

  test("toda la tarjeta de Mis barajas abre la baraja", async ({ page }) => {
    await page.goto("/constructor/");
    await agregarPrimera(page);
    await page.getByRole("textbox", { name: "Nombre de la baraja" }).fill("Prueba");
    await page.getByRole("button", { name: "Guardar baraja" }).click();
    // Incompleta: pide confirmar.
    await page.getByRole("button", { name: "Guardar igual" }).click();
    await expect(page).toHaveURL(/\/baraja\/\?m=/);

    await page.goto("/barajas/");
    // Un clic en la tarjeta, lejos del titulo y de los botones.
    await page
      .getByRole("listitem")
      .filter({ hasText: "Prueba" })
      .click({ position: { x: 200, y: 50 } });
    await expect(page).toHaveURL(/\/baraja\/\?m=/);
  });
});

test("en «Me faltan» se anotan mas de tres copias", async ({ page }) => {
  await page.goto("/coleccion/?ver=agregar");
  const corazon = page.getByRole("button", { name: / me falta$/ }).first();
  const nombre = (await corazon.getAttribute("aria-label"))!.replace(/ me falta$/, "");
  await corazon.click();
  await page.getByRole("button", { name: /^Me faltan/ }).click();
  const sumar = page.getByRole("button", {
    name: `Sumar una copia que falta de ${nombre}`,
  });
  for (let i = 0; i < 4; i++) await sumar.click();
  await expect(page.getByLabel("5 copias")).toBeVisible();
  await expect(sumar).toBeEnabled();
});
