import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { createDeck, setQuantity, setStartingGold } from "../src/lib/deck";
import type { Deck } from "../src/lib/types";
import { sinViolaciones } from "./axe";
import { mesaActiva } from "./mesa-activa";
import { entrarSimulado } from "./supabase-simulado";

/**
 * La mesa de practica (GAME.md, sesion 2). Encendida, que es el build de
 * siempre desde la sesion 8, se juega moviendo cartas; apagada
 * (`pnpm run e2e:mesa-apagada`), solo se comprueba que lo diga.
 */
const MESA = mesaActiva();

interface CartaCruda {
  id: string;
  identidad: string;
  tipo: string;
  habilidad: string;
}

const cartas = JSON.parse(
  readFileSync(path.join(__dirname, "..", "out", "data", "cards.json"), "utf8"),
) as CartaCruda[]; // solo se leen cuatro campos, y la mesa no valida la baraja

/** 50 cartas: 16 Aliados distintos por 3, el oro inicial y uno mas. */
function baraja(): Deck {
  const oro = cartas.find((c) => c.tipo === "Oro" && c.habilidad === "")!;
  let deck = setStartingGold(createDeck("Para la mesa"), oro.id);
  const vistas = new Set<string>();
  for (const c of cartas) {
    if (c.tipo !== "Aliado" || vistas.has(c.identidad)) continue;
    vistas.add(c.identidad);
    deck = setQuantity(deck, c.id, "principal", vistas.size <= 16 ? 3 : 1);
    if (vistas.size === 17) break;
  }
  return deck;
}

test.beforeEach(async ({ page }) => {
  await entrarSimulado(page);
  await page.addInitScript(
    (sobre) => {
      if (!localStorage.getItem("deckforge-decks"))
        localStorage.setItem("deckforge-decks", sobre);
    },
    JSON.stringify({ v: 1, mazos: [baraja()] }),
  );
});

function zona(page: Page, nombre: string): Locator {
  return page.getByRole("region", { name: new RegExp(`^${nombre}, \\d+ cartas?$`) });
}

async function cuenta(page: Page, nombre: string): Promise<number> {
  const etiqueta = await zona(page, nombre).getAttribute("aria-label");
  return Number(etiqueta?.match(/, (\d+) carta/)?.[1]);
}

/** Arrastra con el raton, en pasos, como una persona. */
async function arrastrar(page: Page, desde: Locator, hasta: Locator) {
  const a = (await desde.boundingBox())!;
  const b = (await hasta.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

test("apagada, la mesa dice que todavia no esta disponible", async ({ page }) => {
  test.skip(MESA, "este build la tiene encendida");
  await page.goto("/mesa/practica/");
  await expect(page.getByText("Todavía no está disponible.")).toBeVisible();
});

test("en el telefono dice que es para escritorio", async ({ page }, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "telefono", "una vez basta");
  await page.goto("/mesa/practica/");
  await expect(
    page.getByRole("heading", { name: "La mesa es para escritorio" }),
  ).toBeVisible();
});

test("un turno en la mesa de practica, moviendo cartas", async ({ page }, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "la mesa es para escritorio");

  await page.goto("/mesa/practica/");
  await page.getByRole("button", { name: /Para la mesa/ }).click();

  // Preparada: oro inicial en la Reserva, mano de 8 y el resto en el Castillo.
  await expect(zona(page, "Mano")).toBeVisible();
  expect(await cuenta(page, "Mano")).toBe(8);
  expect(await cuenta(page, "Reserva de Oro")).toBe(1);
  expect(await page.getByRole("button", { name: /^Castillo, 41 cartas/ }).count()).toBe(
    1,
  );

  // Robar con el boton.
  await page.getByRole("button", { name: "Robar una" }).click();
  await expect(zona(page, "Mano")).toHaveAttribute("aria-label", "Mano, 9 cartas");

  // Pagar: el oro inicial, arrastrado de la Reserva al Oro Pagado.
  await arrastrar(
    page,
    zona(page, "Reserva de Oro").getByRole("button").first(),
    zona(page, "Oro Pagado"),
  );
  await expect(zona(page, "Oro Pagado")).toHaveAttribute(
    "aria-label",
    "Oro Pagado, 1 carta",
  );

  // Jugar un Aliado: de la mano a la Linea de Defensa, arrastrando.
  await arrastrar(
    page,
    zona(page, "Mano").getByRole("button").first(),
    zona(page, "Línea de Defensa"),
  );
  await expect(zona(page, "Línea de Defensa")).toHaveAttribute(
    "aria-label",
    "Línea de Defensa, 1 carta",
  );
  expect(await cuenta(page, "Mano")).toBe(8);

  // Atacar con el menu de la carta, que es lo que usa el teclado.
  await zona(page, "Línea de Defensa").getByRole("button").first().click();
  await page.getByRole("menuitem", { name: "Línea de Ataque" }).click();
  await expect(zona(page, "Línea de Ataque")).toHaveAttribute(
    "aria-label",
    "Línea de Ataque, 1 carta",
  );

  // Voltear y ver la carta en grande.
  const atacante = zona(page, "Línea de Ataque").getByRole("button").first();
  await atacante.click();
  await page.getByRole("menuitem", { name: "Poner boca abajo" }).click();
  await expect(atacante).toHaveAttribute("aria-label", "Carta boca abajo");
  await atacante.click();
  await page.getByRole("menuitem", { name: "Ver carta" }).click();
  await expect(page.getByRole("dialog").filter({ visible: true })).toBeVisible();
  await page.keyboard.press("Escape");

  // Muere en batalla: al Cementerio, y se ve al abrirlo.
  await atacante.click();
  await page.getByRole("menuitem", { name: "Cementerio" }).click();
  await page.getByRole("button", { name: "Ver Cementerio, 1 carta" }).click();
  await expect(page.getByRole("heading", { name: "Cementerio (1)" })).toBeVisible();
  // El de su ventana: la de «Ver carta» puede seguir desvaneciendose.
  await page
    .getByRole("dialog", { name: "Cementerio (1)" })
    .getByRole("button", { name: "Cerrar" })
    .click();

  // Fin de turno: el oro vuelve a la Reserva, a mano, y se baraja el Castillo.
  await arrastrar(
    page,
    zona(page, "Oro Pagado").getByRole("button").first(),
    zona(page, "Reserva de Oro"),
  );
  expect(await cuenta(page, "Reserva de Oro")).toBe(1);
  await page.getByRole("button", { name: /^Castillo, 40 cartas/ }).click();
  await page.getByRole("menuitem", { name: "Barajar" }).click();
  expect(await page.getByRole("button", { name: /^Castillo, 40 cartas/ }).count()).toBe(
    1,
  );
});

test("mirar, buscar, barajar desde el Cementerio, marcas, turno y registro", async ({
  page,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "la mesa es para escritorio");

  await page.goto("/mesa/practica/");
  await page.getByRole("button", { name: /Para la mesa/ }).click();
  const registro = page.getByRole("complementary", { name: "Registro" });
  const lineas = registro.getByRole("listitem");
  const castillo = () => page.getByRole("button", { name: /^Castillo, \d+ cartas/ });
  await expect(lineas.first()).toContainText("Preparó la mesa");

  // Mirar 3 y devolverlas en otro orden.
  await castillo().click();
  await page.getByRole("menuitem", { name: "Mirar…" }).click();
  await page.getByRole("button", { name: "Una más" }).click();
  await page.getByRole("button", { name: "Una más" }).click();
  await page.getByRole("button", { name: "Mirar 3" }).click();
  const mirando = page.getByRole("dialog", { name: "Mirar las 3 de arriba" });
  await expect(mirando).toBeVisible();
  await mirando
    .getByRole("button", { name: /^Bajar / })
    .first()
    .click();
  await mirando.getByRole("button", { name: "Devolver arriba en este orden" }).click();
  await expect(lineas.first()).toContainText(
    "Devolvió 3 cartas arriba del Castillo, en el orden elegido.",
  );
  await expect(registro).toContainText("Miró las 3 de arriba del Castillo.");

  // Buscar y mostrar: va a la mano, se nombra y el Castillo se baraja.
  await castillo().click();
  await page.getByRole("menuitem", { name: "Buscar y mostrar" }).click();
  const buscando = page.getByRole("dialog", { name: "Buscar y mostrar en el Castillo" });
  await buscando.getByRole("listitem").first().getByRole("button").click();
  await buscando.getByRole("button", { name: "Mostrar y tomar" }).click();
  await expect(lineas.first()).toContainText(
    /^\d+\.Buscó y mostró .+\. Barajó el Castillo\./,
  );
  expect(await cuenta(page, "Mano")).toBe(9);
  await expect(
    page.getByRole("alert").filter({ hasText: "Mano de 9 cartas" }),
  ).toBeVisible();

  // Botar 2 y barajarlas de vuelta desde el Cementerio.
  await castillo().click();
  await page.getByRole("menuitem", { name: "Botar…" }).click();
  await page.getByRole("button", { name: "Una más" }).click();
  await page.getByRole("button", { name: "Botar 2" }).click();
  await page.getByRole("button", { name: "Ver Cementerio, 2 cartas" }).click();
  const cementerio = page.getByRole("dialog", { name: /^Cementerio \(/ });
  await cementerio
    .getByRole("button", { name: "Elegir para barajar en el Castillo" })
    .click();
  for (const carta of await cementerio.getByRole("listitem").all()) {
    await carta.getByRole("button").click();
  }
  await cementerio.getByRole("button", { name: "Barajar 2 en el Castillo" }).click();
  await expect(lineas.first()).toContainText(/desde el Cementerio en el Castillo\.$/);
  await cementerio.getByRole("button", { name: "Cerrar" }).click();
  expect(await cuenta(page, "Cementerio")).toBe(0);

  // Marcas: un contador de Honor y +2 de Fuerza, y limpiar la Fuerza.
  await zona(page, "Mano").getByRole("button").first().click();
  await page.getByRole("menuitem", { name: "Línea de Defensa" }).click();
  await zona(page, "Línea de Defensa").getByRole("button").first().click();
  await page.getByRole("menuitem", { name: "Marcas…" }).click();
  const marcas = page.getByRole("dialog", { name: /^Marcas de / });
  await marcas.getByRole("button", { name: "Contadores de Honor: uno más" }).click();
  await marcas
    .getByRole("button", { name: "Fuerza hasta la Fase Final: uno más" })
    .click();
  await marcas
    .getByRole("button", { name: "Fuerza hasta la Fase Final: uno más" })
    .click();
  await marcas.getByRole("button", { name: "Cerrar" }).click();
  await expect(zona(page, "Línea de Defensa")).toContainText("+2");
  await expect(registro).toContainText(/Puso un contador de Honor en /);
  await page.getByRole("button", { name: "Limpiar Fuerza" }).click();
  await expect(zona(page, "Línea de Defensa")).not.toContainText("+2");
  await expect(lineas.first()).toContainText("Limpió los modificadores de Fuerza.");

  // El turno: sin fases (se conversan), solo «Pasar turno».
  const marcador = page.getByRole("navigation", { name: "Turno" });
  await expect(marcador.getByRole("button", { name: "Siguiente fase" })).toHaveCount(0);
  await marcador.getByRole("button", { name: "Pasar turno" }).click();
  await expect(marcador).toContainText("Turno 2");

  // El registro tiene alto fijo: con mas lineas no crece, scrollea por dentro.
  const alto = (await registro.boundingBox())?.height ?? 0;
  for (let i = 0; i < 12; i++) {
    await page.getByRole("button", { name: "Lanzar moneda" }).click();
  }
  expect((await registro.boundingBox())?.height).toBe(alto);
  const lista = registro.getByRole("list");
  expect(await lista.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

  // La moneda, y una linea por accion, numeradas sin huecos.
  await page.getByRole("button", { name: "Lanzar moneda" }).click();
  await expect(lineas.first()).toContainText(/Moneda: (cara|sello)\./);
  const numeros = (await lineas.allTextContents()).map((t) =>
    Number(t.match(/^(\d+)\./)?.[1]),
  );
  expect(numeros).toEqual(numeros.map((_, i) => numeros.length - i));
});

/**
 * Pulsa Tab hasta que el foco quede en un elemento cuyo nombre (o el de su
 * zona) cumpla `busca`. Sin raton: lo que se alcanza asi se alcanza con el
 * teclado.
 */
async function tabHasta(page: Page, busca: RegExp, max = 400) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const nombre = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return "";
      const zonaDe = el.closest("section[aria-label]")?.getAttribute("aria-label") ?? "";
      return `${el.getAttribute("aria-label") ?? el.textContent ?? ""} | ${zonaDe}`;
    });
    if (busca.test(nombre)) return;
  }
  throw new Error(`con Tab no se llego a ${busca}`);
}

/** Baja con la flecha por el menu abierto hasta la opcion `nombre`. */
async function bajarHasta(page: Page, nombre: string) {
  for (let i = 0; i < 30; i++) {
    const actual = await page.evaluate(() => document.activeElement?.textContent ?? "");
    if (actual.trim() === nombre) return;
    await page.keyboard.press("ArrowDown");
  }
  throw new Error(`el menu no tiene «${nombre}»`);
}

test("la mesa de practica se juega con el teclado, sin arrastrar", async ({
  page,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "la mesa es para escritorio");

  await page.goto("/mesa/practica/");
  await page.getByRole("button", { name: /Para la mesa/ }).click();
  await expect(zona(page, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas");

  // Una carta de la mano, a la Linea de Defensa: Tab, Enter y flechas.
  await tabHasta(page, /\| Mano, 8 cartas$/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await bajarHasta(page, "Línea de Defensa");
  await page.keyboard.press("Enter");
  await expect(zona(page, "Línea de Defensa")).toHaveAttribute(
    "aria-label",
    "Línea de Defensa, 1 carta",
  );
  await expect(page.getByRole("menu")).toBeHidden();

  // Robar desde el menu del Castillo.
  await tabHasta(page, /^Castillo, 41 cartas/);
  await page.keyboard.press("Enter");
  await bajarHasta(page, "Robar una");
  await page.keyboard.press("Enter");
  await expect(zona(page, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas");

  // La de la Linea de Defensa, al Cementerio; y el Cementerio se abre.
  await tabHasta(page, /\| Línea de Defensa, 1 carta$/);
  await page.keyboard.press("Enter");
  await bajarHasta(page, "Cementerio");
  await page.keyboard.press("Enter");
  await tabHasta(page, /^Ver Cementerio, 1 carta/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Cementerio (1)" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Cementerio (1)" })).toBeHidden();

  // Y el turno pasa desde el marcador, con el teclado.
  const marcador = page.getByRole("navigation", { name: "Turno" });
  await expect(marcador).toContainText("Turno 1");
  await tabHasta(page, /^Pasar turno/);
  await page.keyboard.press("Enter");
  await expect(marcador).toContainText("Turno 2");
});

for (const tema of ["dark", "light"] as const) {
  test(`@a11y la mesa de practica y la entrada a la mesa, tema ${tema === "dark" ? "oscuro" : "claro"}`, async ({
    page,
  }, info) => {
    test.skip(!MESA, "solo con la mesa encendida");
    test.skip(info.project.name !== "escritorio", "la mesa es para escritorio");
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("deckforge-theme", t);
      } catch {
        // sin almacenamiento: queda el tema por defecto
      }
    }, tema);

    await page.goto("/mesa/");
    await expect(page.getByRole("button", { name: "Crear sala" })).toBeVisible();
    await sinViolaciones(page, "/mesa/");

    await page.goto("/mesa/practica/");
    await page.getByRole("button", { name: /Para la mesa/ }).click();
    await expect(zona(page, "Mano")).toBeVisible();
    await sinViolaciones(page, "la mesa de practica");

    await zona(page, "Mano").getByRole("button").first().click();
    await expect(page.getByRole("menu")).toBeVisible();
    await sinViolaciones(page, "el menu de una carta");
  });
}
