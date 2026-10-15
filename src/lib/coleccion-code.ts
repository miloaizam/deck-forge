import {
  aBase64Url,
  ANCHO_NUMERO,
  ANCHO_PREFIJO,
  ANCHO_SALTO,
  BitReader,
  BitWriter,
  deBase64Url,
  idDe,
  refDe,
} from "./deck-code";
import { MAX_COPIAS_COLECCION, sanearColeccion, type Coleccion } from "./coleccion";

/**
 * La coleccion en un enlace (`/coleccion/#c=…`), para mostrarle a alguien lo
 * que se tiene y lo que falta y negociar un cambio.
 *
 * Mismo formato de fondo que el enlace de una baraja (`deck-code.ts`): cada
 * impresion son 5 bits de edicion y 10 de numero, las de una edicion van
 * juntas y ordenadas y de la segunda en adelante basta el salto. Cambian los
 * anchos, porque una coleccion es mucho mas grande que una baraja: hasta 4095
 * cartas por edicion y copias hasta 99. Y viaja en el fragmento, como la
 * baraja: el navegador no lo manda al servidor.
 *
 * Las ids que no tienen la forma `xx-000` no caben y se omiten; en el catalogo
 * de hoy no hay ninguna.
 */

const VERSION = 1;
const ANCHO_VERSION = 8;
const ANCHO_GRUPOS = 5;
const ANCHO_ENTRADAS = 12;
/** Copias por encima de 3: van enteras detras. */
const ANCHO_COPIAS = 7;
const SALTO_ESCAPE = (1 << ANCHO_SALTO) - 1;
const COPIAS_ESCAPE = 3;

/** Un codigo de mas de esto no es una coleccion (2649 cartas son ~6000). */
const MAX_CODIGO = 20_000;

function escribirLista(w: BitWriter, lista: Readonly<Record<string, number>>): void {
  const grupos = new Map<number, { numero: number; n: number }[]>();
  for (const [id, n] of Object.entries(lista)) {
    const ref = refDe(id);
    if (!ref || n < 1 || n > MAX_COPIAS_COLECCION) continue;
    const grupo = grupos.get(ref.prefijo) ?? [];
    grupo.push({ numero: ref.numero, n });
    grupos.set(ref.prefijo, grupo);
  }
  w.write(grupos.size, ANCHO_GRUPOS);
  for (const [prefijo, grupo] of grupos) {
    grupo.sort((a, b) => a.numero - b.numero);
    w.write(prefijo, ANCHO_PREFIJO);
    w.write(grupo.length, ANCHO_ENTRADAS);
    let previo = -1;
    for (const { numero, n } of grupo) {
      const salto = numero - previo - 1;
      if (previo < 0 || salto < 0 || salto >= SALTO_ESCAPE) {
        w.write(SALTO_ESCAPE, ANCHO_SALTO);
        w.write(numero, ANCHO_NUMERO);
      } else {
        w.write(salto, ANCHO_SALTO);
      }
      previo = numero;
      if (n - 1 < COPIAS_ESCAPE) w.write(n - 1, 2);
      else {
        w.write(COPIAS_ESCAPE, 2);
        w.write(n - 1, ANCHO_COPIAS);
      }
    }
  }
}

function leerLista(r: BitReader): Record<string, number> {
  const out: Record<string, number> = {};
  const grupos = r.read(ANCHO_GRUPOS);
  for (let g = 0; g < grupos; g++) {
    const prefijo = r.read(ANCHO_PREFIJO);
    const cuantas = r.read(ANCHO_ENTRADAS);
    let previo = -1;
    for (let i = 0; i < cuantas; i++) {
      const salto = r.read(ANCHO_SALTO);
      if (salto !== SALTO_ESCAPE && previo < 0)
        throw new RangeError("salto sin anterior");
      const numero = salto === SALTO_ESCAPE ? r.read(ANCHO_NUMERO) : previo + salto + 1;
      previo = numero;
      const copias = r.read(2);
      const n = copias < COPIAS_ESCAPE ? copias + 1 : r.read(ANCHO_COPIAS) + 1;
      const id = idDe(prefijo, numero);
      if (id) out[id] = n;
    }
  }
  return out;
}

/** La coleccion como codigo base64url, sin el `#c=`. */
export function encodeColeccion(col: Coleccion): string {
  const w = new BitWriter();
  w.write(VERSION, ANCHO_VERSION);
  escribirLista(w, col.tengo);
  escribirLista(w, col.quiero);
  return aBase64Url(w.final());
}

/**
 * Lee un codigo. `null` si no es una coleccion. Nunca lanza: el codigo viene de
 * una URL, y pasa por la misma validacion que lo guardado (`sanearColeccion`),
 * que acota las copias y descarta lo que no cuadre.
 */
export function decodeColeccion(codigo: string | null | undefined): Coleccion | null {
  if (!codigo || codigo.length > MAX_CODIGO) return null;
  const bytes = deBase64Url(codigo);
  if (!bytes || bytes.length === 0) return null;
  try {
    const r = new BitReader(bytes);
    if (r.read(ANCHO_VERSION) !== VERSION) return null;
    const tengo = leerLista(r);
    const quiero = leerLista(r);
    return sanearColeccion(tengo, quiero).coleccion;
  } catch {
    return null;
  }
}

/** El enlace completo para compartir la coleccion. */
export function coleccionUrl(col: Coleccion, origen: string): string {
  return `${origen.replace(/\/$/, "")}/coleccion/#c=${encodeColeccion(col)}`;
}

/** Saca el codigo del fragmento (`#c=…`). `null` si no trae ninguno. */
export function codigoDeColeccion(hash: string): string | null {
  const m = /^#?(?:[^&]*&)*c=([A-Za-z0-9_-]*)/.exec(hash);
  return m && m[1] !== "" ? m[1] : null;
}
