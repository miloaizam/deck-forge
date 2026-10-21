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

test("una carta puede estar en «Tengo» y en «Me faltan» a la vez", async ({ page }) => {
  await page.goto("/coleccion/?ver=agregar");
  // La primera fila del catalogo; los botones se buscan dentro de ella, porque
  // un nombre puede estar contenido en otro («Caín», «Marca de Caín»).
  const primera = page.getByRole("listitem").filter({ hasText: /./ }).first();
  const corazon = primera.getByRole("button", { name: / me falta$/ });
  const nombre = (await corazon.getAttribute("aria-label"))!.replace(/ me falta$/, "");
  await primera.getByRole("button", { name: `Tengo ${nombre}` }).click();
  // Con la carta ya en «Tengo», el corazon sigue disponible.
  await corazon.click();
  await expect(corazon).toHaveAttribute("aria-pressed", "true");

  // En las dos listas solo esta esa carta: su fila es la unica.
  await page.getByRole("button", { name: /^Me faltan/ }).click();
  const fila = page.locator(".fila-coleccion");
  await expect(fila).toHaveCount(1);
  await fila.getByRole("button", { name: /^Sumar una copia que falta/ }).click();
  await expect(fila).toContainText("tienes 1");
  await expect(fila.getByLabel("2 copias")).toBeVisible();

  // «Conseguí una» pasa una sola copia.
  await fila.getByRole("button", { name: /^Conseguí una copia/ }).click();
  await expect(fila).toContainText("tienes 2");
  await expect(fila.getByLabel("1 copia", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: /^Tengo/ })
    .first()
    .click();
  await expect(fila).toHaveCount(1);
  await expect(fila).toContainText(nombre);
  await expect(fila).toContainText("te falta 1");
  await expect(fila.getByLabel("2 copias")).toBeVisible();
});

test("«Lista» copia la colección como texto para un chat", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    localStorage.setItem(
      "deckforge-coleccion",
      JSON.stringify({ v: 1, cartas: { "ee-050": 3 }, quiero: {} }),
    );
  });
  await page.goto("/coleccion/");
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.getByText(/^Lista copiada/).first()).toBeAttached();
  const texto = await page.evaluate(() => navigator.clipboard.readText());
  expect(texto).toBe(
    "*Tengo* (3 cartas)\n\n*Aliados* (3)\n3x Akiko Yamamoto (Escuelas Elementales, Mega Real)",
  );
});

test.describe("el catalogo llega aparte del HTML", () => {
  test("los filtros de la URL se aplican al llegar el catalogo", async ({ page }) => {
    await page.goto("/catalogo/?q=akiko");
    await expect(
      page.getByRole("button", { name: /Akiko Yamamoto/ }).first(),
    ).toBeVisible();
  });

  test("si el catalogo no baja, se puede reintentar", async ({ page }) => {
    let fallar = true;
    await page.route("**/data/cards.json", (route) =>
      fallar ? route.abort() : route.continue(),
    );
    // La coleccion no tiene nada que mostrar sin el catalogo.
    await page.goto("/coleccion/");
    await expect(page.getByText("No se pudo cargar el catálogo.")).toBeVisible();
    fallar = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("group", { name: "Qué cartas mostrar" })).toBeVisible();
    await expect(page.getByText("No se pudo cargar el catálogo.")).toHaveCount(0);
  });

  test("un «+» pulsado antes del catalogo se aplica al llegar", async ({ page }) => {
    let soltar: () => void = () => {};
    const espera = new Promise<void>((r) => (soltar = r));
    await page.route("**/data/cards.json", async (route) => {
      await espera;
      await route.continue();
    });
    await page.goto("/constructor/");
    // La primera pagina ya esta en el HTML: se ve y se pulsa antes que llegue
    // el catalogo.
    const mas = page.getByRole("button", { name: /^Agregar .+ a la baraja$/ }).first();
    const nombre = (await mas.getAttribute("aria-label"))!
      .replace(/^Agregar /, "")
      .replace(/ a la baraja$/, "");
    await mas.click();
    const quitar = page.getByRole("button", { name: `Quitar una copia de ${nombre}` });
    await expect(quitar.first()).toBeDisabled();
    soltar();
    await expect(quitar.first()).toBeEnabled();
  });
});
