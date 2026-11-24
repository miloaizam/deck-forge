import config from "./activa.json";

/**
 * Si la mesa de juego esta encendida (GAME.md §5).
 *
 * Se encendio el 24-11-2026, con el acuerdo de la editorial. Lo decide
 * `activa.json`, que leen tambien `scripts/csp-hashes.mjs` y
 * `scripts/audit_build.py`: apagarla es poner `false` ahi y hacer commit.
 * Apagada, no sale en la navbar, ni en la ayuda, ni en /privacidad ni en
 * /novedades, y sus rutas dicen que todavia no esta disponible.
 *
 * `NEXT_PUBLIC_MESA_ACTIVA` ("1" o "0") lo pisa en un build de pruebas, sin
 * tocar el repo, como `NEXT_PUBLIC_SUPABASE_*` con `supabase/proyecto.json`.
 * Va escrito entero: Next lo reemplaza por su valor buscando el texto literal.
 */
const forzada = process.env.NEXT_PUBLIC_MESA_ACTIVA;

export const MESA_ACTIVA =
  forzada === "1" ? true : forzada === "0" ? false : config.activa === true;
