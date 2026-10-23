/**
 * La foto de perfil: lo que no necesita navegador (la ruta, la URL, el
 * recorte), para poder probarlo con el corredor de Node.
 *
 * Cada usuario tiene un solo archivo, `avatares/<user_id>` en Storage, en un
 * bucket publico. La base guarda cuando se subio (ms) y las funciones de la
 * Comunidad devuelven la ruta como `<user_id>?v=<ms>`: el `?v=` cambia con
 * cada foto nueva y salta la cache del CDN. Ver `supabase/esquema.sql`.
 */

/** Lado de la foto que se sube, en px. Se ve a 28-56 px: alcanza para 2x. */
export const LADO_AVATAR = 128;

/** Tope del archivo subido; el bucket lo hace cumplir tambien (50 KB). */
export const MAX_BYTES_AVATAR = 50 * 1024;

/** Tope del original antes de decodificarlo: un archivo enorme cuelga la pestana. */
export const MAX_BYTES_ORIGINAL = 10 * 1024 * 1024;

/** Los tipos que acepta el bucket. */
export const TIPOS_AVATAR = ["image/webp", "image/jpeg"] as const;

/**
 * `<uuid>?v=<ms>` y nada mas: viene de la base, que es entrada de afuera
 * (seguridad #4), y termina en el `src` de un `<img>` (seguridad #10).
 */
const RUTA_AVATAR =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\?v=[1-9][0-9]{0,15}$/;

export function esRutaAvatar(v: unknown): v is string {
  return typeof v === "string" && RUTA_AVATAR.test(v);
}

/** La ruta de la foto propia, con su version. */
export function rutaAvatar(userId: string, version: number | null): string | null {
  if (version === null) return null;
  const ruta = `${userId}?v=${version}`;
  return esRutaAvatar(ruta) ? ruta : null;
}

/** La URL publica de la foto; null si la ruta no es valida o no hay nube. */
export function urlAvatar(base: string | null, ruta: unknown): string | null {
  if (!base || !esRutaAvatar(ruta)) return null;
  return `${base}/storage/v1/object/public/avatares/${ruta}`;
}

/** El cuadrado mas grande, centrado, que cabe en una imagen de `ancho`x`alto`. */
export function recorteCuadrado(
  ancho: number,
  alto: number,
): { x: number; y: number; lado: number } {
  const lado = Math.min(ancho, alto);
  return {
    x: Math.floor((ancho - lado) / 2),
    y: Math.floor((alto - lado) / 2),
    lado,
  };
}
