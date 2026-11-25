import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Browser, type Page, type Route } from "@playwright/test";

import { createDeck, setQuantity, setStartingGold } from "../src/lib/deck";
import { buildCardIndex, isLegal, validateDeck } from "../src/lib/deck-rules";
import { conErratas } from "../src/lib/erratas";
import { cardSchema, type Deck } from "../src/lib/types";
import { sinViolaciones } from "./axe";
import { conCspDeVerdad, cspPara } from "./csp";
import { mesaActiva } from "./mesa-activa";
import { entrarSimulado, USUARIO_A, USUARIO_B } from "./supabase-simulado";

/**
 * Las salas del 1v1 (GAME.md, sesiones 4 a 8), con la mesa encendida (el
 * build de siempre; apagada, `pnpm run e2e:mesa-apagada`). Las funciones de `supabase/mesa.sql` se imitan
 * aqui, en memoria y compartidas entre los navegadores de la prueba, por
 * encima del Supabase simulado de siempre (que no se toca): las rutas de
 * Playwright que se registran despues mandan. Que el rival no lea la fila
 * privada del otro lo prueba la SQL (`supabase/mesa.prueba.sql`); aqui, que
 * dos cuentas se encuentran, eligen baraja y una tercera no entra.
 */
const MESA = mesaActiva();
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
    if (!isLegal(validateDeck(deck, indice))) continue;
    // Un Mazo de Soporte de dos cartas, para cambiar entre juegos (sesion 7).
    for (const a of cartas.filter((c) => c.tipo === "Aliado" && c.raza === raza)) {
      if (vistas.has(a.identidad)) continue;
      const conSide = setQuantity(deck, a.id, "side", 2);
      if (isLegal(validateDeck(conSide, indice))) return conSide;
    }
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
  victorias_a: number;
  victorias_b: number;
  ganador: string | null;
  motivo: string | null;
  ronda: number;
  empates: number;
  declara: string | null;
  declarado: string | null;
  ultimo: string | null;
  rendido: boolean;
  /** La ultima senal de vida de cada jugador, en ms (sesion 6). */
  senal: Record<string, number>;
}

/** Lo que guarda la base imitada, compartido por los tres navegadores. */
interface Base {
  salas: FilaSala[];
  privado: { mesa: string; jugador: string; estado: unknown }[];
  /** La foto publica de cada sala (sesion 6). */
  publico: Map<string, { version: number; estado: unknown }>;
}

const baseNueva = (): Base => ({ salas: [], privado: [], publico: new Map() });

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
const fecha = (ms: number | undefined) => (ms ? new Date(ms).toISOString() : null);
const vista = ({ senal, ...s }: FilaSala) => ({
  ...s,
  alias_a: null,
  alias_b: null,
  senal_a: fecha(senal[s.jugador_a]),
  senal_b: s.jugador_b ? fecha(senal[s.jugador_b]) : null,
  creada: null,
  ahora: new Date().toISOString(),
});

/** Lo que hace `cerrar_juego` en `mesa.sql`: suma y, si alguien llego, termina. */
function cerrarJuego(base: Base, sala: FilaSala, ganador: string, rendido: boolean) {
  if (ganador === "a") sala.victorias_a += 1;
  if (ganador === "b") sala.victorias_b += 1;
  if (ganador === "empate") sala.empates += 1;
  Object.assign(sala, {
    ultimo: ganador,
    rendido,
    declara: null,
    declarado: null,
    listo_a: false,
    listo_b: false,
    estado: "entre_juegos",
  });
  base.publico.set(sala.id, { version: 0, estado: {} });
  const necesarias = Math.floor(sala.mejor_de / 2) + 1;
  if (sala.victorias_a >= necesarias || sala.victorias_b >= necesarias) {
    sala.estado = "terminada";
    sala.ganador = sala.victorias_a >= necesarias ? sala.jugador_a : sala.jugador_b;
    sala.motivo = rendido ? "rendicion" : "partidas";
    base.privado = base.privado.filter((p) => p.mesa !== sala.id);
  }
}

let siguiente = 0;

async function imitarMesa(page: Page, base: Base) {
  await page.route("https://*.supabase.co/rest/v1/**", async (route) => {
    const req = route.request();
    const ruta = new URL(req.url()).pathname.replace("/rest/v1/", "");
    const esMesa =
      /^rpc\/(crear_mesa|unirse_mesa|ver_mesa|mis_mesas|marcar_lista|latido_mesa|salir_mesa|guardar_mesa_publico|reclamar_abandono|declarar_resultado|responder_resultado|rendirse|abandonar_mesa)$/.test(
        ruta,
      );
    if (!esMesa && !/^mesas_(privado|publico)/.test(ruta)) return route.fallback();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const uid = (req.headers().authorization ?? "").match(/^Bearer token-(.+)$/)?.[1];
    if (!uid) return responder(route, { code: "MS002" }, 401);
    const cuerpo = (req.postDataJSON() ?? {}) as Record<
      string,
      string | boolean | number
    >; // la escribe el sitio
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
          victorias_a: 0,
          victorias_b: 0,
          ganador: null,
          motivo: null,
          ronda: 1,
          empates: 0,
          declara: null,
          declarado: null,
          ultimo: null,
          rendido: false,
          senal: { [uid]: Date.now() },
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
        s.senal[uid] = Date.now();
        return responder(route, s.id);
      }
      case "rpc/ver_mesa":
        return responder(route, juega ? vista(sala) : null);
      case "rpc/mis_mesas":
        return responder(
          route,
          base.salas
            .filter((s) => [s.jugador_a, s.jugador_b].includes(uid))
            // Como `mis_mesas()`: las terminadas ya no estan abiertas.
            .filter((s) => s.estado !== "terminada")
            .map(vista),
        );
      case "rpc/latido_mesa":
        if (sala && juega && sala.estado !== "terminada") sala.senal[uid] = Date.now();
        return responder(route, undefined, 204);
      case "rpc/guardar_mesa_publico": {
        if (!sala || !juega) return responder(route, { code: "MS004" }, 400);
        if (sala.estado !== "jugando" || Number(cuerpo.p_ronda) !== sala.ronda) {
          return responder(route, false);
        }
        const antes = base.publico.get(sala.id)?.version ?? 0;
        if (Number(cuerpo.p_version) <= antes) return responder(route, false);
        base.publico.set(sala.id, {
          version: Number(cuerpo.p_version),
          estado: cuerpo.p_estado,
        });
        return responder(route, true);
      }
      case "rpc/reclamar_abandono": {
        if (!sala || !juega || !sala.jugador_b) {
          return responder(route, { code: "MS004" }, 400);
        }
        if (!["jugando", "entre_juegos"].includes(sala.estado)) {
          return responder(route, { code: "MS005" }, 400);
        }
        const otro = uid === sala.jugador_a ? sala.jugador_b : sala.jugador_a;
        if (Date.now() - (sala.senal[otro] ?? 0) < 120_000) {
          return responder(route, { code: "MS007" }, 400);
        }
        sala.estado = "terminada";
        sala.ganador = uid;
        sala.motivo = "abandono";
        base.publico.set(sala.id, { version: 0, estado: {} });
        base.privado = base.privado.filter((p) => p.mesa !== sala.id);
        return responder(route, undefined, 204);
      }
      case "mesas_publico": {
        // Lo leen los dos jugadores de la sala, como la politica de la base.
        const mesa = new URL(req.url()).searchParams.get("mesa")?.replace("eq.", "");
        const s = base.salas.find((x) => x.id === mesa);
        const foto =
          s && [s.jugador_a, s.jugador_b].includes(uid) && base.publico.get(s.id);
        return responder(route, foto ? [foto] : []);
      }
      case "rpc/marcar_lista": {
        if (!sala || !juega) return responder(route, { code: "MS004" }, 400);
        if (!["esperando", "entre_juegos"].includes(sala.estado)) {
          return responder(route, { code: "MS005" }, 400);
        }
        const tiene = base.privado.some((p) => p.mesa === sala.id && p.jugador === uid);
        if (cuerpo.p_lista && !tiene) return responder(route, { code: "MS006" }, 400);
        if (uid === sala.jugador_a) sala.listo_a = Boolean(cuerpo.p_lista);
        else sala.listo_b = Boolean(cuerpo.p_lista);
        if (sala.listo_a && sala.listo_b && sala.jugador_b) {
          if (sala.estado === "entre_juegos") {
            sala.ronda += 1;
            base.publico.set(sala.id, { version: 0, estado: {} });
          }
          sala.estado = "jugando";
          sala.declara = null;
          sala.declarado = null;
        }
        return responder(route, undefined, 204);
      }
      case "rpc/declarar_resultado": {
        if (!sala || !juega || !sala.jugador_b) {
          return responder(route, { code: "MS004" }, 400);
        }
        if (sala.estado !== "jugando") return responder(route, { code: "MS008" }, 400);
        if (sala.declara && sala.declara !== uid) {
          return responder(route, { code: "MS009" }, 400);
        }
        sala.declara = uid;
        sala.declarado = String(cuerpo.p_ganador);
        return responder(route, undefined, 204);
      }
      case "rpc/responder_resultado": {
        if (!sala || !juega) return responder(route, { code: "MS004" }, 400);
        if (sala.estado !== "jugando") return responder(route, { code: "MS008" }, 400);
        if (!sala.declara || sala.declara === uid) {
          return responder(route, { code: "MS010" }, 400);
        }
        if (cuerpo.p_acepta) cerrarJuego(base, sala, sala.declarado ?? "empate", false);
        else {
          Object.assign(sala, {
            estado: "entre_juegos",
            ultimo: "anulado",
            rendido: false,
            declara: null,
            declarado: null,
            listo_a: false,
            listo_b: false,
          });
          base.publico.set(sala.id, { version: 0, estado: {} });
        }
        return responder(route, undefined, 204);
      }
      case "rpc/abandonar_mesa": {
        if (!sala || !juega || !sala.jugador_b) {
          return responder(route, { code: "MS004" }, 400);
        }
        if (!["jugando", "entre_juegos"].includes(sala.estado)) {
          return responder(route, { code: "MS005" }, 400);
        }
        Object.assign(sala, {
          estado: "terminada",
          ganador: uid === sala.jugador_a ? sala.jugador_b : sala.jugador_a,
          motivo: "retiro",
          declara: null,
          declarado: null,
        });
        base.publico.set(sala.id, { version: 0, estado: {} });
        base.privado = base.privado.filter((p) => p.mesa !== sala.id);
        return responder(route, undefined, 204);
      }
      case "rpc/rendirse": {
        if (!sala || !juega) return responder(route, { code: "MS004" }, 400);
        if (sala.estado !== "jugando") return responder(route, { code: "MS008" }, 400);
        cerrarJuego(base, sala, uid === sala.jugador_a ? "b" : "a", true);
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
  presentes: Map<string, Map<string, Socket>>; // tema -> (lado -> quien)
  broadcasts: unknown[];
  /** Cuantas uniones al canal responden con error antes de aceptar una. */
  fallarUniones: number;
  /** Las uniones que llegaron sin token (anonimas): con el arreglo, ninguna. */
  sinToken: number;
}

function tiempoReal(): TiempoReal {
  return {
    sockets: new Set(),
    presentes: new Map(),
    broadcasts: [],
    fallarUniones: 0,
    sinToken: 0,
  };
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
        payload: {
          type?: string;
          event?: string;
          payload?: unknown;
          access_token?: string;
        };
        ref: string | null;
        join_ref?: string | null;
      }; // lo escribe realtime-js
      if (m.topic === "phoenix" || m.event === "access_token") return responder(m);
      if (m.event === "phx_join") {
        const sala = base.salas.find((x) => m.topic === `realtime:mesa:${x.id}`);
        // Sin token, Realtime trata la union como anonima y la politica del
        // canal privado la rechaza: lo mismo aqui (la carrera del 25-11-2026).
        const conToken = typeof m.payload.access_token === "string";
        if (!conToken) rt.sinToken += 1;
        const falla = rt.fallarUniones > 0;
        if (falla) rt.fallarUniones -= 1;
        if (
          falla ||
          !conToken ||
          !sala ||
          ![sala.jugador_a, sala.jugador_b].includes(uid)
        ) {
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
        const lados = rt.presentes.get(m.topic) ?? new Map<string, Socket>();
        lados.set(lado, yo);
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
    ws.onClose(() => {
      rt.sockets.delete(yo);
      // Quien se va deja la presencia de sus canales, como Realtime.
      for (const tema of yo.temas) {
        const lados = rt.presentes.get(tema);
        for (const [lado, quien] of lados ?? []) {
          // Al recargar, el socket nuevo puede llegar antes de que cierre el viejo.
          if (quien !== yo) continue;
          lados?.delete(lado);
          aTodos(tema, {
            topic: tema,
            event: "presence_diff",
            payload: {
              joins: {},
              leaves: { [lado]: { metas: [{ phx_ref: lado, lado }] } },
            },
            ref: null,
          });
        }
      }
    });
  });
}

/** Un navegador aparte por cuenta, con su sesion, su baraja y la base compartida. */
async function jugador(
  browser: Browser,
  uid: string,
  base: Base,
  rt: TiempoReal = tiempoReal(),
  tema?: "dark" | "light",
  csp = false,
): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await entrarSimulado(page, uid);
  if (tema) {
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("deckforge-theme", t);
      } catch {
        // sin almacenamiento: queda el tema por defecto
      }
    }, tema);
  }
  await page.addInitScript(
    (sobre) => {
      if (!localStorage.getItem("deckforge-decks"))
        localStorage.setItem("deckforge-decks", sobre);
    },
    JSON.stringify({ v: 1, mazos: [barajaLegal("Para la sala")] }),
  );
  await imitarMesa(page, base);
  await imitarTiempoReal(page, uid, rt, base);
  // Va al final: las rutas registradas despues se miran primero.
  if (csp) await conCspDeVerdad(page);
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

/** Una zona de la mesa por su nombre, sea cual sea su cuenta. */
const zona = (p: Page, nombre: string) =>
  p.getByRole("region", { name: new RegExp(`^${nombre}, \\d+ cartas?$`) });

/**
 * A crea una sala, B entra con el enlace, los dos eligen baraja y la mesa
 * arranca con 8 cartas en cada mano.
 */
async function empezarPartida(
  browser: Browser,
  tema?: "dark" | "light",
  alAbrirLaSala?: (a: Page) => Promise<void>,
  fallarUniones = 0,
) {
  const base = baseNueva();
  const rt = tiempoReal();
  rt.fallarUniones = fallarUniones;

  // A crea la sala.
  const a = await jugador(browser, USUARIO_A, base, rt, tema);
  await a.goto("/mesa/");
  await a.getByRole("button", { name: "Crear sala" }).click();
  await a.waitForURL(/\/mesa\/\?s=/);
  const titulo = await a.getByRole("heading", { level: 1 }).textContent();
  const codigo = titulo?.match(/Sala\s*([A-Z0-9]{6})/)?.[1] ?? "";
  expect(codigo).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
  await expect(a.getByText("Esperando rival…")).toBeVisible();
  await alAbrirLaSala?.(a);

  // B entra con el enlace: el codigo llega escrito.
  const b = await jugador(browser, USUARIO_B, base, rt, tema);
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
  await expect(zona(a, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas", {
    timeout: 15_000,
  });
  await expect(zona(b, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas");
  return { a, b, base, rt, codigo };
}

/** A juega la primera carta de su mano en su Linea de Defensa; devuelve su nombre. */
async function jugarADefensa(a: Page, b: Page, enDefensa: number): Promise<string> {
  const jugada = zona(a, "Mano").getByRole("button").first();
  const nombre = (await jugada.getAttribute("aria-label")) ?? "";
  await jugada.click();
  await a.getByRole("menuitem", { name: "Línea de Defensa" }).click();
  const total = `${enDefensa} carta${enDefensa === 1 ? "" : "s"}`;
  await expect(zona(b, "Línea de Defensa de Anfitrión")).toHaveAttribute(
    "aria-label",
    `Línea de Defensa de Anfitrión, ${total}`,
  );
  return nombre;
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
  const { a, b, base, rt, codigo } = await empezarPartida(browser);
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

  // A busca en su Castillo sin mostrar: B solo sabe que busco.
  await a.getByRole("button", { name: /^Castillo, 39 cartas/ }).click();
  await a.getByRole("menuitem", { name: "Buscar", exact: true }).click();
  const buscando = a.getByRole("dialog", { name: "Buscar en el Castillo" });
  await buscando.getByRole("listitem").first().getByRole("button").click();
  await buscando.getByRole("button", { name: "Tomar", exact: true }).click();
  await expect(zona(b, "Mano de Anfitrión")).toHaveAttribute(
    "aria-label",
    "Mano de Anfitrión, 8 cartas",
  );
  const registroB = b
    .getByRole("complementary", { name: "Registro" })
    .getByRole("listitem");
  await expect(registroB.first()).toContainText(
    /Anfitrión: Buscó una carta en .*Castillo\. Barajó el Castillo\.$/,
  );

  // Ningun estado que viajo lleva una carta que no ven los dos.
  for (const msg of rt.broadcasts as {
    t: string;
    mesa?: {
      fichas: Record<string, { cartaId: string | null; bocaAbajo: boolean }>;
      jugadores: { zonas: Record<string, string[]> }[];
      revelado: { para: string; uids: string[] } | null;
      registro: { tipo: string; detalle?: string; cartas: (string | null)[] }[];
    };
  }[]) {
    if ((msg.t !== "estado" && msg.t !== "mitad") || !msg.mesa) continue;
    const { fichas, jugadores, revelado, registro } = msg.mesa;
    // La busqueda sin mostrar tampoco nombra la carta en el registro.
    for (const e of registro.filter(
      (x) => x.tipo === "buscar" && x.detalle !== "mostrar",
    )) {
      expect(
        e.cartas.every((c) => !c),
        "una busqueda oculta nombro su carta",
      ).toBe(true);
    }
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

  // Ninguna union al canal salio sin el token de la sesion.
  expect(rt.sinToken).toBe(0);

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

test("al recargar en medio de un juego, la mesa vuelve igual y se sigue jugando", async ({
  browser,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "una vez basta");
  test.setTimeout(60_000);
  const { a, b, base } = await empezarPartida(browser);
  const sala = base.salas[0];

  const jugada = await jugarADefensa(a, b, 1);
  // La foto se guarda al quedar quieta la mesa: la version 1 es el reparto.
  await expect
    .poll(() => base.publico.get(sala.id)?.version ?? 0, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(2);

  await a.reload();
  await expect(zona(a, "Mano")).toHaveAttribute("aria-label", "Mano, 7 cartas", {
    timeout: 15_000,
  });
  const defensa = zona(a, "Línea de Defensa");
  await expect(defensa).toHaveAttribute("aria-label", "Línea de Defensa, 1 carta");
  await expect(defensa.getByRole("button").first()).toHaveAttribute("aria-label", jugada);
  await expect(zona(a, "Mano de Invitado")).toHaveAttribute(
    "aria-label",
    "Mano de Invitado, 8 cartas",
  );
  await expect(a.getByText("Invitado está conectado")).toBeVisible();

  // Y la partida sigue: A juega otra y B la ve.
  await jugarADefensa(a, b, 2);
  await expect(zona(a, "Línea de Defensa")).toHaveAttribute(
    "aria-label",
    "Línea de Defensa, 2 cartas",
  );
});

test("si el rival no vuelve en dos minutos, la serie es de quien siguio conectado", async ({
  browser,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "una vez basta");
  test.setTimeout(60_000);
  const { a, b, base } = await empezarPartida(browser);
  const sala = base.salas[0];
  await jugarADefensa(a, b, 1);

  // B cierra su navegador: A ve la cuenta regresiva.
  await b.context().close();
  await expect(
    a.getByText(/^Invitado se desconectó\. Si no vuelve en \d:\d\d, la serie es tuya\.$/),
  ).toBeVisible({ timeout: 10_000 });
  expect(sala.estado).toBe("jugando");

  // Sin rival que le conteste, A recarga y la mesa sale de la foto guardada.
  await expect
    .poll(() => base.publico.get(sala.id)?.version ?? 0, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(2);
  await a.reload();
  await expect(zona(a, "Mano")).toHaveAttribute("aria-label", "Mano, 7 cartas", {
    timeout: 15_000,
  });
  await expect(zona(a, "Línea de Defensa")).toHaveAttribute(
    "aria-label",
    "Línea de Defensa, 1 carta",
  );
  await expect(a.getByText(/^Invitado se desconectó\./)).toBeVisible();

  // Para no esperar dos minutos de verdad, la base da por vieja la senal de B.
  sala.senal[USUARIO_B] = Date.now() - 125_000;
  await expect(
    a.getByRole("heading", { name: "Ganaste la serie: Invitado abandonó" }),
  ).toBeVisible({ timeout: 15_000 });
  expect(sala.estado).toBe("terminada");
  expect(sala.ganador).toBe(USUARIO_A);
  expect(sala.motivo).toBe("abandono");
  // Sin historial: la partida se borro.
  expect(base.publico.get(sala.id)?.estado).toEqual({});
  expect(base.privado.filter((p) => p.mesa === sala.id)).toEqual([]);

  // Si B vuelve, ve que perdio.
  const b2 = await jugador(browser, USUARIO_B, base);
  await b2.goto(a.url());
  await expect(
    b2.getByRole("heading", { name: "Perdiste la serie por abandono" }),
  ).toBeVisible();
});

/** Abre «Terminar juego» y elige como termino. */
async function terminarJuego(
  p: Page,
  eleccion: "Gané" | "Perdí" | "Empate" | "Rendirme",
) {
  await p.getByRole("button", { name: "Terminar juego" }).click();
  await p
    .getByRole("dialog", { name: "Terminar el juego" })
    .getByRole("button", { name: eleccion })
    .click();
}

test("una serie al mejor de 3 de principio a fin: declarar, anular, side y rendirse", async ({
  browser,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "una vez basta");
  test.setTimeout(90_000);
  const { a, b, base } = await empezarPartida(browser);
  const sala = base.salas[0];
  await expect(a.getByLabel("Marcador")).toHaveText("Juego 1 · Tú 0 – 0 Invitado");

  // Juego 1: A declara que gano y B lo confirma.
  await jugarADefensa(a, b, 1);
  await terminarJuego(a, "Gané");
  await expect(
    a.getByText("Declaraste que ganaste. Esperando a que Invitado lo confirme."),
  ).toBeVisible();
  const pregunta = b
    .getByRole("alert")
    .filter({ hasText: "Anfitrión declara que ganó este juego. ¿Estás de acuerdo?" });
  await expect(pregunta).toBeVisible({ timeout: 10_000 });
  await pregunta.getByRole("button", { name: "Sí, de acuerdo" }).click();

  // Entre juegos: el marcador y como termino, dicho a cada uno.
  await expect(a.getByRole("heading", { name: "Tú 1 – 0 Invitado" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(a.getByText("Ganaste el juego.")).toBeVisible();
  await expect(b.getByRole("heading", { name: "Tú 0 – 1 Anfitrión" })).toBeVisible();
  await expect(b.getByText("Anfitrión ganó el juego.")).toBeVisible();

  // B cambia una carta con su side: una por otra.
  await b.getByRole("button", { name: /^Sale del Castillo/ }).click();
  const elegible = (p: Page) =>
    p
      .locator('[role="option"]:not([aria-disabled="true"])')
      .filter({ visible: true, hasNotText: "Elige una carta" });
  await elegible(b).first().click();
  // La lista se va con una animacion: hasta que no se fue, sus opciones siguen ahi.
  await expect(elegible(b)).toHaveCount(0);
  await b.getByRole("button", { name: /^Entra del Soporte/ }).click();
  const entra = elegible(b).first();
  const entraNombre = ((await entra.textContent()) ?? "").replace(/×\d+$/, "").trim();
  await entra.click();
  await b.getByRole("button", { name: "Cambiar", exact: true }).click();
  await expect(b.getByText(`Entran: 1× ${entraNombre}`)).toBeVisible();
  await b.getByRole("button", { name: "Listo para el juego 2" }).click();
  await expect(a.getByText("Invitado: listo")).toBeVisible({ timeout: 10_000 });
  await a.getByRole("button", { name: "Listo para el juego 2" }).click();

  // Juego 2: otra mesa, la baraja de B con su cambio, y su Soporte se cuenta.
  await expect(a.getByLabel("Marcador")).toHaveText("Juego 2 · Tú 1 – 0 Invitado", {
    timeout: 15_000,
  });
  await expect(zona(a, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas", {
    timeout: 15_000,
  });
  await expect(zona(b, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas");
  await expect(zona(a, "Mazo de Soporte de Invitado")).toHaveAttribute(
    "aria-label",
    "Mazo de Soporte de Invitado, 2 cartas",
  );
  await expect(zona(a, "Línea de Defensa")).toHaveAttribute(
    "aria-label",
    "Línea de Defensa, 0 cartas",
  );
  const deB = base.privado.find((p) => p.jugador === USUARIO_B)?.estado as {
    baraja: Deck;
    actual: Deck;
  }; // lo escribio el sitio
  expect(JSON.stringify(deB.actual.principal)).not.toEqual(
    JSON.stringify(deB.baraja.principal),
  );

  // A declara que gano; B no esta de acuerdo: el juego se anula y se repite.
  await terminarJuego(a, "Gané");
  const otra = b.getByRole("alert").filter({ hasText: "¿Estás de acuerdo?" });
  await otra.getByRole("button", { name: "No estoy de acuerdo" }).click();
  await b.getByRole("button", { name: "Anular el juego" }).click();
  await expect(
    a.getByText(
      "No hubo acuerdo sobre el resultado: el juego se anula y se juega de nuevo.",
    ),
  ).toBeVisible({ timeout: 10_000 });
  await expect(a.getByRole("heading", { name: "Tú 1 – 0 Invitado" })).toBeVisible();
  // El cambio del side sigue para el juego repetido.
  await expect(b.getByText(`Entran: 1× ${entraNombre}`)).toBeVisible();
  await a.getByRole("button", { name: "Listo para el juego 2" }).click();
  await b.getByRole("button", { name: "Listo para el juego 2" }).click();

  // El juego 2 de nuevo: B se rinde. Es el que decide: la serie es de A.
  await expect(zona(b, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas", {
    timeout: 15_000,
  });
  await terminarJuego(b, "Rendirme");
  await expect(a.getByRole("heading", { name: "Ganaste la serie 2 – 0" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(a.getByText("Invitado se rindió en el último juego.")).toBeVisible();
  await expect(b.getByRole("heading", { name: "Perdiste la serie 0 – 2" })).toBeVisible();
  await expect(b.getByText("Te rendiste en el último juego.")).toBeVisible();
  expect(sala.estado).toBe("terminada");
  expect(sala.motivo).toBe("rendicion");
  expect(sala.ronda).toBe(3);
  // Sin historial: la partida se borro.
  expect(base.privado.filter((p) => p.mesa === sala.id)).toEqual([]);
});

test("entre juegos, si el rival no vuelve en dos minutos, la serie es del que se quedo", async ({
  browser,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "una vez basta");
  test.setTimeout(60_000);
  const { a, b, base } = await empezarPartida(browser);
  const sala = base.salas[0];

  // Juego 1: B se rinde. Quedan entre juegos.
  await terminarJuego(b, "Rendirme");
  await expect(a.getByRole("heading", { name: "Tú 1 – 0 Invitado" })).toBeVisible({
    timeout: 10_000,
  });

  // B cierra su navegador. Aqui no hay canal: cuenta su ultima senal, que la
  // base imitada envejece para no esperar de verdad.
  await b.context().close();
  sala.senal[USUARIO_B] = Date.now() - 100_000;
  await expect(
    a.getByText(/^Invitado se desconectó\. Si no vuelve en \d:\d\d, la serie es tuya\.$/),
  ).toBeVisible({ timeout: 10_000 });
  expect(sala.estado).toBe("entre_juegos");

  sala.senal[USUARIO_B] = Date.now() - 125_000;
  await expect(
    a.getByRole("heading", { name: "Ganaste la serie: Invitado abandonó" }),
  ).toBeVisible({ timeout: 15_000 });
  expect(sala.motivo).toBe("abandono");
  expect(base.privado.filter((p) => p.mesa === sala.id)).toEqual([]);
});

for (const tema of ["dark", "light"] as const) {
  test(`@a11y la sala, la mesa en linea, el resultado, entre juegos y el final, tema ${tema === "dark" ? "oscuro" : "claro"}`, async ({
    browser,
  }, info) => {
    test.skip(!MESA, "solo con la mesa encendida");
    test.skip(info.project.name !== "escritorio", "una vez basta");
    test.setTimeout(120_000);
    const { a, b } = await empezarPartida(browser, tema, (a) =>
      sinViolaciones(a, "la sala abierta"),
    );

    await jugarADefensa(a, b, 1);
    await sinViolaciones(a, "la mesa en linea");

    await a.getByRole("button", { name: "Terminar juego" }).click();
    await expect(a.getByRole("dialog", { name: "Terminar el juego" })).toBeVisible();
    await sinViolaciones(a, "terminar el juego");
    await a
      .getByRole("dialog", { name: "Terminar el juego" })
      .getByRole("button", { name: "Gané" })
      .click();

    const pregunta = b.getByRole("alert").filter({ hasText: "¿Estás de acuerdo?" });
    await expect(pregunta).toBeVisible({ timeout: 10_000 });
    await sinViolaciones(b, "el resultado declarado");
    await pregunta.getByRole("button", { name: "Sí, de acuerdo" }).click();

    await expect(b.getByRole("heading", { name: "Tú 0 – 1 Anfitrión" })).toBeVisible({
      timeout: 10_000,
    });
    await sinViolaciones(b, "entre juegos");
    await b.getByRole("button", { name: "Abandonar la serie" }).click();
    await expect(b.getByRole("dialog", { name: "¿Abandonar la serie?" })).toBeVisible();
    await sinViolaciones(b, "abandonar la serie");
    await b.getByRole("button", { name: "Cancelar" }).filter({ visible: true }).click();

    // Juego 2: B se rinde y A gana la serie.
    await b.getByRole("button", { name: "Listo para el juego 2" }).click();
    await a.getByRole("button", { name: "Listo para el juego 2" }).click();
    await expect(zona(b, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas", {
      timeout: 15_000,
    });
    await terminarJuego(b, "Rendirme");
    await expect(a.getByRole("heading", { name: "Ganaste la serie 2 – 0" })).toBeVisible({
      timeout: 10_000,
    });
    await sinViolaciones(a, "la serie terminada");
  });
}

test("se conecta a la mesa aunque las primeras uniones al canal fallen", async ({
  browser,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "una vez basta");
  test.setTimeout(60_000);
  // Las dos primeras uniones al canal fallan (una de cada jugador, o las
  // dos del primero que llega): la mesa lo reintenta sola.
  const { a, b } = await empezarPartida(browser, undefined, undefined, 2);
  await expect(zona(a, "Mano de Invitado")).toHaveAttribute(
    "aria-label",
    "Mano de Invitado, 8 cartas",
  );
  await expect(a.getByText("No se pudo conectar a la mesa.")).toBeHidden();
  await expect(b.getByText("No se pudo conectar a la mesa.")).toBeHidden();
  await jugarADefensa(a, b, 1);
});

test("abandonar la serie se la da al rival y cierra la sala para los dos", async ({
  browser,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "una vez basta");
  test.setTimeout(60_000);
  const { a, b, base, codigo } = await empezarPartida(browser);
  const sala = base.salas[0];
  await jugarADefensa(a, b, 1);

  await a.getByRole("button", { name: "Abandonar la serie" }).click();
  const confirmar = a.getByRole("dialog", { name: "¿Abandonar la serie?" });
  await expect(confirmar).toContainText(
    "La serie es para Invitado y la sala se cierra para los dos.",
  );
  await confirmar.getByRole("button", { name: "Abandonar la serie" }).click();

  await expect(a.getByRole("heading", { name: "Abandonaste la serie" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    b.getByRole("heading", { name: "Ganaste la serie: Anfitrión abandonó" }),
  ).toBeVisible({ timeout: 10_000 });
  expect(sala.estado).toBe("terminada");
  expect(sala.motivo).toBe("retiro");
  expect(sala.ganador).toBe(USUARIO_B);
  expect(base.privado.filter((p) => p.mesa === sala.id)).toEqual([]);

  // Ya no esta entre las salas abiertas.
  await a.goto("/mesa/");
  await expect(a.getByRole("button", { name: "Crear sala" })).toBeVisible();
  await a.waitForLoadState("networkidle");
  await expect(a.getByText(codigo)).toHaveCount(0);
});

test("entrando desde la navbar, con la CSP de Cloudflare, los dos se conectan", async ({
  browser,
}, info) => {
  test.skip(!MESA, "solo con la mesa encendida");
  test.skip(info.project.name !== "escritorio", "una vez basta");
  test.setTimeout(90_000);
  const base = baseNueva();
  const rt = tiempoReal();
  const bloqueos: string[] = [];
  const vigilar = (p: Page) =>
    p.on("console", (m) => {
      if (/Content Security Policy|Refused to connect/.test(m.text()))
        bloqueos.push(m.text());
    });

  // Los dos entran al sitio por el catalogo y llegan a la mesa por la navbar:
  // el router de Next cambia la URL sin cambiar de documento ni de CSP.
  const a = await jugador(browser, USUARIO_A, base, rt, undefined, true);
  vigilar(a);
  await a.goto("/catalogo/");
  await a.getByRole("link", { name: "Mesa", exact: true }).click();
  await a.getByRole("button", { name: "Crear sala" }).click();
  await a.waitForURL(/\/mesa\/\?s=/);
  const titulo = await a.getByRole("heading", { level: 1 }).textContent();
  const codigo = titulo?.match(/Sala\s*([A-Z0-9]{6})/)?.[1] ?? "";

  const b = await jugador(browser, USUARIO_B, base, rt, undefined, true);
  vigilar(b);
  await b.goto("/catalogo/");
  await b.getByRole("link", { name: "Mesa", exact: true }).click();
  await b.getByRole("textbox", { name: "Código de la sala" }).fill(codigo);
  await b.getByRole("button", { name: "Unirse" }).click();
  await b.waitForURL(/\/mesa\/\?s=/);

  await elegirBarajaYListo(a);
  await elegirBarajaYListo(b, true);
  await expect(zona(a, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas", {
    timeout: 20_000,
  });
  await expect(zona(b, "Mano")).toHaveAttribute("aria-label", "Mano, 8 cartas");
  await expect(a.getByText("Invitado está conectado")).toBeVisible();
  await expect(b.getByText("Anfitrión está conectado")).toBeVisible();
  await jugarADefensa(a, b, 1);
  expect(bloqueos, bloqueos.join("\n")).toEqual([]);

  // La imitacion de Realtime reemplaza el WebSocket de la pagina y la CSP no
  // lo ve: lo que se comprueba es que, al jugar, el documento ya es uno de
  // /mesa (la sala se recargo) y que su CSP deja pasar el wss://.
  for (const p of [a, b]) {
    const documento = await p.evaluate(
      () =>
        new URL(
          (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming)
            .name,
        ).pathname,
    );
    expect(documento).toBe("/mesa/");
    expect(cspPara(documento)).toMatch(/connect-src[^;]* wss:\/\//);
  }
});
