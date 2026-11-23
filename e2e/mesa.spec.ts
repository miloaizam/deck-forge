import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { createDeck, setQuantity, setStartingGold } from "../src/lib/deck";
import type { Deck } from "../src/lib/types";
import { entrarSimulado } from "./supabase-simulado";

/**
 * La mesa de practica (GAME.md, sesion 2). Con la mesa apagada, que es el
 * build de siempre, solo se comprueba que lo diga. Encendida
 * (`pnpm run e2e:mesa`, que construye con `NEXT_PUBLIC_MESA_ACTIVA=1`), se
 * juega un turno moviendo cartas.
 */
const MESA = process.env.E2E_MESA === "1";

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
  await page.getByRole("button", { name: "Robar", exact: true }).click();
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
  await page.getByRole("button", { name: "Cerrar" }).filter({ visible: true }).click();

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
