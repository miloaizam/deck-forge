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

/** El texto para el usuario de un error de la nube, impersonal y con remedio. */
export function mensajeDeError(e: unknown): string {
  if (!(e instanceof ErrorNube)) return "Algo falló al hablar con la nube.";
  if (e.status === 0)
    return "Sin conexión con la nube. Lo guardado en este navegador sigue aquí.";
  if (e.status === 401) return "La sesión caducó. Vuelve a entrar.";
  if (e.status === 429)
    return "Demasiadas peticiones seguidas. Intenta de nuevo en un rato.";
  if (e.status >= 500)
    return "La nube no está disponible ahora. Intenta de nuevo más tarde.";
  return "La nube rechazó el cambio.";
}
