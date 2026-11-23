/**
 * Si la mesa de juego esta encendida (GAME.md §5).
 *
 * Se construye APAGADA y se enciende cuando la editorial responda la consulta
 * del proyecto: hasta entonces no sale en la navbar y sus rutas dicen que
 * todavia no esta disponible. `NEXT_PUBLIC_MESA_ACTIVA=1` la enciende en un
 * build de pruebas (`pnpm run e2e:mesa`) sin tocar el repo.
 *
 * El `process.env.NEXT_PUBLIC_*` va escrito entero: Next lo reemplaza por su
 * valor en el build buscando el texto literal.
 */
export const MESA_ACTIVA = process.env.NEXT_PUBLIC_MESA_ACTIVA === "1";
