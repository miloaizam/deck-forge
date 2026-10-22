import { readFileSync } from "node:fs";
import path from "node:path";

import type { Page, Route } from "@playwright/test";

/**
 * Un Supabase de mentira, en memoria, para las pruebas de las cuentas y la
 * Comunidad (`nube.spec.ts`). Responde lo mismo que la API de verdad en los
 * pocos caminos que usa el sitio —PostgREST y sus funciones de
 * `supabase/esquema.sql`, mas lo minimo de auth— y aplica las mismas reglas
 * que importan para la interfaz: cada usuario ve y escribe solo lo suyo, un
 * like por persona, no a lo propio, la moderacion oculta.
 *
 * La SQL de verdad se prueba aparte, contra Postgres (docs/cuentas.md).
 *
 * El sitio tiene que estar construido apuntando a `URL_SIMULADA`:
 * `pnpm run e2e:nube` lo hace.
 */

export const URL_SIMULADA = "https://prueba.supabase.co";

/** El build apunta al Supabase simulado (`pnpm run e2e:nube`). */
export const NUBE_SIMULADA = process.env.E2E_NUBE === "1";

const proyecto = JSON.parse(
  readFileSync(path.join(__dirname, "..", "supabase", "proyecto.json"), "utf8"),
) as { url: unknown }; // solo se mira si `url` viene

/** Las cuentas estan encendidas en el build: el simulado o el proyecto real. */
export const NUBE_ENCENDIDA =
  NUBE_SIMULADA || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || proyecto.url);
export const CLAVE_SIMULADA = "sb_publishable_prueba";

interface Fila {
  user_id: string;
  id: string;
  datos: unknown;
  actualizado: number;
  borrada: boolean;
  publica: boolean;
  publicada_en: string | null;
  public_id: string;
  afinidad: string | null;
  oculta: boolean;
  likes: number;
  copias: number;
}

export interface Simulado {
  barajas: Fila[];
  colecciones: Map<string, { datos: unknown; actualizado: number }>;
  perfiles: Map<string, string>;
  likes: Set<string>;
  copias: Set<string>;
  reportes: { user_id: string; baraja: string; motivo: string; nota: string }[];
  /** Cada peticion recibida, para comprobar que no hubo ninguna. */
  peticiones: string[];
}

export const USUARIO_A = "00000000-0000-4000-8000-00000000000a";
export const USUARIO_B = "00000000-0000-4000-8000-00000000000b";

let contador = 0;
const uuid = () => `10000000-0000-4000-8000-${String(++contador).padStart(12, "0")}`;

export function nuevoSimulado(): Simulado {
  return {
    barajas: [],
    colecciones: new Map(),
    perfiles: new Map(),
    likes: new Set(),
    copias: new Set(),
    reportes: [],
    peticiones: [],
  };
}

/** Agrega una baraja ya publicada por otro usuario. */
export function publicarDe(
  s: Simulado,
  userId: string,
  alias: string,
  deck: { id: string; nombre: string; portada?: string | null },
): string {
  s.perfiles.set(userId, alias);
  const public_id = uuid();
  s.barajas.push({
    user_id: userId,
    id: deck.id,
    datos: deck,
    actualizado: 1,
    borrada: false,
    publica: true,
    publicada_en: new Date().toISOString(),
    public_id,
    afinidad: null,
    oculta: false,
    likes: 0,
    copias: 0,
  });
  return public_id;
}

/** La sesion de auth-js tal cual la guarda en localStorage. */
export function sesion(userId: string) {
  return JSON.stringify({
    access_token: `token-${userId}`,
    refresh_token: `refresh-${userId}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: usuario(userId),
  });
}

function usuario(userId: string) {
  return {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: `${userId.slice(-1)}@ejemplo.cl`,
    app_metadata: { provider: "google" },
    user_metadata: { full_name: `Persona ${userId.slice(-1).toUpperCase()}` },
    created_at: "2026-10-01T00:00:00Z",
  };
}

function quienEs(route: Route): string | null {
  const auth = route.request().headers().authorization ?? "";
  const m = auth.match(/^Bearer token-(.+)$/);
  return m ? m[1] : null;
}

const json = (route: Route, cuerpo: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: cuerpo === undefined ? "" : JSON.stringify(cuerpo),
  });

const visible = (f: Fila) => f.publica && !f.oculta && !f.borrada;

function filaPublica(s: Simulado, f: Fila) {
  const semana = [...s.likes].filter((l) => l.endsWith(`|${f.public_id}`)).length;
  return {
    public_id: f.public_id,
    nombre: (f.datos as { nombre?: string } | null)?.nombre ?? null,
    afinidad: f.afinidad,
    portada: (f.datos as { portada?: string | null } | null)?.portada ?? null,
    alias: s.perfiles.get(f.user_id) ?? "",
    likes: f.likes,
    copias: f.copias,
    likes_semana: semana,
    publicada_en: f.publicada_en,
  };
}

/** Engancha el simulado a la pagina. Devuelve el estado, para mirarlo. */
export async function simularSupabase(
  page: Page,
  s = nuevoSimulado(),
): Promise<Simulado> {
  // Cualquier proyecto: el simulado y, en el build real, el de verdad, que
  // asi no recibe nada de las pruebas.
  await page.route("https://*.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const ruta = url.pathname;
    const metodo = req.method();
    s.peticiones.push(`${metodo} ${ruta}`);
    if (metodo === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "GET,POST,PATCH,DELETE",
        },
      });
    }
    const uid = quienEs(route);
    const cuerpo: unknown = req.postData() ? JSON.parse(req.postData()!) : null;
    const eq = (k: string) => url.searchParams.get(k)?.replace(/^eq\./, "") ?? null;

    // --- auth ---
    if (ruta === "/auth/v1/user")
      return uid ? json(route, usuario(uid)) : json(route, {}, 401);
    if (ruta === "/auth/v1/logout") return route.fulfill({ status: 204 });
    if (ruta.startsWith("/auth/v1/")) return json(route, {}, 400);

    // --- tablas ---
    if (ruta === "/rest/v1/barajas") {
      if (!uid) return json(route, [], 200);
      if (metodo === "GET")
        return json(
          route,
          s.barajas.filter((f) => f.user_id === uid),
        );
      if (metodo === "POST") {
        for (const nueva of cuerpo as Partial<Fila>[]) {
          if (nueva.user_id !== uid) return json(route, { code: "42501" }, 403);
          const previa = s.barajas.find((f) => f.user_id === uid && f.id === nueva.id);
          if (previa) Object.assign(previa, nueva);
          else
            s.barajas.push({
              publica: false,
              publicada_en: null,
              public_id: uuid(),
              afinidad: null,
              oculta: false,
              likes: 0,
              copias: 0,
              user_id: uid,
              id: String(nueva.id),
              datos: nueva.datos,
              actualizado: Number(nueva.actualizado),
              borrada: Boolean(nueva.borrada),
            });
          const f = s.barajas.find((x) => x.user_id === uid && x.id === nueva.id)!;
          if (f.borrada) Object.assign(f, { datos: null, publica: false });
        }
        return json(route, undefined, 201);
      }
      if (metodo === "PATCH") {
        const f = s.barajas.find((x) => x.user_id === eq("user_id") && x.id === eq("id"));
        if (f && f.user_id === uid) {
          const cambios = cuerpo as Partial<Fila>;
          if (cambios.publica && !s.perfiles.has(uid))
            return json(route, { code: "P0001" }, 400);
          if (cambios.publica && !f.publica) f.publicada_en = new Date().toISOString();
          Object.assign(f, cambios);
        }
        return json(route, undefined, 204);
      }
    }
    if (ruta === "/rest/v1/colecciones") {
      if (!uid) return json(route, []);
      if (metodo === "GET") {
        const c = s.colecciones.get(uid);
        return json(route, c ? [c] : []);
      }
      const { datos, actualizado } = cuerpo as { datos: unknown; actualizado: number };
      s.colecciones.set(uid, { datos, actualizado });
      return json(route, undefined, 201);
    }
    if (ruta === "/rest/v1/perfiles") {
      if (!uid) return json(route, []);
      if (metodo === "GET") {
        const alias = s.perfiles.get(uid);
        return json(route, alias ? [{ alias }] : []);
      }
      const { alias } = cuerpo as { alias: string };
      const ocupado = [...s.perfiles].some(
        ([otro, a]) => otro !== uid && a.toLowerCase() === alias.toLowerCase(),
      );
      if (ocupado) return json(route, { code: "23505" }, 409);
      s.perfiles.set(uid, alias);
      return json(route, undefined, 201);
    }

    // --- funciones ---
    const args = (cuerpo ?? {}) as Record<string, unknown>;
    const deLa = (pid: unknown) => s.barajas.find((f) => f.public_id === pid);
    switch (ruta) {
      case "/rest/v1/rpc/listar_publicas": {
        const q = typeof args.q === "string" ? args.q.toLowerCase() : null;
        let filas = s.barajas
          .filter(visible)
          .filter((f) => !args.afinidad || f.afinidad === args.afinidad)
          .map((f) => filaPublica(s, f))
          .filter((f) => !q || (f.nombre ?? "").toLowerCase().includes(q));
        const clave = { likes: "likes", tendencia: "likes_semana", copias: "copias" }[
          String(args.orden)
        ] as "likes" | "likes_semana" | "copias" | undefined;
        filas = filas.sort((a, b) =>
          clave
            ? b[clave] - a[clave]
            : Date.parse(b.publicada_en ?? "") - Date.parse(a.publicada_en ?? ""),
        );
        const total = filas.length;
        const desde = Number(args.desde ?? 0);
        return json(
          route,
          filas
            .slice(desde, desde + Number(args.cuantos ?? 24))
            .map((f) => ({ ...f, total })),
        );
      }
      case "/rest/v1/rpc/leer_publica": {
        const f = deLa(args.pid);
        if (!f || !visible(f)) return json(route, []);
        return json(route, [
          {
            ...filaPublica(s, f),
            datos: f.datos,
            mia: f.user_id === uid,
            me_gusta: s.likes.has(`${uid}|${f.public_id}`),
          },
        ]);
      }
      case "/rest/v1/rpc/dar_like": {
        const f = deLa(args.pid);
        if (!uid || !f || !visible(f) || f.user_id === uid)
          return json(route, { code: "P0001" }, 400);
        const k = `${uid}|${f.public_id}`;
        if (args.si && !s.likes.has(k)) {
          s.likes.add(k);
          f.likes++;
        } else if (!args.si && s.likes.has(k)) {
          s.likes.delete(k);
          f.likes--;
        }
        return json(route, f.likes);
      }
      case "/rest/v1/rpc/registrar_copia": {
        const f = deLa(args.pid);
        const k = `${uid}|${args.pid}`;
        if (uid && f && f.user_id !== uid && !s.copias.has(k)) {
          s.copias.add(k);
          f.copias++;
        }
        return json(route, null);
      }
      case "/rest/v1/rpc/reportar": {
        if (!uid) return json(route, { code: "P0001" }, 400);
        s.reportes.push({
          user_id: uid,
          baraja: String(args.pid),
          motivo: String(args.motivo),
          nota: String(args.nota ?? ""),
        });
        return json(route, null);
      }
      case "/rest/v1/rpc/borrar_mi_cuenta": {
        if (!uid) return json(route, { code: "P0001" }, 400);
        s.barajas = s.barajas.filter((f) => f.user_id !== uid);
        s.colecciones.delete(uid);
        s.perfiles.delete(uid);
        return json(route, null);
      }
    }
    return json(route, { message: `simulado: ${metodo} ${ruta} no existe` }, 404);
  });
  return s;
}

/**
 * Entra con una cuenta de mentira: el constructor, Mis barajas y la coleccion
 * la piden. Sin las cuentas encendidas no hace nada. Devuelve el simulado.
 */
export async function entrarSimulado(page: Page, userId = USUARIO_A): Promise<Simulado> {
  const s = await simularSupabase(page);
  if (!NUBE_ENCENDIDA) return s;
  await page.addInitScript(
    ([clave, valor]) => {
      // Una sola vez por pestana: si la prueba cierra sesion, no vuelve sola.
      if (sessionStorage.getItem("e2e-sesion")) return;
      sessionStorage.setItem("e2e-sesion", "1");
      localStorage.setItem(clave, valor);
    },
    ["deckforge-sesion", sesion(userId)],
  );
  return s;
}
