import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase-config";

/**
 * Las peticiones a la API de Supabase (PostgREST), con `fetch` a secas.
 *
 * No se usa el cliente completo de Supabase: trae tiempo real, archivos y
 * funciones que el sitio no necesita. Para leer y escribir tablas basta la
 * API REST con dos cabeceras: `apikey` (la clave publica) siempre y
 * `Authorization` con el token del usuario cuando hay sesion. La sesion la
 * maneja `@supabase/auth-js`, que se carga solo cuando hace falta
 * (`nube.ts`).
 *
 * Todo lo que devuelve es `unknown`: quien llama lo valida con Zod antes de
 * usarlo (CLAUDE.md, seguridad #4).
 */

export class ErrorNube extends Error {
  readonly status: number;
  /** El codigo de Postgres o de PostgREST (`23505`, `P0001`…), si vino. */
  readonly codigo: string | null;

  constructor(status: number, codigo: string | null, mensaje: string) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
  }
}

interface Opciones {
  metodo?: "GET" | "POST" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  /** El token de acceso del usuario; sin el, la peticion va como anonima. */
  token?: string | null;
  /** La cabecera `Prefer` de PostgREST (upsert, contar). */
  prefer?: string;
}

/** Corta una peticion colgada: un proyecto pausado puede tardar en responder. */
const ESPERA_MS = 15_000;

/**
 * `ruta` es lo que va tras `/rest/v1/`: `barajas?select=…` o
 * `rpc/listar_publicas`. Lanza `ErrorNube` si la respuesta no es 2xx o si
 * no hay red.
 */
export async function api(ruta: string, opciones: Opciones = {}): Promise<unknown> {
  if (!SUPABASE_URL || !SUPABASE_KEY)
    throw new ErrorNube(0, null, "La nube está apagada.");
  const { metodo = "GET", cuerpo, token, prefer } = opciones;
  const cabeceras: Record<string, string> = { apikey: SUPABASE_KEY };
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";
  if (prefer) cabeceras.Prefer = prefer;

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(ESPERA_MS),
      // Nada de cookies ni credenciales del navegador: va solo lo de arriba.
      credentials: "omit",
    });
  } catch {
    throw new ErrorNube(0, null, "Sin conexión con la nube.");
  }

  const texto = await res.text();
  let json: unknown = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const codigo =
      typeof json === "object" &&
      json !== null &&
      "code" in json &&
      typeof json.code === "string"
        ? json.code
        : null;
    throw new ErrorNube(res.status, codigo, `La nube respondió ${res.status}.`);
  }
  return json;
}

/**
 * Subir o borrar un archivo de Storage (la foto de perfil). `ruta` es lo que va
 * tras `/storage/v1/object/`: `avatares/<user_id>`. Subir pisa el que haya
 * (`x-upsert`). Lanza `ErrorNube` como `api()`.
 */
export async function storage(
  ruta: string,
  opciones: { metodo: "POST" | "DELETE"; archivo?: Blob; token: string | null },
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY)
    throw new ErrorNube(0, null, "La nube está apagada.");
  const cabeceras: Record<string, string> = { apikey: SUPABASE_KEY };
  if (opciones.token) cabeceras.Authorization = `Bearer ${opciones.token}`;
  if (opciones.archivo) {
    cabeceras["Content-Type"] = opciones.archivo.type;
    cabeceras["x-upsert"] = "true";
    // Una foto nueva lleva otro `?v=` en su URL, que salta la cache. Una hora
    // y no un año: el archivo se sobrescribe en la misma ruta, y si alguien lo
    // pide justo entre la subida y el cambio de version, la mezcla dura poco.
    cabeceras["Cache-Control"] = "max-age=3600";
  }
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/storage/v1/object/${ruta}`, {
      method: opciones.metodo,
      headers: cabeceras,
      body: opciones.archivo,
      signal: AbortSignal.timeout(ESPERA_MS),
      credentials: "omit",
    });
  } catch {
    throw new ErrorNube(0, null, "Sin conexión con la nube.");
  }
  if (!res.ok) throw new ErrorNube(res.status, null, `La nube respondió ${res.status}.`);
}

/** El texto para el usuario de un error de la nube, impersonal y con remedio. */
export function mensajeDeError(e: unknown): string {
  if (!(e instanceof ErrorNube)) return "Algo salió mal. Inténtalo de nuevo.";
  if (e.status === 0) return "No hay conexión. Inténtalo de nuevo en un momento.";
  if (e.status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (e.status === 429) return "Demasiados intentos seguidos. Espera un momento.";
  if (e.status >= 500) return "El servicio no está disponible. Inténtalo más tarde.";
  return "No se pudo guardar el cambio.";
}
