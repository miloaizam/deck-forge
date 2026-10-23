import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { createDeck, setQuantity, setStartingGold } from "../src/lib/deck";
import { buildCardIndex, isLegal, validateDeck } from "../src/lib/deck-rules";
import { conErratas } from "../src/lib/erratas";
import { encodeDeck } from "../src/lib/deck-code";
import { cardSchema, type Deck } from "../src/lib/types";
import { sinViolaciones } from "./axe";
import {
  NUBE_ENCENDIDA,
  NUBE_SIMULADA,
  publicarDe,
  sesion,
  simularSupabase,
  USUARIO_A,
  USUARIO_B,
  type Simulado,
} from "./supabase-simulado";

/**
 * Las cuentas y la Comunidad, contra un Supabase simulado
 * (`supabase-simulado.ts`). Necesitan el sitio construido con la nube
 * encendida hacia ese simulado, y eso lo hace `pnpm run e2e:nube`. Con el
 * build normal corre solo la primera prueba: que un visitante sin cuenta no
 * le pida nada a Supabase, y que el boton de la cuenta este o no segun
 * `supabase/proyecto.json`.
 */

const NUBE = NUBE_SIMULADA;
const ENCENDIDA = NUBE_ENCENDIDA;

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
      // Una sola vez por pestana: si la prueba cierra sesion, no vuelve sola.
      if (sessionStorage.getItem("e2e-sesion")) return;
      sessionStorage.setItem("e2e-sesion", "1");
      localStorage.setItem(clave, valor);
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
  if (!ENCENDIDA) {
    await expect(page.getByRole("link", { name: /cuenta/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Comunidad" })).toHaveCount(0);
  } else {
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
    // Sin cuenta, la navbar no ofrece lo personal; la portada ofrece crearla.
    for (const nombre of ["Constructor", "Mis barajas", "Colección"]) {
      await expect(page.getByRole("link", { name: nombre, exact: true })).toHaveCount(0);
    }
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Iniciar sesión con Google" }),
    ).toBeVisible();
    // La unica excepcion: la cinta de la portada pide las cartas destacadas.
    expect(pedidos.filter((u) => !u.endsWith("/rest/v1/rpc/cartas_destacadas"))).toEqual(
      [],
    );
  }
});

test.describe("con la nube encendida", () => {
  test.skip(!NUBE, "necesita `pnpm run e2e:nube`");

  /** `n` barajas publicas de otro: Kuzuryu y un Oro sin habilidad en todas. */
  function publicarParaLaCinta(s: Simulado, n: number) {
    const otras = [
      "bu-001",
      "bu-002",
      "bu-003",
      "bu-004",
      "bu-005",
      "bu-006",
      "bu-007",
    ].concat(["bu-008", "bu-010", "bu-011", "bu-012", "bu-013", "hs-040"]);
    for (let i = 0; i < n; i++) {
      publicarDe(s, USUARIO_B, "Robo", {
        id: `cinta${String(i).padStart(5, "0")}`,
        nombre: `Cinta ${i}`,
        principal: [
          { id: "bu-009", n: 3 },
          { id: "ai-221", n: 20 },
          ...[0, 1, 2, 3, 4, 5].map((k) => ({ id: otras[(i + k) % otras.length], n: 1 })),
        ],
      });
    }
  }

  test("la cinta de la portada muestra lo mas usado en la Comunidad", async ({
    page,
  }) => {
    const s = await simularSupabase(page);
    publicarParaLaCinta(s, 10);
    await page.goto("/");
    const cinta = page.getByRole("region", { name: "Cartas destacadas" });
    await expect(cinta.getByText("Las más usadas en la Comunidad")).toBeVisible();
    const primera = cinta.getByRole("link").first();
    await expect(primera).toHaveAccessibleName("Ver en el catálogo: Kuzuryu");
    // El Oro sin habilidad esta en todas, pero no dice nada: no sale.
    await expect(cinta.getByRole("img", { name: "Lararium" })).toHaveCount(0);
    // Doce cartas, y la copia del bucle no cuenta para el teclado ni el lector.
    await expect(cinta.getByRole("link")).toHaveCount(12);
    // Con el cursor encima sigue corriendo; solo el foco del teclado la para.
    const pista = page.locator(".cinta-pista");
    const posicion = () => pista.evaluate((el) => getComputedStyle(el).transform);
    await cinta.hover();
    const antes = await posicion();
    await expect.poll(posicion).not.toBe(antes);
    await primera.focus();
    const quieta = await posicion();
    await page.waitForTimeout(300);
    expect(await posicion()).toBe(quieta);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/catalogo\/?\?q=Kuzuryu/);
  });

  test("con pocas barajas publicas la cinta se queda con el grupo fijo", async ({
    page,
  }) => {
    const s = await simularSupabase(page);
    publicarParaLaCinta(s, 9);
    const archivo: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/data/portada.json")) archivo.push(r.url());
    });
    await page.goto("/");
    await expect
      .poll(() => s.peticiones.some((p) => p.includes("cartas_destacadas")))
      .toBe(true);
    const cinta = page.getByRole("region", { name: "Cartas destacadas" });
    await expect(cinta.getByRole("link").first()).toHaveAccessibleName(
      "Ver en el catálogo: Leonardo",
    );
    await expect(cinta.getByText("Las más usadas", { exact: false })).toHaveCount(0);
    // Sin ranking que agrupar, el archivo de grupos no se baja.
    expect(archivo).toEqual([]);
  });

  test("/cuenta sin sesion ofrece entrar con Google", async ({ page }) => {
    await simularSupabase(page);
    await page.goto("/cuenta/");
    await expect(
      page.getByRole("button", { name: "Iniciar sesión con Google" }),
    ).toBeVisible();
  });

  test("volver de Google deja la sesion iniciada", async ({ page }) => {
    const s = await simularSupabase(page);
    await page.goto("/cuenta/");
    await page.getByRole("button", { name: "Iniciar sesión con Google" }).click();
    await expect(page.getByLabel("Alias")).toBeVisible();
    // El codigo se canjeo y salio de la barra de direcciones.
    expect(s.peticiones).toContain("POST /auth/v1/token");
    expect(new URL(page.url()).search).toBe("");
  });

  test("si Google falla al volver, se dice por que", async ({ page }) => {
    const s = await simularSupabase(page);
    s.errorDeGoogle = "Unable to exchange external code";
    await page.goto("/cuenta/");
    await page.getByRole("button", { name: "Iniciar sesión con Google" }).click();
    await expect(
      page.getByText("Detalle: Unable to exchange external code"),
    ).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
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
    await expect(
      page.getByText("Se cargó 1 baraja desde tu cuenta.").last(),
    ).toBeVisible();
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
    await page.getByLabel("Alias", { exact: true }).fill("Milo_ñandú");
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
      page.getByText("Para publicarla, la baraja tiene que ser legal."),
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
    await expect(page.getByText("Reporte enviado. Gracias.").last()).toBeVisible();
    expect(s.reportes).toEqual([
      { user_id: USUARIO_A, baraja: pid, motivo: "spam", nota: "" },
    ]);
  });

  test("una publica que deja de cumplir sale de la Comunidad al guardarla", async ({
    page,
  }) => {
    const s = await simularSupabase(page);
    const legal = barajaLegal("Publica que se rompe");
    publicarDe(s, USUARIO_A, "Milo", legal);
    // Aqui, editada despues: con una baneada en el side.
    const baneada = cartas.find((c) => c.nombre === "Ankou")!;
    const rota = {
      ...setQuantity(legal, baneada.id, "side", 1),
      actualizado: Date.now(),
    };
    await conBarajas(page, [rota]);
    await conSesion(page, USUARIO_A);

    await page.goto(`/constructor/?m=${rota.id}`);
    // Hasta que la cuenta dijo que es publica.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("deckforge-nube") ?? ""))
      .toContain('"publica":true');
    const panel =
      page.viewportSize()!.width >= 1024
        ? page.locator("aside")
        : (await page
            .getByRole("button", { name: /^Abrir el panel de la baraja/ })
            .click(),
          page.getByRole("dialog"));
    await panel.getByRole("button", { name: "Guardar baraja" }).click();
    await page.getByRole("button", { name: "Guardar igual" }).click();
    await expect(page).toHaveURL(/\/baraja\/\?m=/);

    await expect.poll(() => s.barajas.find((f) => f.id === rota.id)?.publica).toBe(false);
    await expect(page.getByText(/dejó de ser legal/).first()).toBeVisible();
    // El detalle tambien la revisa, y las vueltas siguientes cambian el
    // estado: el retiro se hace una sola vez.
    await page.waitForTimeout(3000);
    expect(s.peticiones.filter((p) => p === "PATCH /rest/v1/barajas")).toHaveLength(1);
  });

  test("abrir el detalle de una publica que dejo de cumplir la retira una vez", async ({
    page,
  }) => {
    // Editada en otro equipo: llega rota y el detalle es quien la ve. Antes,
    // cada vuelta de sincronizacion relanzaba el retiro (dos PATCH).
    const s = await simularSupabase(page);
    const legal = barajaLegal("Rota en otro equipo");
    publicarDe(s, USUARIO_A, "Milo", legal);
    const baneada = cartas.find((c) => c.nombre === "Ankou")!;
    const rota = {
      ...setQuantity(legal, baneada.id, "side", 1),
      actualizado: Date.now(),
    };
    await conBarajas(page, [rota]);
    await conSesion(page, USUARIO_A);

    await page.goto(`/baraja/?m=${rota.id}`);
    await expect.poll(() => s.barajas.find((f) => f.id === rota.id)?.publica).toBe(false);
    await page.waitForTimeout(3000);
    expect(s.peticiones.filter((p) => p === "PATCH /rest/v1/barajas")).toHaveLength(1);
  });

  test("una publica que cambio de afinidad la corrige una sola vez", async ({ page }) => {
    const s = await simularSupabase(page);
    const deck = barajaLegal("Afinidad vieja");
    publicarDe(s, USUARIO_A, "Milo", deck);
    s.barajas.find((f) => f.id === deck.id)!.afinidad = "raza:Ninguna";
    await conBarajas(page, [deck]);
    await conSesion(page, USUARIO_A);

    await page.goto(`/baraja/?m=${deck.id}`);
    await expect
      .poll(() => s.barajas.find((f) => f.id === deck.id)?.afinidad)
      .not.toBe("raza:Ninguna");
    // Las vueltas siguientes ya no la ven distinta.
    await page.waitForTimeout(3000);
    expect(s.peticiones.filter((p) => p === "PATCH /rest/v1/barajas")).toHaveLength(1);
  });

  test("si el cambio de version de la foto no entra, vuelve la anterior", async ({
    page,
  }) => {
    const s = await simularSupabase(page);
    s.perfiles.set(USUARIO_A, "Milo");
    const vieja = { tipo: "image/webp", bytes: Buffer.from("foto vieja") };
    s.archivos.set(USUARIO_A, vieja);
    s.avatares.set(USUARIO_A, 1700000000000);
    await conSesion(page, USUARIO_A);
    let intentos = 0;
    await page.route("https://*.supabase.co/rest/v1/perfiles**", (r) => {
      if (r.request().method() !== "PATCH") return r.fallback();
      intentos++;
      return r.fulfill({ status: 503, body: "{}" });
    });

    await page.goto("/cuenta/");
    await page.getByRole("button", { name: "Cambiar foto" }).click();
    await page
      .getByLabel("Elegir una foto de perfil")
      .setInputFiles(path.join(__dirname, "..", "public", "cards", "bu-001.webp"));
    await expect(page.getByText(/No se pudo guardar la foto/).last()).toBeVisible({
      timeout: 10_000,
    });
    // Perfil y archivo coinciden: los dos siguen en la foto de antes.
    expect(s.avatares.get(USUARIO_A)).toBe(1700000000000);
    expect(s.archivos.get(USUARIO_A)?.bytes.toString()).toBe("foto vieja");
    expect(intentos).toBe(3);
  });

  test("la foto de perfil se achica, se sube, se ve y se quita", async ({ page }) => {
    const s = await simularSupabase(page);
    const deck = barajaLegal("Con foto");
    await conBarajas(page, [deck]);
    await conSesion(page, USUARIO_A);
    s.perfiles.set(USUARIO_A, "Milo");

    await page.goto("/cuenta/");
    await page.getByRole("button", { name: "Poner foto" }).click();
    // Un arte de carta de 420 px de ancho, mas alto que ancho: hay que
    // recortarlo y achicarlo.
    await page
      .getByLabel("Elegir una foto de perfil")
      .setInputFiles(path.join(__dirname, "..", "public", "cards", "bu-001.webp"));
    await expect(page.getByText("Foto de perfil guardada.").last()).toBeVisible();

    const subida = s.archivos.get(USUARIO_A);
    expect(subida).toBeDefined();
    expect(["image/webp", "image/jpeg"]).toContain(subida!.tipo);
    expect(subida!.bytes.length).toBeLessThanOrEqual(50 * 1024);
    expect(s.avatares.get(USUARIO_A)).toBeGreaterThan(0);

    // En la navbar y en la cabecera de la cuenta, de 128x128.
    const enNavbar = page.getByRole("link", { name: "Tu cuenta" }).locator("img");
    await expect(enNavbar).toBeVisible();
    expect(await enNavbar.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(128);
    expect(await enNavbar.evaluate((i: HTMLImageElement) => i.naturalHeight)).toBe(128);
    await expect(page.getByRole("button", { name: "Cambiar foto" })).toBeVisible();

    // En la Comunidad, junto al alias; oculta por moderacion, ya no.
    publicarDe(s, USUARIO_A, "Milo", deck);
    await page.goto("/comunidad/");
    const tarjeta = page.getByRole("listitem").filter({ hasText: "Con foto" });
    await expect(tarjeta.locator("img[src*='/avatares/']")).toBeVisible();
    s.avatarOculto.add(USUARIO_A);
    await page.reload();
    await expect(tarjeta.getByText("Milo")).toBeVisible();
    await expect(tarjeta.locator("img[src*='/avatares/']")).toHaveCount(0);

    // Quitarla borra el archivo y la version.
    await page.goto("/cuenta/");
    await page.getByRole("button", { name: "Quitar foto" }).click();
    await expect(page.getByText("Foto de perfil quitada.").last()).toBeVisible();
    expect(s.archivos.has(USUARIO_A)).toBe(false);
    expect(s.avatares.has(USUARIO_A)).toBe(false);
    await expect(page.getByRole("button", { name: "Poner foto" })).toBeVisible();
  });

  test("sin alias no se puede poner foto", async ({ page }) => {
    await simularSupabase(page);
    await conSesion(page, USUARIO_A);
    await page.goto("/cuenta/");
    await expect(page.getByText("Elige un alias para poner una foto.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Poner foto" })).toHaveCount(0);
  });

  test("borrar la cuenta borra tambien la foto", async ({ page }) => {
    const s = await simularSupabase(page);
    await conSesion(page, USUARIO_A);
    s.perfiles.set(USUARIO_A, "Milo");
    s.avatares.set(USUARIO_A, 1700000000000);
    s.archivos.set(USUARIO_A, { tipo: "image/webp", bytes: Buffer.from("x") });
    await page.goto("/cuenta/");
    await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Borrar mi cuenta" })
      .click();
    await expect(page.getByText("Cuenta borrada.").last()).toBeVisible();
    expect(s.archivos.has(USUARIO_A)).toBe(false);
    const borrarFoto = s.peticiones.indexOf(
      `DELETE /storage/v1/object/avatares/${USUARIO_A}`,
    );
    const borrarCuenta = s.peticiones.indexOf("POST /rest/v1/rpc/borrar_mi_cuenta");
    expect(borrarFoto).toBeGreaterThan(-1);
    expect(borrarFoto).toBeLessThan(borrarCuenta);
  });

  test("la Comunidad se ordena por nombre desde el buscador", async ({ page }) => {
    const s = await simularSupabase(page);
    publicarDe(s, USUARIO_B, "Otra_persona", {
      ...barajaLegal("Zorros"),
      id: "zorroszorr",
    });
    publicarDe(s, USUARIO_B, "Otra_persona", {
      ...barajaLegal("Águilas"),
      id: "aguilasagu",
    });
    await page.goto("/comunidad/");
    const nombres = page.getByRole("list").getByRole("link");
    await expect(nombres.first()).toBeVisible();

    await page.getByRole("button", { name: /^Ordenar: Sin ordenar por nombre/ }).click();
    await expect(page).toHaveURL(/nombre=asc/);
    await expect(nombres).toHaveText(["Águilas", "Zorros"]);

    await page.getByRole("button", { name: /^Ordenar: Nombre, de la A a la Z/ }).click();
    await expect(page).toHaveURL(/nombre=desc/);
    await expect(nombres).toHaveText(["Zorros", "Águilas"]);
    // Los otros ordenes siguen en su fila, como antes.
    await expect(page.getByRole("button", { name: "Más likes" })).toBeVisible();
  });

  test("sin cuenta la Comunidad se ve, y el like invita a entrar", async ({ page }) => {
    const s = await simularSupabase(page);
    publicarDe(s, USUARIO_B, "Otra_persona", barajaLegal("Se ve sin cuenta"));
    await page.goto("/comunidad/");
    await page.getByRole("link", { name: "Se ve sin cuenta" }).click();
    await expect(
      page.getByRole("link", { name: /Inicia sesión para dar like/ }),
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

  test("cerrar sesion sube lo pendiente y borra lo del navegador", async ({ page }) => {
    const s = await simularSupabase(page);
    const deck = barajaLegal("Se va a la cuenta");
    await conBarajas(page, [deck]);
    await conSesion(page, USUARIO_A);
    await page.goto("/cuenta/");
    await expect.poll(() => s.barajas.some((f) => f.id === deck.id)).toBe(true);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(
      page.getByRole("button", { name: "Iniciar sesión con Google" }),
    ).toBeVisible();
    // En la cuenta sigue; en el navegador ya no.
    expect(s.barajas.find((f) => f.id === deck.id)?.borrada).toBe(false);
    const local = await page.evaluate(() => ({
      barajas: localStorage.getItem("deckforge-decks"),
      coleccion: localStorage.getItem("deckforge-coleccion"),
      nube: localStorage.getItem("deckforge-nube"),
    }));
    expect(local).toEqual({ barajas: null, coleccion: null, nube: null });
  });

  test("sin poder subir no se borra, y otra cuenta no lo hereda", async ({ page }) => {
    const s = await simularSupabase(page);
    const deck = barajaLegal("De A sin subir");
    await conBarajas(page, [deck]);
    await conSesion(page, USUARIO_A);
    await page.goto("/cuenta/");
    await expect.poll(() => s.barajas.some((f) => f.id === deck.id)).toBe(true);
    // Se edita y se corta la red antes de que suba.
    await page.route("https://*.supabase.co/rest/v1/barajas**", (r) => r.abort());
    await page.evaluate(
      ([d]) => {
        const sobre = JSON.parse(localStorage.getItem("deckforge-decks")!);
        sobre.mazos[0] = { ...d, nombre: "Editada sin red", actualizado: Date.now() };
        localStorage.setItem("deckforge-decks", JSON.stringify(sobre));
      },
      [deck],
    );
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(
      page.getByText(/No se pudo guardar en tu cuenta lo último/).last(),
    ).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("deckforge-decks"))).toContain(
      "Editada sin red",
    );

    // Entra OTRA cuenta en el mismo navegador: lo de A se borra sin subirse.
    await page.unroute("https://*.supabase.co/rest/v1/barajas**");
    await page.evaluate(
      ([clave, valor]) => localStorage.setItem(clave, valor),
      ["deckforge-sesion", sesion(USUARIO_B)],
    );
    await page.goto("/barajas/");
    await expect(page.getByRole("heading", { name: "Mis barajas" })).toBeVisible();
    // Hasta que la cuenta B termina su primera vuelta.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("deckforge-nube") ?? ""))
      .toContain(USUARIO_B);
    await expect(page.getByText("Editada sin red")).toHaveCount(0);
    expect(s.barajas.filter((f) => f.user_id === USUARIO_B)).toEqual([]);
    expect(s.barajas.find((f) => f.id === deck.id)?.user_id).toBe(USUARIO_A);
  });

  test("lo que se edita mientras sincroniza no se pisa", async ({ page }) => {
    const s = await simularSupabase(page);
    const aqui = barajaLegal("Aqui");
    // Una en la cuenta que no esta aqui: la vuelta reescribe la lista local.
    s.barajas.push({
      user_id: USUARIO_A,
      id: "nubenube01",
      datos: { ...barajaLegal("De la nube"), id: "nubenube01" },
      actualizado: 1,
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
    // La subida tarda: mientras viaja, se edita la de aqui.
    await page.route("https://*.supabase.co/rest/v1/barajas**", async (r) => {
      if (r.request().method() === "POST")
        await new Promise((ok) => setTimeout(ok, 1500));
      await r.fallback();
    });
    const subida = page.waitForRequest(
      (r) => r.method() === "POST" && r.url().includes("/rest/v1/barajas"),
    );
    await page.goto("/cuenta/");
    await subida;
    await page.evaluate(() => {
      const sobre = JSON.parse(localStorage.getItem("deckforge-decks")!);
      sobre.mazos = sobre.mazos.map((d: { nombre: string }) => ({
        ...d,
        nombre: "Editada durante la vuelta",
        actualizado: Date.now(),
      }));
      localStorage.setItem("deckforge-decks", JSON.stringify(sobre));
    });
    await page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/rest/v1/barajas"),
    );
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => localStorage.getItem("deckforge-decks"))).toContain(
      "Editada durante la vuelta",
    );
  });

  test("lo personal pide cuenta; lo compartido no", async ({ page }) => {
    // Cuatro paginas y una revision de axe: mas que los 30 s de siempre.
    test.setTimeout(60_000);
    await simularSupabase(page);
    await page.goto("/constructor/");
    await sinViolaciones(page, "pide cuenta");
    const deck = barajaLegal("Compartible");
    for (const [ruta, para] of [
      ["/constructor/", "armar tus barajas"],
      ["/barajas/", "ver tus barajas"],
      ["/coleccion/", "llevar tu colección"],
      [`/baraja/?m=${deck.id}`, "ver tus barajas"],
    ]) {
      await page.goto(ruta);
      await expect(
        page.getByRole("heading", { name: `Inicia sesión para ${para}` }),
      ).toBeVisible();
    }
    // Un enlace compartido y una coleccion compartida se abren sin cuenta.
    await page.goto(`/baraja/#d=${encodeDeck(deck)}`);
    await expect(page.getByRole("heading", { name: "Compartible" })).toBeVisible();
    await page.goto("/catalogo/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
