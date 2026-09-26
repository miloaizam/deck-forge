import lzString from "lz-string";
import { z } from "zod";

import { createDeck } from "./deck";
import { deckSchema, MAX_NOMBRE_BARAJA, type Deck, type DeckEntry } from "./types";

/**
 * Codificar y decodificar una baraja para compartirlo por enlace.
 *
 * La baraja entera no viaja: fuera quedan el id local, las fechas, la descripcion,
 * la portada y la afinidad fijada — no le sirven a quien recibe el enlace y solo
 * alargan la URL. Viajan el nombre, el oro inicial y las dos zonas.
 *
 * El codigo es BINARIO y va en base64url, que no lleva ningun caracter que la
 * URL tenga que escapar. La version 1 metia la baraja en JSON y la comprimia con
 * lz-string, y el resultado era largo por un motivo de fondo: una baraja es una
 * lista de numeros pequenos, y en JSON cada uno de esos numeros se escribe como
 * texto (`["hs-040",3],`, catorce caracteres) para que un compresor de proposito
 * general tenga que volver a adivinar que hay debajo. Escribirlos como numeros
 * de una vez sale mas corto que comprimir su forma de texto: una baraja de 50
 * cartas baja de ~300 caracteres de URL a ~130.
 *
 * El formato, bit a bit (`escribirZona` y `leerZona` son la referencia exacta):
 *
 *   version           8 bits, y es lo que distingue este codigo del viejo
 *   largo del nombre  8 bits, y esos bytes de UTF-8
 *   oro inicial       1 bit de presencia + la referencia a la carta
 *   principal         una zona
 *   side              una zona
 *
 * Una referencia a una impresion son 15 bits: 5 de edicion (la posicion de su
 * prefijo en `PREFIJOS`) y 10 del numero dentro de la edicion. Dentro de una
 * zona las entradas se agrupan por edicion y se ordenan, asi que de la segunda
 * en adelante basta el SALTO respecto de la anterior; con las copias al lado,
 * la entrada tipica ocupa un byte.
 *
 * Lo que no se puede representar asi —una edicion cuyo prefijo no este en la
 * tabla, un id con otra forma— no se pierde: el enlace sale en el formato 1,
 * que admite cualquier id. Y los enlaces del formato 1 ya compartidos se siguen
 * leyendo.
 *
 * La version va primero para que un decodificador viejo pueda RECHAZAR un
 * codigo nuevo con un mensaje claro, en vez de malinterpretarlo y mostrar un
 * baraja equivocada.
 */

/**
 * lz-string es CommonJS y no expone exports con nombre que Node pueda leer en
 * ESM. Se importa por defecto y se desestructura: asi funciona igual bajo el
 * bundler de Next y bajo `node --test`.
 */
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lzString;

/** La version que se ESCRIBE. */
const WIRE_VERSION = 2;

/** JSON comprimido con lz-string. Ya no se escribe; se sigue leyendo. */
const WIRE_VERSION_LZ = 1;

/**
 * Rango de primeros bytes reservado para este formato binario. Sirve para
 * distinguir "viene de una version mas nueva" de "esto no es una baraja": un byte
 * cualquiera cae casi siempre fuera del rango y el codigo se prueba entonces
 * como formato 1.
 */
const MAX_VERSION_BINARIA = 31;

/** Cota antes de descomprimir: una URL hostil no puede hacernos trabajar. */
const MAX_CODIGO = 4000;
const MAX_JSON = 64 * 1024;

/** Sobre el que se largo un enlace deja de ser comodo de compartir. */
export const LARGO_INCOMODO = 300;

const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/**
 * Prefijo de id -> numero con el que la edicion viaja en el enlace.
 *
 * Espejo en minusculas de `EDITION_CODES` en scripts/fetch_edition.py, con las
 * seis ediciones de fuera del formato que aportan cartas sueltas.
 *
 * **LA POSICION ES EL CODIGO.** Solo se AGREGA al final: reordenar o borrar una
 * entrada cambia lo que significan los enlaces ya compartidos. Caben 32; si
 * algun dia no cabe una edicion nueva, su enlace sale en el formato 1 y nada se
 * rompe, que es lo mismo que pasa mientras su prefijo no este aqui.
 */
const PREFIJOS: readonly string[] = [
  "bu",
  "sn",
  "do",
  "ca",
  "ai",
  "sp",
  "am",
  "hs",
  "lg",
  "ee",
  "he",
  "im",
  "es",
  "dr",
  "cr",
  "fu",
];

const ANCHO_VERSION = 8;
const ANCHO_LARGO_NOMBRE = 8;
/** 32 ediciones. */
const ANCHO_PREFIJO = 5;
/** Hasta 1023; la edicion mas larga del catalogo llega a 326. */
const ANCHO_NUMERO = 10;
/** Hasta 31 grupos por zona, uno por edicion. */
const ANCHO_GRUPOS = 5;
/** Hasta 63 entradas por grupo; el esquema de la baraja topa en 60. */
const ANCHO_ENTRADAS = 6;
/** Salto respecto del numero anterior del mismo grupo. */
const ANCHO_SALTO = 6;
/** Copias, cuando no son 1, 2 ni 3. */
const ANCHO_COPIAS = 6;

/** El salto no cabe (o no hay anterior): el numero va entero detras. */
const SALTO_ESCAPE = (1 << ANCHO_SALTO) - 1;
/** Las copias no caben en dos bits: el numero va entero detras. */
const COPIAS_ESCAPE = 3;

/**
 * La forma de id que el formato binario sabe escribir: dos letras de edicion y
 * tres digitos, que es como los genera `fetch_edition.py`. Cualquier otra cosa
 * manda el enlace al formato 1, porque solo asi el id vuelve tal cual.
 */
const ID_IMPRESION = /^([a-z]{2})-(\d{3})$/;

/* ------------------------------------------------------------------ *
 * Bits
 *
 * Un escritor y un lector de campos de ancho arbitrario, que es lo que hace
 * corto el codigo: las copias de una carta ocupan dos bits y no un byte.
 * ------------------------------------------------------------------ */

class BitWriter {
  private readonly bytes: number[] = [];
  private actual = 0;
  private libres = 8;

  write(valor: number, ancho: number): void {
    for (let i = ancho - 1; i >= 0; i--) {
      this.libres--;
      this.actual |= ((valor >>> i) & 1) << this.libres;
      if (this.libres === 0) {
        this.bytes.push(this.actual);
        this.actual = 0;
        this.libres = 8;
      }
    }
  }

  /** Los bits que sobran del ultimo byte quedan en cero. */
  final(): Uint8Array {
    return new Uint8Array(this.libres === 8 ? this.bytes : [...this.bytes, this.actual]);
  }
}

class BitReader {
  private readonly datos: Uint8Array;
  private pos = 0;

  // Sin propiedad de parametro: Node ejecuta el TypeScript de los tests
  // borrando los tipos, y esa forma no la sabe borrar.
  constructor(datos: Uint8Array) {
    this.datos = datos;
  }

  /** Lanza si el codigo se acaba antes de lo que dice: lo atrapa `decodeBinario`. */
  read(ancho: number): number {
    let valor = 0;
    for (let i = 0; i < ancho; i++) {
      if (this.pos >= this.datos.length * 8) throw new RangeError("codigo cortado");
      const byte = this.datos[this.pos >> 3];
      valor = (valor << 1) | ((byte >> (7 - (this.pos & 7))) & 1);
      this.pos++;
    }
    return valor;
  }
}

/* ------------------------------------------------------------------ *
 * base64url
 *
 * A mano y no con Buffer: este codigo corre en el navegador. `btoa` y `atob`
 * estan en todas partes y no hay que cargar nada.
 * ------------------------------------------------------------------ */

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function aBase64Url(bytes: Uint8Array): string {
  let crudo = "";
  for (const b of bytes) crudo += String.fromCharCode(b);
  return btoa(crudo).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array | null {
  if (!BASE64URL.test(texto)) return null;
  let crudo: string;
  try {
    crudo = atob(texto.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
  const bytes = new Uint8Array(crudo.length);
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

/* ------------------------------------------------------------------ *
 * Enlace: escribir
 * ------------------------------------------------------------------ */

interface Ref {
  prefijo: number;
  numero: number;
}

function refDe(id: string): Ref | null {
  const m = ID_IMPRESION.exec(id);
  if (!m) return null;
  const prefijo = PREFIJOS.indexOf(m[1]);
  return prefijo < 0 ? null : { prefijo, numero: Number(m[2]) };
}

/**
 * Escribe una zona. Devuelve `false` si algo no cabe en el formato, y entonces
 * la baraja entera se codifica en el formato 1.
 */
function escribirZona(w: BitWriter, entradas: DeckEntry[]): boolean {
  const grupos = new Map<number, { numero: number; n: number }[]>();
  for (const e of entradas) {
    const ref = refDe(e.id);
    if (!ref || e.n < 1 || e.n > 1 << ANCHO_COPIAS) return false;
    const grupo = grupos.get(ref.prefijo);
    if (grupo) grupo.push({ numero: ref.numero, n: e.n });
    else grupos.set(ref.prefijo, [{ numero: ref.numero, n: e.n }]);
  }
  if (grupos.size >= 1 << ANCHO_GRUPOS) return false;

  w.write(grupos.size, ANCHO_GRUPOS);
  for (const [prefijo, grupo] of grupos) {
    if (grupo.length >= 1 << ANCHO_ENTRADAS) return false;
    grupo.sort((a, b) => a.numero - b.numero);
    w.write(prefijo, ANCHO_PREFIJO);
    w.write(grupo.length, ANCHO_ENTRADAS);

    let previo = -1;
    for (const { numero, n } of grupo) {
      // El primero va entero. Los demas, el salto respecto del anterior; si no
      // cabe —o si dos entradas repiten numero, que una baraja importada a mano
      // puede traer— se escapa y va entero tambien.
      const salto = numero - previo - 1;
      if (previo < 0 || salto < 0 || salto >= SALTO_ESCAPE) {
        w.write(SALTO_ESCAPE, ANCHO_SALTO);
        w.write(numero, ANCHO_NUMERO);
      } else {
        w.write(salto, ANCHO_SALTO);
      }
      previo = numero;

      // Casi siempre 1, 2 o 3 copias: dos bits. Los Oros sin habilidad no
      // tienen tope y se escapan.
      if (n - 1 < COPIAS_ESCAPE) w.write(n - 1, 2);
      else {
        w.write(COPIAS_ESCAPE, 2);
        w.write(n - 1, ANCHO_COPIAS);
      }
    }
  }
  return true;
}

/** El codigo binario, o `null` si esta baraja no se puede escribir asi. */
function encodeBinario(deck: Deck): string | null {
  const w = new BitWriter();
  w.write(WIRE_VERSION, ANCHO_VERSION);

  const nombre = new TextEncoder().encode(deck.nombre.slice(0, MAX_NOMBRE_BARAJA));
  if (nombre.length >= 1 << ANCHO_LARGO_NOMBRE) return null;
  w.write(nombre.length, ANCHO_LARGO_NOMBRE);
  for (const b of nombre) w.write(b, 8);

  const oro = deck.oroInicial ? refDe(deck.oroInicial) : null;
  if (deck.oroInicial && !oro) return null;
  w.write(oro ? 1 : 0, 1);
  if (oro) {
    w.write(oro.prefijo, ANCHO_PREFIJO);
    w.write(oro.numero, ANCHO_NUMERO);
  }

  if (!escribirZona(w, deck.principal)) return null;
  if (!escribirZona(w, deck.side)) return null;

  return aBase64Url(w.final());
}

/** [ version, nombre, oroInicial, principal, side ] */
function encodeLz(deck: Deck): string {
  const wire = [
    WIRE_VERSION_LZ,
    deck.nombre,
    deck.oroInicial,
    deck.principal.map((e) => [e.id, e.n]),
    deck.side.map((e) => [e.id, e.n]),
  ];
  return compressToEncodedURIComponent(JSON.stringify(wire));
}

export function encodeDeck(deck: Deck): string {
  return encodeBinario(deck) ?? encodeLz(deck);
}

/* ------------------------------------------------------------------ *
 * Enlace: leer
 * ------------------------------------------------------------------ */

export type DecodeResult =
  | { ok: true; deck: Deck }
  | { ok: false; motivo: "vacio" | "largo" | "ilegible" | "version"; mensaje: string };

const ILEGIBLE: DecodeResult = {
  ok: false,
  motivo: "ilegible",
  mensaje: "No pude leer la baraja de ese enlace. Puede que esté cortado.",
};

const DE_OTRA_VERSION: DecodeResult = {
  ok: false,
  motivo: "version",
  mensaje: "Ese enlace viene de otra versión de DeckForge y no lo puedo leer.",
};

/** Arma la baraja con id propio y fechas de ahora: para quien la recibe, es suya. */
function armar(
  nombre: string,
  oroInicial: string | null,
  principal: DeckEntry[],
  side: DeckEntry[],
): DecodeResult {
  const base = createDeck(nombre || "Baraja compartida");
  const parsed = deckSchema.safeParse({ ...base, oroInicial, principal, side });
  return parsed.success ? { ok: true, deck: parsed.data } : ILEGIBLE;
}

/**
 * El id de impresion de una referencia. `null` cuando el codigo nombra una
 * edicion que esta version no conoce todavia.
 */
function idDe(prefijo: number, numero: number): string | null {
  const pre = PREFIJOS[prefijo];
  return pre === undefined ? null : `${pre}-${String(numero).padStart(3, "0")}`;
}

/** Un bit de presencia y, si esta, la referencia a la carta. */
function leerOro(r: BitReader): string | null {
  if (!r.read(1)) return null;
  const prefijo = r.read(ANCHO_PREFIJO);
  const numero = r.read(ANCHO_NUMERO);
  return idDe(prefijo, numero);
}

function leerZona(r: BitReader): DeckEntry[] {
  const entradas: DeckEntry[] = [];
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

      // Una edicion que este codigo conoce y nosotros no: se descarta la
      // entrada y la baraja se abre sin ella, en vez de no abrirse. El contador
      // de cartas lo deja a la vista.
      const id = idDe(prefijo, numero);
      if (id) entradas.push({ id, n });
    }
  }
  return entradas;
}

/**
 * Lee el formato binario. `null` significa "esto no es un codigo binario mio",
 * y entonces se prueba como formato 1.
 */
function decodeBinario(codigo: string): DecodeResult | null {
  const bytes = deBase64Url(codigo);
  if (!bytes || bytes.length === 0) return null;

  const version = bytes[0];
  if (version !== WIRE_VERSION) {
    const mia = version > WIRE_VERSION && version <= MAX_VERSION_BINARIA;
    return mia ? DE_OTRA_VERSION : null;
  }

  try {
    const r = new BitReader(bytes);
    r.read(ANCHO_VERSION);
    const largo = r.read(ANCHO_LARGO_NOMBRE);
    const nombre = new Uint8Array(largo);
    for (let i = 0; i < largo; i++) nombre[i] = r.read(8);
    const oroInicial = leerOro(r);
    const principal = leerZona(r);
    const side = leerZona(r);
    return armar(new TextDecoder().decode(nombre), oroInicial, principal, side);
  } catch {
    // Un codigo cortado por el chat que lo llevaba, o que nunca fue una baraja.
    return null;
  }
}

const entradasSchema = z.array(
  // Mismo tope que el esquema de la baraja: los Oros sin habilidad no tienen limite.
  z.tuple([z.string().regex(SLUG), z.number().int().min(1).max(50)]),
);

const wireLzSchema = z.tuple([
  z.literal(WIRE_VERSION_LZ),
  // Igual que el esquema de la baraja: se admite leer mas largo de lo que se
  // deja escribir, para no romper un enlace hecho cuando el tope era otro.
  z.string().max(200),
  z.string().regex(SLUG).nullable(),
  entradasSchema.max(60),
  entradasSchema.max(20),
]);

function decodeLz(codigo: string): DecodeResult {
  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(codigo);
  } catch {
    return ILEGIBLE;
  }
  if (!json || json.length > MAX_JSON) return ILEGIBLE;

  let bruto: unknown;
  try {
    bruto = JSON.parse(json);
  } catch {
    return ILEGIBLE;
  }

  // La version se mira antes que el resto, para poder distinguir "viene de una
  // version que no conozco" de "esto no es una baraja".
  if (Array.isArray(bruto) && bruto[0] !== WIRE_VERSION_LZ) return DE_OTRA_VERSION;

  const parsed = wireLzSchema.safeParse(bruto);
  if (!parsed.success) return ILEGIBLE;

  const [, nombre, oroInicial, principal, side] = parsed.data;
  return armar(
    nombre,
    oroInicial,
    principal.map(([id, n]) => ({ id, n })),
    side.map(([id, n]) => ({ id, n })),
  );
}

/**
 * Reconstruye una baraja desde un codigo, del formato que sea. Nunca lanza.
 *
 * Solo valida la FORMA. Que las cartas existan se resuelve despues, en
 * `resolveDeck`, que reporta las desconocidas: asi un enlace viejo se sigue
 * abriendo aunque una carta haya cambiado de id.
 */
export function decodeDeck(codigo: string | null | undefined): DecodeResult {
  if (!codigo) {
    return { ok: false, motivo: "vacio", mensaje: "Ese enlace no trae ninguna baraja." };
  }
  if (codigo.length > MAX_CODIGO) {
    return {
      ok: false,
      motivo: "largo",
      mensaje: "Ese enlace es demasiado largo para ser una baraja.",
    };
  }

  // El formato binario primero, que es el que se escribe. Si el codigo no es
  // uno —o es uno roto— se prueba como formato 1, que es el que dice por que
  // no se pudo leer.
  return decodeBinario(codigo) ?? decodeLz(codigo);
}

/** El enlace completo para compartir, con la barra final que usa el sitio. */
export function shareUrl(deck: Deck, origen: string): string {
  return `${origen.replace(/\/$/, "")}/baraja/?d=${encodeDeck(deck)}`;
}

/* ------------------------------------------------------------------ *
 * Archivo de respaldo
 * ------------------------------------------------------------------ */

const FILE_VERSION = 1;

// `app` y `mazos` son formato en disco: los respaldos ya exportados por el
// usuario los llevan escritos, asi que no siguen a la palabra de la interfaz.
const archivoSchema = z.object({
  app: z.literal("deckforge"),
  v: z.literal(FILE_VERSION),
  mazos: z.array(z.unknown()).max(200),
});

export function exportFile(decks: Deck[]): string {
  return JSON.stringify(
    {
      app: "deckforge",
      v: FILE_VERSION,
      exportado: new Date().toISOString(),
      mazos: decks,
    },
    null,
    2,
  );
}

export interface ImportResult {
  barajas: Deck[];
  /** Cuantas entradas del archivo no se pudieron leer. */
  descartados: number;
}

/**
 * Lee un archivo de respaldo. Nunca lanza.
 *
 * Cada baraja se valida por separado y se le asigna un id nuevo, para que
 * importar dos veces el mismo archivo no pise lo que ya habia.
 */
export function importFile(texto: string): ImportResult | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }

  const sobre = archivoSchema.safeParse(bruto);
  if (!sobre.success) return null;

  const barajas: Deck[] = [];
  let descartados = 0;
  for (const m of sobre.data.mazos) {
    const parsed = deckSchema.safeParse(m);
    if (!parsed.success) {
      descartados++;
      continue;
    }
    barajas.push({ ...parsed.data, id: createDeck().id });
  }

  return { barajas, descartados };
}
