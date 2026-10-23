import { expect, test, type Page } from "@playwright/test";

import { entrarSimulado } from "./supabase-simulado";

/**
 * Recorridos basicos del sitio construido. Cada prueba arranca con el
 * localStorage vacio (Playwright abre un contexto nuevo por prueba).
 */

// El constructor, Mis barajas y la coleccion piden cuenta: cada prueba entra
// con una de mentira contra un Supabase simulado (no hace nada si las cuentas
// estan apagadas). Lo que se ve sin cuenta lo prueba `nube.spec.ts`.
test.beforeEach(async ({ page }) => {
  await entrarSimulado(page);
});

/**
 * Agrega al constructor la primera carta que se pueda agregar, y espera a que
 * entre: un «+» pulsado antes de que llegue el catalogo queda en espera y se
 * aplica al llegar, y recargar antes lo perderia.
 */
async function agregarPrimera(page: Page) {
  const mas = page.getByRole("button", { name: /^Agregar .+ a la baraja$/ }).first();
  const nombre = (await mas.getAttribute("aria-label"))!
    .replace(/^Agregar /, "")
    .replace(/ a la baraja$/, "");
  await mas.click();
  await expect(
    page.getByRole("button", { name: `Quitar una copia de ${nombre}` }).first(),
  ).toBeEnabled();
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

/**
 * El panel de la baraja: al costado desde `lg` (1024) y, por debajo, en una
 * hoja que se abre desde la barra fija del pie.
 */
async function abrirPanel(page: Page) {
  if (page.viewportSize()!.width >= 1024) return page.locator("aside");
  await page.getByRole("button", { name: /^Abrir el panel de la baraja/ }).click();
  return page.getByRole("dialog");
}

test.describe("constructor", () => {
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
    const panel = await abrirPanel(page);
    await panel.getByRole("textbox", { name: "Nombre de la baraja" }).fill("Prueba");
    await panel.getByRole("button", { name: "Guardar baraja" }).click();
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
  await page.getByRole("button", { name: /^Faltan/ }).click();
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
  await page.getByRole("button", { name: /^Faltan/ }).click();
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
  await page.getByRole("button", { name: "Copiar la lista como texto" }).click();
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

/**
 * Ninguna ruta se sale de la pantalla a lo ancho: en el telefono (412), en la
 * tableta (768) y en el escritorio. El margen de 1 px es el redondeo
 * sub-pixel.
 */
const RUTAS = [
  "/",
  "/catalogo/",
  "/catalogo/escuelas-elementales/",
  "/constructor/",
  "/barajas/",
  "/coleccion/",
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

test("ninguna ruta tiene scroll horizontal", async ({ page }) => {
  for (const ruta of RUTAS) {
    await page.goto(ruta);
    await page.waitForLoadState("networkidle");
    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sobra, ruta).toBeLessThanOrEqual(1);
  }
});

test("a 360 px el menu, los filtros y la hoja caben en la pantalla", async ({
  page,
}, info) => {
  // Fija su propio ancho: basta con correrla una vez.
  test.skip(info.project.name !== "telefono", "una vez basta");
  await page.setViewportSize({ width: 360, height: 740 });
  const sobra = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

  await page.goto("/catalogo/");
  await page.getByRole("button", { name: "Abrir el menú" }).click();
  await expect(page.getByRole("link", { name: "Novedades" }).last()).toBeVisible();
  expect(await sobra()).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Cerrar el menú" }).click();

  await page.getByRole("button", { name: /Filtros/ }).click();
  expect(await sobra()).toBeLessThanOrEqual(1);

  await page.goto("/constructor/");
  await agregarPrimera(page);
  const hoja = await abrirPanel(page);
  await expect(hoja.getByRole("button", { name: "Guardar baraja" })).toBeInViewport();
  expect(await sobra()).toBeLessThanOrEqual(1);
});

test.describe("la carta del detalle se inclina", () => {
  const cuerpo = (page: Page) => page.locator("dialog[open] .carta-3d-cuerpo");
  const rotada = (page: Page) =>
    cuerpo(page).evaluate((e) => getComputedStyle(e).transform.startsWith("matrix3d"));

  async function abrir(page: Page) {
    await page.goto("/catalogo/");
    await page
      .getByRole("button", { name: /^Ver detalle de / })
      .first()
      .click();
    await expect(cuerpo(page)).toBeVisible();
  }

  test("con el cursor, y vuelve al salir", async ({ page, isMobile }) => {
    test.skip(isMobile, "sin cursor");
    await abrir(page);
    const caja = (await cuerpo(page).boundingBox())!;
    await page.mouse.move(caja.x + caja.width * 0.2, caja.y + caja.height * 0.2, {
      steps: 4,
    });
    await expect.poll(() => rotada(page)).toBe(true);
    await page.mouse.move(2, 2);
    await expect.poll(() => rotada(page)).toBe(false);
  });

  test("con el dedo, mientras la arrastra", async ({ page }) => {
    await abrir(page);
    const caja = (await cuerpo(page).boundingBox())!;
    const en = (fx: number, fy: number) => ({
      pointerType: "touch",
      pointerId: 7,
      bubbles: true,
      clientX: caja.x + caja.width * fx,
      clientY: caja.y + caja.height * fy,
    });
    await cuerpo(page).dispatchEvent("pointerdown", { ...en(0.5, 0.5), buttons: 1 });
    await cuerpo(page).dispatchEvent("pointermove", { ...en(0.85, 0.3), buttons: 1 });
    await expect.poll(() => rotada(page)).toBe(true);
    await cuerpo(page).dispatchEvent("pointerup", { ...en(0.85, 0.3), buttons: 0 });
    await expect.poll(() => rotada(page)).toBe(false);
  });

  test("con «reducir movimiento» se queda quieta", async ({ page, isMobile }) => {
    test.skip(isMobile, "sin cursor");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await abrir(page);
    const caja = (await cuerpo(page).boundingBox())!;
    await page.mouse.move(caja.x + caja.width * 0.2, caja.y + caja.height * 0.2, {
      steps: 4,
    });
    await page.waitForTimeout(300);
    expect(await rotada(page)).toBe(false);
  });
});
