"use client";

import { useSyncExternalStore } from "react";
import type { GoTrueClient, Session } from "@supabase/auth-js";
import * as z from "zod/mini";

import { borrarColeccionDelNavegador, subscribeColeccion } from "@/lib/coleccion";
import { clearDraft } from "@/lib/deck-draft";
import { borrarBarajasDelNavegador, subscribeDecks } from "@/lib/deck-storage";
import {
  NUBE_ACTIVA,
  SESION_KEY,
  SUPABASE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase-config";
import type { EstadoPublico } from "@/lib/sync";
import { toast } from "../toast";
import { api, ErrorNube, mensajeDeError, storage } from "./api";

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
      /** Cuando se subio la foto de perfil (ms), su version; null sin foto. */
      avatar: number | null;
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
  // Llego despues: un recuerdo viejo no la trae.
  avatar: z._default(z.nullable(z.int().check(z.positive())), null),
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
        // sesion; eso lo decide el cliente solo (pide el verificador que
        // guardo al salir). Esta funcion NO es "leer la URL si": auth-js la
        // usa para reconocer una vuelta IMPLICITA, y si dice que si con un
        // `?code=` descarta el codigo ("Not a valid PKCE flow url"). Asi que
        // solo reconoce los errores con que vuelve Google, y solo en /cuenta.
        flowType: "pkce",
        detectSessionInUrl: (url, params) =>
          url.pathname.startsWith("/cuenta") &&
          Boolean(params.error || params.error_description || params.error_code),
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

/**
 * El error con que volvio Google o Supabase, si volvio con uno. Llega en la
 * query (`?error=…&error_description=…`) o, segun el caso, en el fragmento.
 * Es texto de afuera: se acota y se pinta como texto.
 */
function errorDeLaVuelta(): string | null {
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.slice(1));
  const d =
    q.get("error_description") ??
    h.get("error_description") ??
    q.get("error") ??
    h.get("error");
  return d ? d.replace(/\+/g, " ").slice(0, 200) : null;
}

/** La URL trae la vuelta de Google: `?code=`, o un error si algo fallo. */
function esVueltaDeGoogle(): boolean {
  return (
    window.location.pathname.startsWith("/cuenta") &&
    (new URLSearchParams(window.location.search).has("code") ||
      errorDeLaVuelta() !== null)
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
  if (/(^#|&)error/.test(url.hash)) {
    url.hash = "";
    cambio = true;
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

  let errorDeVuelta = errorDeLaVuelta();
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
      // Canjear el `?code=` por la sesion pasa aqui; si falla, se sabe por que.
      const inicio = await c.initialize();
      if (inicio.error) errorDeVuelta ??= inicio.error.message.slice(0, 200);
      const { data } = await c.getSession();
      limpiarUrl();
      if (!data.session) {
        if (errorDeVuelta) console.error("Inicio de sesión con Google:", errorDeVuelta);
        setEstado({
          fase: "sin-sesion",
          error: errorDeVuelta
            ? `No se pudo iniciar sesión con Google. Detalle: ${errorDeVuelta}`
            : null,
        });
      }
    })
    .catch(() =>
      setEstado({ fase: "sin-sesion", error: "No se pudo cargar tu cuenta." }),
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
    avatar: mio?.avatar ?? null,
    sincronizando: false,
    ultima: mio?.ultima ?? null,
    error: null,
    publicas: mio?.publicas ?? {},
  });
  vigilarCambios();
  await leerPerfil();
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
    // Desde la portada se queda en /cuenta, para elegir el alias.
    if (pathname !== "/" && !pathname.startsWith("/cuenta")) {
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
      error: "No se pudo abrir Google. Inténtalo de nuevo.",
    });
  }
}

/**
 * Borra del navegador las barajas, la coleccion y el borrador del
 * constructor. Al cerrar sesion ya estan en la cuenta, y quien use este
 * navegador despues no las hereda (decision del proyecto, 23-10-2026).
 */
export function limpiarNavegador(): void {
  escribiendoDesdeLaNube(() => {
    borrarBarajasDelNavegador();
    borrarColeccionDelNavegador();
    clearDraft();
  });
}

/**
 * Cierra la sesion de Supabase. Con `limpiar`, borra tambien lo del
 * navegador y el recuerdo de la cuenta. Sin el, lo deja con su recuerdo: si
 * despues entra OTRA cuenta, `sincronizar.ts` lo borra antes de juntar nada.
 */
async function cerrarSesion(limpiar: boolean): Promise<void> {
  try {
    await (await cliente()).signOut({ scope: "local" });
  } finally {
    if (limpiar) {
      limpiarNavegador();
      guardarRecuerdo(null);
    }
    uidActual = null;
    setEstado({ fase: "sin-sesion", error: null });
  }
}

/**
 * «Cerrar sesion»: primero sube lo pendiente y, si llego a la cuenta, borra
 * las barajas y la coleccion de este navegador. Si no se pudo subir, no se
 * borran (se perderia trabajo): se suben la proxima vez que entre esa misma
 * cuenta, y si entra otra, se borran sin sumarse.
 */
export async function salir(): Promise<void> {
  let subido = false;
  if (estado.fase === "con-sesion") {
    await sincronizar();
    const fin = getEstado();
    subido = fin.fase === "con-sesion" && fin.error === null;
  }
  await cerrarSesion(subido);
  if (!subido) {
    toast(
      "No se pudo guardar en tu cuenta lo último que cambiaste. Queda en este navegador y se sube la próxima vez que entres con esta cuenta.",
      "warning",
    );
  }
}

/**
 * Borra la cuenta y todo lo que tiene en la nube (`borrar_mi_cuenta()` en
 * `supabase/esquema.sql`), y despues lo de este navegador. Lanza si no pudo.
 */
export async function borrarCuenta(): Promise<void> {
  // La foto primero: Supabase no deja borrar archivos de Storage desde SQL.
  // Si falla, la cuenta se borra igual y el archivo queda huerfano (sin dueno
  // ni enlace; docs/cuentas.md).
  if (estado.fase === "con-sesion" && estado.avatar !== null) {
    await storage(`avatares/${estado.usuario.id}`, {
      metodo: "DELETE",
      token: await token(),
    }).catch(() => undefined);
  }
  await api("rpc/borrar_mi_cuenta", { metodo: "POST", cuerpo: {}, token: await token() });
  // La cuenta ya no existe: no hay nada que subir, y lo del navegador se va.
  await cerrarSesion(true);
}

/* ------------------------------------------------------------------ *
 * El perfil: el alias y la foto
 * ------------------------------------------------------------------ */

/** Letras (con tildes y enie), numeros y guion bajo, de 3 a 20. */
export const ALIAS_VALIDO = /^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,20}$/;

// `select=*` y `avatar` opcional: asi se lee igual en una base que todavia no
// tiene la columna (el esquema se pega a mano en Supabase).
const perfilSchema = z.array(
  z.object({
    alias: z.string().check(z.regex(ALIAS_VALIDO)),
    avatar: z._default(z.nullable(z.int().check(z.positive())), null),
  }),
);

async function leerPerfil(): Promise<void> {
  if (estado.fase !== "con-sesion") return;
  try {
    const filas = perfilSchema.parse(
      await api(`perfiles?select=*&user_id=eq.${estado.usuario.id}`, {
        token: await token(),
      }),
    );
    conSesion({ alias: filas[0]?.alias ?? null, avatar: filas[0]?.avatar ?? null });
    recordarPerfil();
  } catch {
    // Se queda el recordado; la sincronizacion dira si no hay red.
  }
}

/** Guarda el alias y la foto en `deckforge-nube`, para pintarlos sin esperar. */
function recordarPerfil(): void {
  const r = leerRecuerdo();
  if (r && estado.fase === "con-sesion" && r.uid === estado.usuario.id) {
    guardarRecuerdo({ ...r, alias: estado.alias, avatar: estado.avatar });
  }
}

/**
 * Sube la foto ya achicada (`achicar-avatar.ts`) y apunta su version en el
 * perfil. Hace falta un alias: la foto vive en la misma fila.
 */
export async function subirAvatar(foto: Blob): Promise<void> {
  if (estado.fase !== "con-sesion" || !estado.alias) {
    throw new ErrorNube(0, null, "Elige un alias antes de poner una foto.");
  }
  const t = await token();
  await storage(`avatares/${estado.usuario.id}`, {
    metodo: "POST",
    archivo: foto,
    token: t,
  });
  const version = Date.now();
  await api(`perfiles?user_id=eq.${estado.usuario.id}`, {
    metodo: "PATCH",
    cuerpo: { avatar: version },
    prefer: "return=minimal",
    token: t,
  });
  conSesion({ avatar: version });
  recordarPerfil();
}

/** Quita la foto: borra el archivo y la version del perfil. */
export async function quitarAvatar(): Promise<void> {
  if (estado.fase !== "con-sesion") return;
  const t = await token();
  await api(`perfiles?user_id=eq.${estado.usuario.id}`, {
    metodo: "PATCH",
    cuerpo: { avatar: null },
    prefer: "return=minimal",
    token: t,
  });
  conSesion({ avatar: null });
  recordarPerfil();
  // El archivo despues: sin la version en el perfil ya no se muestra en
  // ningun lado, aunque borrarlo fallara.
  await storage(`avatares/${estado.usuario.id}`, { metodo: "DELETE", token: t }).catch(
    () => undefined,
  );
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
  recordarPerfil();
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
      // La sesion caduco: se cierra sin limpiar (no se pudo subir).
      if (e instanceof ErrorNube && e.status === 401) void cerrarSesion(false);
      conSesion({ error: mensajeDeError(e) });
    })
    .finally(() => {
      enCurso = null;
      conSesion({ sincronizando: false });
    });
  return enCurso;
}

/**
 * Cada guardado programa una sincronizacion ~2 s despues, agrupando rafagas.
 * Lo que escribe otra pestana no: esa pestana ya sincroniza lo suyo, y si no,
 * cada vuelta dispararia otra en cada pestana abierta.
 */
function programar(otraPestana = false): void {
  if (otraPestana || escribiendo || estado.fase !== "con-sesion") return;
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
