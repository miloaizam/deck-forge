import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { createDeck, setQuantity, setStartingGold } from "../src/lib/deck";
import { buildCardIndex, isLegal, validateDeck } from "../src/lib/deck-rules";
import { conErratas } from "../src/lib/erratas";
import { cardSchema, type Deck } from "../src/lib/types";
import { sinViolaciones } from "./axe";
import {
  publicarDe,
  sesion,
  simularSupabase,
  USUARIO_A,
  USUARIO_B,
} from "./supabase-simulado";

/**
 * Las cuentas y la Comunidad, contra un Supabase simulado
 * (`supabase-simulado.ts`). Necesitan el sitio construido con la nube
 * encendida hacia ese simulado, y eso lo hace `pnpm run e2e:nube`; con el
 * build normal (nube apagada) corre solo la primera prueba, que comprueba
 * justo eso.
 */

const NUBE = process.env.E2E_NUBE === "1";

/** Las cartas del build, con las erratas aplicadas, como las ve el sitio. */
const cartas = (
  JSON.parse(
    readFileSync(path.join(__dirname, "..", "out", "data", "cards.json"), "utf8"),
  ) as unknown[]
) // se valida carta a carta en la linea siguiente
  .map((c) => conErratas(cardSchema.parse(c)));
const indice = buildCardIndex(cartas);

/**
 * Una baraja legal armada con el catalogo real: cinco Aliados de una raza a
 * tres copias, un Oro sin habilidad de oro inicial y 34 de otro. Se prueban
 * razas hasta dar con una que cumpla (Unicas y baneadas fuera).
 */
function barajaLegal(nombre: string): Deck {
  const oros = cartas.filter((c) => c.tipo === "Oro" && c.habilidad === "");
  const [oroA, oroB] = [oros[0], oros.find((o) => o.identidad !== oros[0].identidad)!];
  const razas = [...new Set(cartas.map((c) => c.raza).filter(Boolean))];
  for (const raza of razas) {
    const aliados = cartas.filter((c) => c.tipo === "Aliado" && c.raza === raza);
    let deck = createDeck(nombre);
    const usados = new Set<string>();
    for (const a of aliados) {
      if (usados.size === 5) break;
      if (usados.has(a.identidad)) continue;
      const prueba = setQuantity(deck, a.id, "principal", 3);
      const problemas = validateDeck(prueba, indice).filter(
        (i) =>
          i.code !== "tamano-principal" &&
          i.code !== "minimo-aliados" &&
          i.code !== "oro-inicial-falta",
      );
      if (problemas.length > 0) continue;
      deck = prueba;
      usados.add(a.identidad);
    }
    if (usados.size < 5) continue;
    deck = setQuantity(deck, oroA.id, "principal", 1);
    deck = setQuantity(deck, oroB.id, "principal", 34);
    deck = setStartingGold(deck, oroA.id);
    if (isLegal(validateDeck(deck, indice))) return deck;
  }
  throw new Error("no se pudo armar una baraja legal");
}

async function conSesion(page: Page, userId: string) {
  await page.addInitScript(
    ([clave, valor]) => {
      if (!localStorage.getItem(clave)) localStorage.setItem(clave, valor);
    },
    ["deckforge-sesion", sesion(userId)],
  );
}

async function conBarajas(page: Page, barajas: Deck[]) {
  await page.addInitScript(
    (sobre) => {
      if (!localStorage.getItem("deckforge-decks"))
        localStorage.setItem("deckforge-decks", sobre);
    },
    JSON.stringify({ v: 1, mazos: barajas }),
  );
}

test("sin cuenta no se pide nada a Supabase", async ({ page }) => {
  const pedidos: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("supabase.co")) pedidos.push(r.url());
  });
  await page.goto("/barajas/");
  await page.goto("/catalogo/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(pedidos).toEqual([]);
  // Apagada, ni el boton ni el enlace existen.
  if (!NUBE) {
    await expect(page.getByRole("link", { name: /cuenta/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Comunidad" })).toHaveCount(0);
  } else {
    await expect(page.getByRole("link", { name: "Entrar con tu cuenta" })).toBeVisible();
  }
});

test.describe("con la nube encendida", () => {
  test.skip(!NUBE, "necesita `pnpm run e2e:nube`");

  test("/cuenta sin sesion ofrece entrar con Google", async ({ page }) => {
    await simularSupabase(page);
    await page.goto("/cuenta/");
    await expect(page.getByRole("button", { name: "Entrar con Google" })).toBeVisible();
  });

  test("al entrar se juntan las barajas de aqui y las de la cuenta", async ({ page }) => {
    const s = await simularSupabase(page);
    const aqui = barajaLegal("Baraja de aqui");
    const alla = { ...barajaLegal("Baraja de alla"), id: "allaallaal" };
    s.barajas.push({
      user_id: USUARIO_A,
      id: alla.id,
      datos: alla,
      actualizado: alla.actualizado,
      borrada: false,
      publica: false,
      publicada_en: null,
      public_id: "10000000-0000-4000-8000-0000000000ff",
      afinidad: null,
      oculta: false,
      likes: 0,
      copias: 0,
    });
    await conBarajas(page, [aqui]);
    await conSesion(page, USUARIO_A);

    await page.goto("/barajas/");
    await expect(page.getByText("Se trajo 1 baraja de tu cuenta.").last()).toBeVisible();
    await expect(page.getByRole("link", { name: "Baraja de alla" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Baraja de aqui" })).toBeVisible();
    await expect
      .poll(() => s.barajas.filter((f) => f.user_id === USUARIO_A).length)
      .toBe(2);
  });

  test("publicar pide alias y la baraja sale en la Comunidad", async ({ page }) => {
    const s = await simularSupabase(page);
    const deck = barajaLegal("Para publicar");
    await conBarajas(page, [deck]);
    await conSesion(page, USUARIO_A);

    await page.goto(`/baraja/?m=${deck.id}`);
    await page.getByRole("button", { name: "Pública" }).click();
    await page.getByLabel(/Alias público/).fill("Milo_ñandú");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      page.getByText(`"Para publicar" publicada en la Comunidad.`).last(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Pública" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(s.perfiles.get(USUARIO_A)).toBe("Milo_ñandú");

    await page.goto("/comunidad/");
    await expect(page.getByRole("link", { name: "Para publicar" })).toBeVisible();
    await expect(page.getByText("Milo_ñandú")).toBeVisible();
  });

  test("una baraja que no cumple no se puede publicar", async ({ page }) => {
    await simularSupabase(page);
    const incompleta = setQuantity(
      createDeck("Incompleta"),
      cartas[0].id,
      "principal",
      1,
    );
    await conBarajas(page, [incompleta]);
    await conSesion(page, USUARIO_A);
    await page.goto(`/baraja/?m=${incompleta.id}`);
    await expect(page.getByRole("button", { name: "Pública" })).toBeDisabled();
    await expect(
      page.getByText("Solo se publican las barajas que cumplen."),
    ).toBeVisible();
  });

  test("like, guardar una copia y reportar la baraja de otro", async ({ page }) => {
    const s = await simularSupabase(page);
    const ajena = barajaLegal("Baraja ajena");
    const pid = publicarDe(s, USUARIO_B, "Otra_persona", ajena);
    await conSesion(page, USUARIO_A);

    await page.goto("/comunidad/");
    await page.getByRole("link", { name: "Baraja ajena" }).click();
    await expect(page.getByText("Otra_persona")).toBeVisible();

    const like = page.getByRole("button", { name: /Dar like/ });
    await like.click();
    await expect(page.getByRole("button", { name: /Quitar el like/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect.poll(() => s.barajas.find((f) => f.public_id === pid)?.likes).toBe(1);

    await page.getByRole("button", { name: "Guardar en mis barajas" }).click();
    await expect(page.getByText(/guardada en Mis barajas/).last()).toBeVisible();
    await expect.poll(() => s.barajas.find((f) => f.public_id === pid)?.copias).toBe(1);

    await page.getByRole("button", { name: "Reportar la baraja" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Es spam o publicidad").check();
    await dialogo.getByRole("button", { name: "Reportar" }).click();
    await expect(
      page.getByText("Reporte enviado. Gracias por avisar.").last(),
    ).toBeVisible();
    expect(s.reportes).toEqual([
      { user_id: USUARIO_A, baraja: pid, motivo: "spam", nota: "" },
    ]);
  });

  test("sin cuenta la Comunidad se ve, y el like invita a entrar", async ({ page }) => {
    const s = await simularSupabase(page);
    publicarDe(s, USUARIO_B, "Otra_persona", barajaLegal("Se ve sin cuenta"));
    await page.goto("/comunidad/");
    await page.getByRole("link", { name: "Se ve sin cuenta" }).click();
    await expect(
      page.getByRole("link", { name: /Entra con tu cuenta para dar like/ }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reportar la baraja" })).toHaveCount(0);
    expect(s.peticiones.every((p) => !p.includes("/rest/v1/barajas"))).toBe(true);
  });

  test("la moderacion oculta una baraja de la Comunidad", async ({ page }) => {
    const s = await simularSupabase(page);
    publicarDe(s, USUARIO_B, "Otra_persona", barajaLegal("Ocultable"));
    s.barajas[0].oculta = true;
    await page.goto("/comunidad/");
    await expect(page.getByText("Todavía no hay barajas públicas.")).toBeVisible();
  });

  test("cerrar sesion deja las barajas en el navegador", async ({ page }) => {
    await simularSupabase(page);
    const deck = barajaLegal("Se queda");
    await conBarajas(page, [deck]);
    await conSesion(page, USUARIO_A);
    await page.goto("/cuenta/");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("button", { name: "Entrar con Google" })).toBeVisible();
    await page.goto("/barajas/");
    await expect(page.getByRole("link", { name: "Se queda" })).toBeVisible();
  });

  test("accesibilidad de la cuenta y la Comunidad, en los dos temas", async ({
    page,
  }) => {
    const s = await simularSupabase(page);
    const propia = barajaLegal("Mi baraja publicable");
    const pid = publicarDe(s, USUARIO_B, "Otra_persona", barajaLegal("Baraja ajena"));
    await conBarajas(page, [propia]);
    await conSesion(page, USUARIO_A);
    for (const tema of ["dark", "light"]) {
      await page.addInitScript((t) => localStorage.setItem("deckforge-theme", t), tema);
      for (const ruta of [
        "/cuenta/",
        "/comunidad/",
        `/baraja/?p=${pid}`,
        `/baraja/?m=${propia.id}`,
        "/barajas/",
      ]) {
        await page.goto(ruta);
        await sinViolaciones(page, `${ruta} (${tema})`);
      }
    }
  });
});
