import proyecto from "../../supabase/proyecto.json";

/**
 * Los datos del proyecto de Supabase: la URL y la clave PUBLICA.
 *
 * Las dos son publicas por diseno: van dentro del bundle y cualquiera puede
 * leerlas. Lo que protege los datos son las reglas de acceso por fila (RLS) de
 * `supabase/esquema.sql`. La clave secreta (`sb_secret_…` o `service_role`)
 * no se escribe nunca aqui: `pnpm run audit` falla si aparece.
 *
 * Viven en `supabase/proyecto.json` para que los lean tambien
 * `scripts/csp-hashes.mjs` y `scripts/audit_build.py`, que ponen el host en
 * `connect-src`. Con los dos en `null` las cuentas y la Comunidad estan
 * APAGADAS: sin boton de cuenta, sin enlace en la navbar, sin peticiones.
 *
 * `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_KEY` pisan el archivo en
 * un build: sirven para probar con un proyecto de pruebas o con Supabase
 * simulado (e2e), sin tocar el repo.
 */

/** `https://<ref>.supabase.co`, sin barra al final. */
const URL_VALIDA = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;

/**
 * La publishable key nueva o la anon key de siempre (un JWT). No la secreta:
 * `sb_secret_` no pasa.
 */
const CLAVE_VALIDA = /^(sb_publishable_[A-Za-z0-9_-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/;

function leer(
  entorno: string | undefined,
  archivo: unknown,
  valida: RegExp,
): string | null {
  const valor = entorno || archivo;
  return typeof valor === "string" && valida.test(valor) ? valor : null;
}

// Cada `process.env.NEXT_PUBLIC_*` se escribe entero: Next los reemplaza por
// su valor en el build buscando el texto literal.
const URL = leer(process.env.NEXT_PUBLIC_SUPABASE_URL, proyecto.url, URL_VALIDA);
const CLAVE = leer(process.env.NEXT_PUBLIC_SUPABASE_KEY, proyecto.key, CLAVE_VALIDA);

/** Si las cuentas y la Comunidad estan encendidas. */
export const NUBE_ACTIVA = URL !== null && CLAVE !== null;

export const SUPABASE_URL = NUBE_ACTIVA ? URL : null;
export const SUPABASE_KEY = NUBE_ACTIVA ? CLAVE : null;

/**
 * Donde guarda la sesion el cliente de autenticacion. Saberlo sin cargar la
 * libreria es lo que deja a un visitante sin cuenta sin ninguna peticion a
 * Supabase: si esta clave no existe, no hay sesion que retomar.
 */
export const SESION_KEY = "deckforge-sesion";
