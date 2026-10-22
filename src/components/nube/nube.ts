"use client";

import { useSyncExternalStore } from "react";
import type { GoTrueClient, Session } from "@supabase/auth-js";
import * as z from "zod/mini";

import { subscribeColeccion } from "@/lib/coleccion";
import { subscribeDecks } from "@/lib/deck-storage";
import {
  NUBE_ACTIVA,
  SESION_KEY,
  SUPABASE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase-config";
import type { EstadoPublico } from "@/lib/sync";
import { api, ErrorNube, mensajeDeError } from "./api";

/**
 * La cuenta: la sesion con Google y el estado de la sincronizacion.
 *
 * Es un store de modulo leido con `useSyncExternalStore`, como el catalogo
 * (`use-catalogo.ts`) y los avisos (`toast.ts`): lo lee el boton de la navbar,
 * `/cuenta`, Mis barajas y la Comunidad sin providers.
 *
 * **Nada se descarga si no hace falta.** `@supabase/auth-js` se importa solo
 * cuando hay una sesion guardada (`SESION_KEY`), al volver de Google o al
 * pulsar «Entrar». Un visitante sin cuenta no hace ninguna peticion a
 * Supabase. Y con la nube apagada (`supabase-config.ts`) no pasa nada de esto.
 *
 * La sincronizacion misma vive en `sincronizar.ts`, que tambien se carga al
 * usarse.
 */

export interface Usuario {
  id: string;
  email: string | null;
  /** El nombre de la cuenta de Google. Solo lo ve su dueno, en /cuenta. */
  nombre: string | null;
}

export type EstadoNube =
  | { fase: "apagada" }
  | { fase: "cargando" }
  | { fase: "sin-sesion"; error: string | null }
  | {
      fase: "con-sesion";
      usuario: Usuario;
      /** El alias publico; null mientras no elija uno. */
      alias: string | null;
      sincronizando: boolean;
      /** Cuando termino la ultima sincronizacion, en ms. */
      ultima: number | null;
      error: string | null;
      /** Lo publico de cada baraja propia, por id local. */
      publicas: Readonly<Record<string, EstadoPublico>>;
    };

const APAGADA: EstadoNube = Object.freeze({ fase: "apagada" });
const CARGANDO: EstadoNube = Object.freeze({ fase: "cargando" });

let estado: EstadoNube = NUBE_ACTIVA ? CARGANDO : APAGADA;
const oyentes = new Set<() => void>();

export function getEstado(): EstadoNube {
  return estado;
}

export function setEstado(siguiente: EstadoNube): void {
  estado = siguiente;
  for (const cb of oyentes) cb();
}

/** Cambia campos del estado con sesion; con otra fase no hace nada. */
export function conSesion(
  cambios: Partial<Extract<EstadoNube, { fase: "con-sesion" }>>,
): void {
  if (estado.fase === "con-sesion") setEstado({ ...estado, ...cambios });
}

function subscribe(cb: () => void) {
  oyentes.add(cb);
  return () => oyentes.delete(cb);
}

const getServerSnapshot = (): EstadoNube => (NUBE_ACTIVA ? CARGANDO : APAGADA);

export function useNube(): EstadoNube {
  return useSyncExternalStore(subscribe, getEstado, getServerSnapshot);
}

/* ------------------------------------------------------------------ *
 * Lo que se recuerda de la cuenta en el navegador
 *
 * `deckforge-nube`: de que cuenta es lo sincronizado, cuando, el alias y lo
 * publico de cada baraja. Sirve para pintar Mis barajas sin esperar a la red,
 * y para saber si es la PRIMERA vez que este navegador se une a la cuenta
 * (la coleccion entonces se suma en vez de elegir una).
 * ------------------------------------------------------------------ */

export const NUBE_KEY = "deckforge-nube";

const publicoSchema = z.object({
  publicId: z.string().check(z.maxLength(40)),
  publica: z.boolean(),
  oculta: z.boolean(),
  likes: z.int().check(z.nonnegative()),
  copias: z.int().check(z.nonnegative()),
  afinidad: z._default(z.nullable(z.string().check(z.maxLength(40))), null),
});

const recuerdoSchema = z.object({
  uid: z.string().check(z.maxLength(40)),
  ultima: z.nullable(z.int()),
  alias: z.nullable(z.string().check(z.maxLength(20))),
  publicas: z.record(z.string().check(z.maxLength(10)), publicoSchema),
});
export type Recuerdo = z.infer<typeof recuerdoSchema>;

export function leerRecuerdo(): Recuerdo | null {
  try {
    const raw = localStorage.getItem(NUBE_KEY);
    if (!raw || raw.length > 64 * 1024) return null;
    const r = recuerdoSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function guardarRecuerdo(r: Recuerdo | null): void {
  try {
    if (r) localStorage.setItem(NUBE_KEY, JSON.stringify(r));
    else localStorage.removeItem(NUBE_KEY);
  } catch {
    // Sin espacio: la proxima carga esperara a la red, nada mas.
  }
}

/* ------------------------------------------------------------------ *
 * La sesion
 * ------------------------------------------------------------------ */

let auth: Promise<GoTrueClient> | null = null;

/** Carga `@supabase/auth-js` una sola vez. */
function cliente(): Promise<GoTrueClient> {
  auth ??= import("@supabase/auth-js").then(
    ({ GoTrueClient }) =>
      new GoTrueClient({
        url: `${SUPABASE_URL}/auth/v1`,
        headers: { apikey: SUPABASE_KEY ?? "" },
        storageKey: SESION_KEY,
        storage: window.localStorage,
        persistSession: true,
        autoRefreshToken: true,
        // PKCE: Google devuelve un `?code=` que el cliente cambia por la
        // sesion. Solo en /cuenta, que es la unica vuelta que se pide.
        flowType: "pkce",
        detectSessionInUrl: () => window.location.pathname.startsWith("/cuenta"),
      }),
  );
  return auth;
}

/** El token de acceso vigente (se renueva solo), o null sin sesion. */
export async function token(): Promise<string | null> {
  if (estado.fase !== "con-sesion") return null;
  const { data } = await (await cliente()).getSession();
  return data.session?.access_token ?? null;
}

function usuarioDe(session: Session): Usuario {
  const meta: Record<string, unknown> = session.user.user_metadata ?? {};
  const nombre = meta.full_name ?? meta.name;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    nombre: typeof nombre === "string" ? nombre.slice(0, 80) : null,
  };
}

function haySesionGuardada(): boolean {
  try {
    return localStorage.getItem(SESION_KEY) !== null;
  } catch {
    return false;
  }
}

/** La URL trae la vuelta de Google: `?code=` (o `?error=` si se cancelo). */
function esVueltaDeGoogle(): boolean {
  const p = new URLSearchParams(window.location.search);
  return (
    window.location.pathname.startsWith("/cuenta") && (p.has("code") || p.has("error"))
  );
}

/** Quita `?code=` y compania de la barra de direcciones. */
function limpiarUrl(): void {
  const url = new URL(window.location.href);
  let cambio = false;
  for (const p of ["code", "error", "error_code", "error_description", "state"]) {
    if (url.searchParams.has(p)) {
      url.searchParams.delete(p);
      cambio = true;
    }
  }
  if (cambio) window.history.replaceState(window.history.state, "", url);
}

let iniciada = false;
let uidActual: string | null = null;

/**
 * Arranca la cuenta en esta pagina. Lo llama el boton de la navbar al
 * montarse; llamarla mas veces no hace nada.
 */
export function iniciarNube(): void {
  if (iniciada || !NUBE_ACTIVA || typeof window === "undefined") return;
  iniciada = true;

  const errorDeVuelta = new URLSearchParams(window.location.search).has("error");
  if (!haySesionGuardada() && !esVueltaDeGoogle()) {
    setEstado({ fase: "sin-sesion", error: null });
    return;
  }

  // Lo recordado se pinta ya; la red lo confirma despues.
  void cliente()
    .then(async (c) => {
      c.onAuthStateChange((_evento, session) => {
        // Nada de llamadas al cliente dentro del aviso: auth-js lo prohibe
        // (se trabaria esperandose a si mismo). Se difiere un turno.
        setTimeout(() => void alCambiarSesion(session), 0);
      });
      const { data } = await c.getSession();
      limpiarUrl();
      if (!data.session) {
        setEstado({
          fase: "sin-sesion",
          error: errorDeVuelta ? "No se pudo entrar con Google. Intenta de nuevo." : null,
        });
      }
    })
    .catch(() =>
      setEstado({ fase: "sin-sesion", error: "No se pudo cargar la cuenta." }),
    );
}

async function alCambiarSesion(session: Session | null): Promise<void> {
  if (!session) {
    uidActual = null;
    if (estado.fase === "con-sesion" || estado.fase === "cargando") {
      setEstado({ fase: "sin-sesion", error: null });
    }
    return;
  }
  const usuario = usuarioDe(session);
  if (uidActual === usuario.id) return; // un token renovado: nada nuevo
  uidActual = usuario.id;

  const recuerdo = leerRecuerdo();
  const mio = recuerdo?.uid === usuario.id ? recuerdo : null;
  setEstado({
    fase: "con-sesion",
    usuario,
    alias: mio?.alias ?? null,
    sincronizando: false,
    ultima: mio?.ultima ?? null,
    error: null,
    publicas: mio?.publicas ?? {},
  });
  vigilarCambios();
  await leerAlias();
  void sincronizar();
}

/**
 * La pagina desde donde se pulso «Entrar», para volver a ella. Google solo
 * puede volver a /cuenta (las Redirect URLs de Supabase), y /cuenta termina
 * de entrar y despues lleva aqui. Va en sessionStorage: es de esta pestana.
 */
const VOLVER_KEY = "deckforge-volver";

/** Una ruta propia y nada mas: ni otro host (`//x`) ni un esquema. */
const RUTA_PROPIA = /^\/(?!\/)[^\s\\]*$/;

/** La pagina a la que volver tras entrar, una sola vez; null si no hay. */
export function tomarVuelta(): string | null {
  try {
    const v = sessionStorage.getItem(VOLVER_KEY);
    sessionStorage.removeItem(VOLVER_KEY);
    return v && RUTA_PROPIA.test(v) && !v.startsWith("/cuenta") ? v : null;
  } catch {
    return null;
  }
}

/** Abre Google. Vuelve a /cuenta, que termina de entrar y sincroniza. */
export async function entrar(): Promise<void> {
  try {
    const { pathname, search, hash } = window.location;
    if (!pathname.startsWith("/cuenta")) {
      sessionStorage.setItem(VOLVER_KEY, `${pathname}${search}${hash}`);
    }
  } catch {
    // Sin sessionStorage se vuelve a /cuenta, nada mas.
  }
  try {
    const c = await cliente();
    const { error } = await c.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/cuenta/` },
    });
    if (error) throw error;
  } catch {
    setEstado({
      fase: "sin-sesion",
      error: "No se pudo abrir Google. Intenta de nuevo.",
    });
  }
}

/**
 * Cierra la sesion en este navegador. Las barajas y la coleccion se quedan
 * aqui: son del navegador tambien.
 */
export async function salir(): Promise<void> {
  try {
    await (await cliente()).signOut({ scope: "local" });
  } finally {
    guardarRecuerdo(null);
    uidActual = null;
    setEstado({ fase: "sin-sesion", error: null });
  }
}

/**
 * Borra la cuenta y todo lo que tiene en la nube (`borrar_mi_cuenta()` en
 * `supabase/esquema.sql`). Lo del navegador se queda. Lanza si no pudo.
 */
export async function borrarCuenta(): Promise<void> {
  await api("rpc/borrar_mi_cuenta", { metodo: "POST", cuerpo: {}, token: await token() });
  await salir();
}

/* ------------------------------------------------------------------ *
 * El alias
 * ------------------------------------------------------------------ */

/** Letras (con tildes y enie), numeros y guion bajo, de 3 a 20. */
export const ALIAS_VALIDO = /^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,20}$/;

const aliasSchema = z.array(z.object({ alias: z.string().check(z.regex(ALIAS_VALIDO)) }));

async function leerAlias(): Promise<void> {
  if (estado.fase !== "con-sesion") return;
  try {
    const filas = aliasSchema.parse(
      await api(`perfiles?select=alias&user_id=eq.${estado.usuario.id}`, {
        token: await token(),
      }),
    );
    conSesion({ alias: filas[0]?.alias ?? null });
  } catch {
    // Se queda el recordado; la sincronizacion dira si no hay red.
  }
}

export type ResultadoAlias = "ok" | "invalido" | "ocupado" | "error";

export async function guardarAlias(alias: string): Promise<ResultadoAlias> {
  if (estado.fase !== "con-sesion") return "error";
  const limpio = alias.trim();
  if (!ALIAS_VALIDO.test(limpio)) return "invalido";
  try {
    await api("perfiles?on_conflict=user_id", {
      metodo: "POST",
      cuerpo: { user_id: estado.usuario.id, alias: limpio },
      prefer: "resolution=merge-duplicates,return=minimal",
      token: await token(),
    });
  } catch (e) {
    return e instanceof ErrorNube && e.codigo === "23505" ? "ocupado" : "error";
  }
  conSesion({ alias: limpio });
  const r = leerRecuerdo();
  if (r && estado.fase === "con-sesion" && r.uid === estado.usuario.id) {
    guardarRecuerdo({ ...r, alias: limpio });
  }
  return "ok";
}

/* ------------------------------------------------------------------ *
 * Cuando sincronizar
 * ------------------------------------------------------------------ */

let enCurso: Promise<void> | null = null;
/** La vuelta encolada mientras otra corre: una sola, junta todo lo pedido. */
let siguiente: Promise<void> | null = null;
let temporizador: ReturnType<typeof setTimeout> | undefined;
/** Mientras la sincronizacion escribe en el navegador, no se dispara otra. */
let escribiendo = false;

export function escribiendoDesdeLaNube<T>(fn: () => T): T {
  escribiendo = true;
  try {
    return fn();
  } finally {
    escribiendo = false;
  }
}

/**
 * Sincroniza ya. Si hay una en curso, se encola UNA mas para cuando termine
 * (lo que cambio mientras tanto no se pierde) y la promesa resuelve tras esa.
 * Nunca lanza: el error queda en el estado (`error`).
 */
export function sincronizar(): Promise<void> {
  if (estado.fase !== "con-sesion") return Promise.resolve();
  if (enCurso) {
    siguiente ??= enCurso.then(() => {
      siguiente = null;
      return sincronizar();
    });
    return siguiente;
  }
  conSesion({ sincronizando: true, error: null });
  enCurso = import("./sincronizar")
    .then((m) => m.sincronizarAhora())
    .catch((e: unknown) => {
      if (e instanceof ErrorNube && e.status === 401) void salir();
      conSesion({ error: mensajeDeError(e) });
    })
    .finally(() => {
      enCurso = null;
      conSesion({ sincronizando: false });
    });
  return enCurso;
}

/** Cada guardado programa una sincronizacion ~2 s despues, agrupando rafagas. */
function programar(): void {
  if (escribiendo || estado.fase !== "con-sesion") return;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => void sincronizar(), 2000);
}

let vigilando = false;

function vigilarCambios(): void {
  if (vigilando) return;
  vigilando = true;
  subscribeDecks(programar);
  subscribeColeccion(programar);
  // Al volver a la pestana, por si se cambio algo en otro equipo.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || estado.fase !== "con-sesion") return;
    if (Date.now() - (estado.ultima ?? 0) > 60_000) void sincronizar();
  });
}
