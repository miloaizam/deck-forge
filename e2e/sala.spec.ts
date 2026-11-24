import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Browser, type Page, type Route } from "@playwright/test";

import { createDeck, setQuantity, setStartingGold } from "../src/lib/deck";
import { buildCardIndex, isLegal, validateDeck } from "../src/lib/deck-rules";
import { conErratas } from "../src/lib/erratas";
import { cardSchema, type Deck } from "../src/lib/types";
import { entrarSimulado, USUARIO_A, USUARIO_B } from "./supabase-simulado";

/**
 * Las salas del 1v1 (GAME.md, sesion 4), con la mesa encendida
 * (`pnpm run e2e:mesa`). Las funciones de `supabase/mesa.sql` se imitan
 * aqui, en memoria y compartidas entre los navegadores de la prueba, por
 * encima del Supabase simulado de siempre (que no se toca): las rutas de
 * Playwright que se registran despues mandan. Que el rival no lea la fila
 * privada del otro lo prueba la SQL (`supabase/mesa.prueba.sql`); aqui, que
 * dos cuentas se encuentran, eligen baraja y una tercera no entra.
 */
const MESA = process.env.E2E_MESA === "1";
const USUARIO_C = "00000000-0000-4000-8000-00000000000c";

const cartas = (
  JSON.parse(
    readFileSync(path.join(__dirname, "..", "out", "data", "cards.json"), "utf8"),
  ) as unknown[]
) // se valida carta a carta en la linea siguiente
  .map((c) => conErratas(cardSchema.parse(c)));
const indice = buildCardIndex(cartas);

/** Una baraja que cumple en Estandar: 16 Aliados de una raza por 3, y Oros. */
function barajaLegal(nombre: string): Deck {
  const oros = cartas.filter((c) => c.tipo === "Oro" && c.habilidad === "");
  // El oro inicial va con UNA copia: el otro Oro tiene que ser otra carta.
  const [oroA, oroB] = [oros[0], oros.find((o) => o.identidad !== oros[0].identidad)!];
  const razas = [...new Set(cartas.map((c) => c.raza).filter(Boolean))];
  for (const raza of razas) {
    let deck = setStartingGold(createDeck(nombre), oroA.id);
    const vistas = new Set<string>();
    for (const a of cartas.filter((c) => c.tipo === "Aliado" && c.raza === raza)) {
      if (vistas.size === 16 || vistas.has(a.identidad)) continue;
      const prueba = setQuantity(deck, a.id, "principal", 3);
      const graves = validateDeck(prueba, indice).filter(
        (i) =>
          i.gravedad === "error" &&
          i.code !== "tamano-principal" &&
          i.code !== "minimo-aliados",
      );
      if (graves.length > 0) continue;
      deck = prueba;
      vistas.add(a.identidad);
    }
    deck = setQuantity(deck, oroB.id, "principal", 1);
    if (isLegal(validateDeck(deck, indice))) return deck;
  }
  throw new Error("no se pudo armar una baraja legal");
}

interface FilaSala {
  id: string;
  codigo: string;
  formato: string;
  mejor_de: number;
  estado: string;
  jugador_a: string;
  jugador_b: string | null;
  listo_a: boolean;
  listo_b: boolean;
}

/** Lo que guarda la base imitada, compartido por los tres navegadores. */
interface Base {
  salas: FilaSala[];
  privado: { mesa: string; jugador: string; estado: unknown }[];
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE",
};

const responder = (route: Route, cuerpo: unknown, status = 200) =>
  route.fulfill({
    status,
    headers: CORS,
    contentType: "application/json",
    body: cuerpo === undefined ? "" : JSON.stringify(cuerpo),
  });

/** Como devuelve `ver_mesa()` una fila. */
const vista = (s: FilaSala) => ({
  ...s,
  alias_a: null,
  alias_b: null,
  victorias_a: 0,
  victorias_b: 0,
  ganador: null,
  senal_a: null,
  senal_b: null,
  creada: null,
});

let siguiente = 0;

async function imitarMesa(page: Page, base: Base) {
  await page.route("https://*.supabase.co/rest/v1/**", async (route) => {
    const req = route.request();
    const ruta = new URL(req.url()).pathname.replace("/rest/v1/", "");
    const esMesa =
      /^rpc\/(crear_mesa|unirse_mesa|ver_mesa|mis_mesas|marcar_lista|latido_mesa|salir_mesa)$/.test(
        ruta,
      );
    if (!esMesa && !ruta.startsWith("mesas_privado")) return route.fallback();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const uid = (req.headers().authorization ?? "").match(/^Bearer token-(.+)$/)?.[1];
    if (!uid) return responder(route, { code: "MS002" }, 401);
    const cuerpo = (req.postDataJSON() ?? {}) as Record<string, string | boolean>; // la escribe el sitio
    const sala = base.salas.find((s) => s.id === cuerpo.p_mesa);
    const juega = sala && [sala.jugador_a, sala.jugador_b].includes(uid);

    switch (ruta.split("?")[0]) {
      case "rpc/crear_mesa": {
        const id = `20000000-0000-4000-8000-${String(++siguiente).padStart(12, "0")}`;
        // Del mismo alfabeto que la base: sin 0, 1, I, L ni O.
        const d = (siguiente % 8) + 2;
        const codigo = `MESA${d}${d}`;
        base.salas.push({
          id,
          codigo,
          formato: String(cuerpo.p_formato),
          mejor_de: Number(cuerpo.p_mejor_de),
          estado: "esperando",
          jugador_a: uid,
          jugador_b: null,
          listo_a: false,
          listo_b: false,
        });
        return responder(route, { id, codigo });
      }
      case "rpc/unirse_mesa": {
        const s = base.salas.find((x) => x.codigo === cuerpo.p_codigo);
        if (s && [s.jugador_a, s.jugador_b].includes(uid)) return responder(route, s.id);
        if (!s || s.jugador_b || s.estado !== "esperando") {
          return responder(route, { code: "MS001" }, 400);
        }
        s.jugador_b = uid;
        return responder(route, s.id);
      }
      case "rpc/ver_mesa":
        return responder(route, juega ? vista(sala) : null);
      case "rpc/mis_mesas":
        return responder(
          route,
          base.salas.filter((s) => [s.jugador_a, s.jugador_b].includes(uid)).map(vista),
        );
      case "rpc/latido_mesa":
        return responder(route, undefined, 204);
      case "rpc/marcar_lista": {
        if (!sala || !juega) return responder(route, { code: "MS004" }, 400);
        const tiene = base.privado.some((p) => p.mesa === sala.id && p.jugador === uid);
        if (cuerpo.p_lista && !tiene) return responder(route, { code: "MS006" }, 400);
        if (uid === sala.jugador_a) sala.listo_a = Boolean(cuerpo.p_lista);
        else sala.listo_b = Boolean(cuerpo.p_lista);
        if (sala.listo_a && sala.listo_b && sala.jugador_b) sala.estado = "jugando";
        return responder(route, undefined, 204);
      }
      case "mesas_privado": {
        if (req.method() === "GET") {
          // La politica de la base: cada uno lee solo su fila.
          const mesa = new URL(req.url()).searchParams.get("mesa")?.replace("eq.", "");
          return responder(
            route,
            base.privado
              .filter((p) => p.mesa === mesa && p.jugador === uid)
              .map((p) => ({ estado: p.estado })),
          );
        }
        // La politica de la base: solo tu propia fila, en una sala tuya.
        const s = base.salas.find((x) => x.id === cuerpo.mesa);
        if (cuerpo.jugador !== uid || !s || ![s.jugador_a, s.jugador_b].includes(uid)) {
          return responder(route, { code: "42501" }, 403);
        }
        base.privado = base.privado.filter(
          (p) => !(p.mesa === s.id && p.jugador === uid),
        );
        base.privado.push({ mesa: s.id, jugador: uid, estado: cuerpo.estado });
        return responder(route, undefined, 201);
      }
      default:
        return responder(route, { code: "42883" }, 404);
    }
  });
}

/**
 * Supabase Realtime de imitacion, con el protocolo JSON (vsn 1.0.0) que usa
 * el sitio: unirse a un canal, latidos, broadcast a los demas del canal y
 * presencia. Guarda todo lo que pasa por el, para revisar que no viaje
 * ninguna carta oculta. Solo deja entrar al canal de una sala a sus dos
 * jugadores, como las politicas de `mesa.sql`.
 */
interface Socket {
  uid: string;
  temas: Set<string>;
  enviar: (m: unknown) => void;
}

interface TiempoReal {
  sockets: Set<Socket>;
  presentes: Map<string, Map<string, string>>; // tema -> (lado -> uid)
  broadcasts: unknown[];
}

function tiempoReal(): TiempoReal {
  return { sockets: new Set(), presentes: new Map(), broadcasts: [] };
}

function estadoDePresencia(rt: TiempoReal, tema: string) {
  const lados = rt.presentes.get(tema) ?? new Map();
  return Object.fromEntries(
    [...lados.keys()].map((l) => [l, { metas: [{ phx_ref: l, lado: l }] }]),
  );
}

async function imitarTiempoReal(page: Page, uid: string, rt: TiempoReal, base: Base) {
  await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
    const yo: Socket = {
      uid,
      temas: new Set(),
      enviar: (m) => ws.send(JSON.stringify(m)),
    };
    rt.sockets.add(yo);
    const responder = (m: {
      topic: string;
      ref: string | null;
      join_ref?: string | null;
    }) =>
      yo.enviar({
        topic: m.topic,
        event: "phx_reply",
        payload: { status: "ok", response: { postgres_changes: [] } },
        ref: m.ref,
        join_ref: m.join_ref ?? null,
      });
    const aTodos = (tema: string, m: unknown, menos?: Socket) => {
      for (const s of rt.sockets) if (s !== menos && s.temas.has(tema)) s.enviar(m);
    };
    ws.onMessage((crudo) => {
      const m = JSON.parse(String(crudo)) as {
        topic: string;
        event: string;
        payload: { type?: string; event?: string; payload?: unknown };
        ref: string | null;
        join_ref?: string | null;
      }; // lo escribe realtime-js
      if (m.topic === "phoenix" || m.event === "access_token") return responder(m);
      if (m.event === "phx_join") {
        const sala = base.salas.find((x) => m.topic === `realtime:mesa:${x.id}`);
        if (!sala || ![sala.jugador_a, sala.jugador_b].includes(uid)) {
          return yo.enviar({
            topic: m.topic,
            event: "phx_reply",
            payload: { status: "error", response: { reason: "Unauthorized" } },
            ref: m.ref,
          });
        }
        yo.temas.add(m.topic);
        responder(m);
        yo.enviar({
          topic: m.topic,
          event: "presence_state",
          payload: estadoDePresencia(rt, m.topic),
          ref: null,
        });
        return;
      }
      if (m.event === "phx_leave") {
        yo.temas.delete(m.topic);
        return responder(m);
      }
      if (m.event === "broadcast") {
        rt.broadcasts.push(m.payload.payload);
        aTodos(
          m.topic,
          { topic: m.topic, event: "broadcast", payload: m.payload, ref: null },
          yo,
        );
        return;
      }
      if (m.event === "presence" && m.payload.type === "presence") {
        responder(m);
        const lado = (m.payload.payload as { lado: string }).lado; // lo manda el sitio
        const lados = rt.presentes.get(m.topic) ?? new Map<string, string>();
        lados.set(lado, uid);
        rt.presentes.set(m.topic, lados);
        aTodos(m.topic, {
          topic: m.topic,
          event: "presence_diff",
          payload: {
            joins: { [lado]: { metas: [{ phx_ref: lado, lado }] } },
            leaves: {},
          },
          ref: null,
        });
        return;
      }
      responder(m);
    });
    ws.onClose(() => rt.sockets.delete(yo));
  });
}

/** Un navegador aparte por cuenta, con su sesion, su baraja y la base compartida. */
async function jugador(
  browser: Browser,
  uid: string,
  base: Base,
  rt: TiempoReal = tiempoReal(),
): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await entrarSimulado(page, uid);
  await page.addInitScript(
    (sobre) => {
      if (!localStorage.getItem("deckforge-decks"))
        localStorage.setItem("deckforge-decks", sobre);
    },
    JSON.stringify({ v: 1, mazos: [barajaLegal("Para la sala")] }),
  );
  await imitarMesa(page, base);
  await imitarTiempoReal(page, uid, rt, base);
  return page;
}

/** El segundo en marcarse listo no ve «Estás listo»: la sala empieza en el acto. */
async function elegirBarajaYListo(page: Page, segundo = false) {
  await page.getByRole("button", { name: /^Baraja/ }).click();
  await page.getByRole("option", { name: "Para la sala" }).click();
  await page.getByRole("button", { name: "Estoy listo" }).click();
  await expect(
    page.getByText(
      segundo ? "Los dos están listos: la sala está en juego." : "Estás listo.",
    ),
  ).toBeVisible();
}

test("apagada, la sala dice que todavia no esta disponible", async ({ page }) => {
  test.skip(MESA, "este build la tiene encendida");
  await page.goto("/mesa/");
  await expect(page.getByText("Todavía no está disponible.")).toBeVisible();
});

test("dos cuentas se encuentran en una sala, eligen baraja y una tercera no entra", async ({
  browser,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "una vez basta");
  test.setTimeout(60_000);
  const base: Base = { salas: [], privado: [] };
  const rt = tiempoReal();

  // A crea la sala.
  const a = await jugador(browser, USUARIO_A, base, rt);
  await a.goto("/mesa/");
  await a.getByRole("button", { name: "Crear sala" }).click();
  await a.waitForURL(/\/mesa\/\?s=/);
  const titulo = await a.getByRole("heading", { level: 1 }).textContent();
  const codigo = titulo?.match(/Sala\s*([A-Z0-9]{6})/)?.[1] ?? "";
  expect(codigo).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
  await expect(a.getByText("Esperando rival…")).toBeVisible();

  // B entra con el enlace: el codigo llega escrito.
  const b = await jugador(browser, USUARIO_B, base, rt);
  await b.goto(`/mesa/?c=${codigo}`);
  await expect(b.getByRole("textbox", { name: "Código de la sala" })).toHaveValue(codigo);
  await b.getByRole("button", { name: "Unirse" }).click();
  await b.waitForURL(a.url());

  // A ve llegar a su rival sin recargar.
  await expect(a.getByText("Esperando rival…")).toBeHidden({ timeout: 10_000 });
  await expect(a.getByText("Invitado")).toBeVisible();

  // Los dos eligen una baraja que cumple y quedan listos.
  await elegirBarajaYListo(a);
  await elegirBarajaYListo(b, true);
  // Cada baraja quedo en la fila de su dueno, y solo ahi.
  expect(base.privado.map((p) => p.jugador).sort()).toEqual(
    [USUARIO_A, USUARIO_B].sort(),
  );

  // La mesa (sesion 5): cada uno su mitad abajo y la del rival arriba.
  const zona = (p: Page, nombre: string) =>
    p.getByRole("region", { name: new RegExp(`^${nombre}, \\d+ cartas?$`) });
  await expect(zona(a, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas", {
    timeout: 15_000,
  });
  await expect(zona(b, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas");
  await expect(zona(a, "Mano de Invitado")).toHaveAttribute(
    "aria-label",
    "Mano de Invitado, 8 cartas",
  );
  await expect(a.getByText("Invitado está conectado")).toBeVisible();
  // La mano del rival son dorsos: ningun boton con su nombre.
  await expect(zona(b, "Mano de Anfitrión").getByRole("button")).toHaveCount(0);

  // A juega una carta y B la ve llegar, con su nombre.
  const jugada = zona(a, "Mano").getByRole("button").first();
  const nombreJugada = await jugada.getAttribute("aria-label");
  await jugada.click();
  await a.getByRole("menuitem", { name: "Línea de Defensa" }).click();
  const defensaDeA = zona(b, "Línea de Defensa de Anfitrión");
  await expect(defensaDeA).toHaveAttribute(
    "aria-label",
    "Línea de Defensa de Anfitrión, 1 carta",
  );
  await expect(defensaDeA.getByRole("button").first()).toHaveAttribute(
    "aria-label",
    nombreJugada ?? "",
  );

  // B bota dos del Castillo de A: lo hace el navegador de A, y lo ven los dos.
  await b.getByRole("button", { name: /^Castillo de Anfitrión, 41 cartas/ }).click();
  await b.getByRole("menuitem", { name: "Botar…" }).click();
  await b.getByRole("button", { name: "Una más" }).click();
  await b.getByRole("button", { name: "Botar 2" }).click();
  await expect(zona(a, "Cementerio")).toHaveAttribute(
    "aria-label",
    "Cementerio, 2 cartas",
  );
  await expect(zona(b, "Cementerio de Anfitrión")).toHaveAttribute(
    "aria-label",
    "Cementerio de Anfitrión, 2 cartas",
  );
  const registroA = a
    .getByRole("complementary", { name: "Registro" })
    .getByRole("listitem");
  await expect(registroA.first()).toContainText(/Invitado: Botó .+ de tu Castillo\.$/);

  // B mira las 2 de arriba del Castillo de A: solo B las ve, y A sabe que mira.
  await b.getByRole("button", { name: /^Castillo de Anfitrión, 39 cartas/ }).click();
  await b.getByRole("menuitem", { name: "Mirar…" }).click();
  await b.getByRole("button", { name: "Una más" }).click();
  await b.getByRole("button", { name: "Mirar 2" }).click();
  const mirando = b.getByRole("dialog", { name: "Mirar las 2 de arriba" });
  await expect(mirando).toBeVisible();
  await expect(mirando.getByText(/^1\. /)).not.toHaveText("1. Carta");
  await expect(
    a.getByText("Invitado está mirando las 2 de arriba de tu Castillo."),
  ).toBeVisible();
  await mirando.getByRole("button", { name: "Dejar como estaban" }).click();
  await expect(a.getByText(/está mirando/)).toBeHidden();

  // Ningun estado que viajo lleva una carta que no ven los dos.
  for (const msg of rt.broadcasts as {
    t: string;
    mesa?: {
      fichas: Record<string, { cartaId: string | null; bocaAbajo: boolean }>;
      jugadores: { zonas: Record<string, string[]> }[];
      revelado: { para: string; uids: string[] } | null;
    };
  }[]) {
    if ((msg.t !== "estado" && msg.t !== "mitad") || !msg.mesa) continue;
    const { fichas, jugadores, revelado } = msg.mesa;
    const mostradas = revelado?.para === "todos" ? revelado.uids : [];
    for (const j of jugadores) {
      for (const z of ["mano", "castillo", "soporte"]) {
        for (const u of j.zonas[z]) {
          if (!mostradas.includes(u))
            expect(fichas[u].cartaId, `${msg.t} ${u}`).toBeNull();
        }
      }
    }
  }

  // C no puede entrar: la sala esta completa.
  const c = await jugador(browser, USUARIO_C, base, rt);
  await c.goto(`/mesa/?c=${codigo}`);
  await c.getByRole("button", { name: "Unirse" }).click();
  await expect(
    c
      .getByRole("alert")
      .filter({ hasText: "Esa sala no existe, ya está completa o ya empezó." }),
  ).toBeVisible();
  await c.goto(a.url());
  await expect(c.getByText("Esta sala no existe o no eres parte de ella.")).toBeVisible();
});
