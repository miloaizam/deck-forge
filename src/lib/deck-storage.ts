import { deckSchema, MAX_NOMBRE_BARAJA, type Deck } from "./types";

/**
 * Las barajas del usuario, guardados en su navegador.
 *
 * No lleva `"use client"` a proposito: asi un Server Component puede importar
 * la clave sin que Next le entregue una referencia de cliente en vez del valor
 * (es la trampa documentada en `src/lib/theme.ts`). Las funciones que tocan
 * `localStorage` se defienden solas de correr en el servidor.
 */

export const DECKS_KEY = "deckforge-decks";

/** Tope de barajas guardadas. Es un limite de cordura, no del formato. */
export const MAX_BARAJAS = 50;

/** Cota antes de parsear: localStorage puede traer cualquier cosa. */
const MAX_CHARS = 512 * 1024;

const disponible = () => typeof window !== "undefined";

/**
 * Convierte lo que haya en localStorage en barajas, descartando lo que no cuadre.
 *
 * `localStorage` lo puede editar el usuario o cualquier extension, asi que se
 * valida con `safeParse` y **cada baraja por separado**: una corrupta no puede
 * llevarse por delante a los otros diecinueve. Cualquier fallo devuelve lo que
 * se haya podido rescatar, nunca una excepcion.
 */
export function parseDecks(raw: string | null): Deck[] {
  if (!raw || raw.length > MAX_CHARS) return [];

  let bruto: unknown;
  try {
    bruto = JSON.parse(raw);
  } catch {
    return [];
  }

  // El sobre se parsea flojo para poder rescatar las barajas una a una.
  //
  // El campo se llama `mazos` y no `barajas` a proposito: es formato en disco,
  // ya escrito en el localStorage de cada usuario. Renombrarlo dejaria la lista
  // vacia a quien tenga barajas guardadas. La palabra de la interfaz es
  // "baraja"; la del sobre se queda como nacio.
  const lista = Array.isArray(bruto)
    ? bruto
    : typeof bruto === "object" && bruto !== null && "mazos" in bruto
      ? bruto.mazos
      : null;
  if (!Array.isArray(lista)) return [];

  return lista
    .map((m) => deckSchema.safeParse(m))
    .filter((r) => r.success)
    .map((r) => r.data)
    .slice(0, MAX_BARAJAS);
}

export function readDecks(): Deck[] {
  if (!disponible()) return [];
  try {
    return parseDecks(localStorage.getItem(DECKS_KEY));
  } catch {
    return []; // ventana privada, cookies bloqueadas
  }
}

export function readDeck(id: string): Deck | null {
  return readDecks().find((d) => d.id === id) ?? null;
}

/* ------------------------------------------------------------------ *
 * Las barajas como sistema externo
 *
 * localStorage no existe en tiempo de build, asi que la lista no se puede
 * calcular al renderizar. Se expone como un store para que React la lea con
 * `useSyncExternalStore`, que es el primitivo hecho para esto: nada de leerla
 * en un efecto y llamar a setState, que dispara renders en cascada.
 *
 * De paso se gana sincronizacion entre pestanas: si guardas una baraja en una, la
 * lista de la otra se entera.
 * ------------------------------------------------------------------ */

/**
 * `useSyncExternalStore` compara la instantanea por identidad, asi que tiene
 * que ser la MISMA referencia mientras nada cambie o React entra en bucle.
 */
let cache: Deck[] | null = null;
const oyentes = new Set<() => void>();

/** Instantanea del servidor y del primer render: siempre el mismo array. */
const VACIO: Deck[] = [];

function avisar(): void {
  cache = null;
  for (const cb of oyentes) cb();
}

function alCambiarStorage(e: StorageEvent): void {
  if (e.key === DECKS_KEY || e.key === null) avisar();
}

export function subscribeDecks(cb: () => void): () => void {
  if (oyentes.size === 0 && disponible()) {
    window.addEventListener("storage", alCambiarStorage);
  }
  oyentes.add(cb);

  return () => {
    oyentes.delete(cb);
    if (oyentes.size === 0 && disponible()) {
      window.removeEventListener("storage", alCambiarStorage);
    }
  };
}

export function getDecksSnapshot(): Deck[] {
  if (cache === null) cache = readDecks();
  return cache;
}

export function getServerDecksSnapshot(): Deck[] {
  return VACIO;
}

/**
 * Guarda la lista completa. Devuelve si pudo.
 *
 * Puede fallar por cuota llena, y que la baraja no persista es molesto pero que
 * reviente la pagina es peor: quien llame decide como avisarlo.
 */
export function saveDecks(decks: Deck[]): boolean {
  if (!disponible()) return false;
  try {
    const sobre = { v: 1, mazos: decks.slice(0, MAX_BARAJAS) };
    localStorage.setItem(DECKS_KEY, JSON.stringify(sobre));
    avisar();
    return true;
  } catch {
    return false;
  }
}

/**
 * Dos barajas no pueden llamarse igual: en Mis barajas no se sabria cual es
 * cual. Se comparan sin mayusculas, sin espacios de mas y en la misma forma
 * Unicode, para que "Dragón  Control" y "dragón control" choquen.
 */
function claveNombre(nombre: string): string {
  return nombre.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

/**
 * Si ya hay otra baraja con ese nombre. `excepto` es la propia baraja: guardar
 * los cambios de una sin tocarle el nombre no es un choque. Un nombre vacio no
 * choca con nada (el constructor ya exige uno para guardar).
 */
export function nombreOcupado(
  nombre: string,
  barajas: Deck[],
  excepto?: string,
): boolean {
  const clave = claveNombre(nombre);
  if (clave === "") return false;
  return barajas.some((d) => d.id !== excepto && claveNombre(d.nombre) === clave);
}

/** " (copia)" o " (copia 3)" al final de un nombre. */
const SUFIJO_COPIA = / \(copia(?: \d+)?\)$/;

/**
 * El nombre tal cual si esta libre; si no, con " (copia)", " (copia 2)"… hasta
 * dar con uno libre. Lo usan importar, duplicar y guardar una baraja
 * compartida: ahi el usuario no eligio el nombre, asi que se resuelve solo en
 * vez de rechazar. Crear una en el constructor si rechaza (`nombreOcupado`).
 *
 * Duplicar "X (copia)" da "X (copia 2)", no "X (copia) (copia)": el sufijo que
 * ya traiga se quita antes. Y la base se recorta para que el sufijo quepa en
 * MAX_NOMBRE_BARAJA.
 */
export function nombreLibre(nombre: string, barajas: Deck[]): string {
  if (!nombreOcupado(nombre, barajas)) return nombre;
  const base = nombre.trim().replace(SUFIJO_COPIA, "");
  for (let n = 1; ; n++) {
    const sufijo = n === 1 ? " (copia)" : ` (copia ${n})`;
    const candidato = base.slice(0, MAX_NOMBRE_BARAJA - sufijo.length).trimEnd() + sufijo;
    if (!nombreOcupado(candidato, barajas)) return candidato;
  }
}

export interface MergeResult {
  lista: Deck[];
  /** Cuantas de las importadas entraron. */
  entraron: number;
  /** Cuantas no cupieron bajo MAX_BARAJAS. */
  sobraron: number;
  /** Cuantas entraron con otro nombre, porque el suyo ya estaba tomado. */
  renombradas: number;
}

/**
 * Suma barajas importadas a las que ya hay, SIN desplazar ninguna.
 *
 * `saveDecks` recorta a MAX_BARAJAS quedandose con las primeras, asi que poner
 * las importadas delante y guardar tal cual dejaba que un archivo con 50
 * barajas borrara todas las del usuario, mientras la interfaz decia
 * que se habian importado 50. Ahora entra solo lo que cabe, y quien llama dice cuantas
 * quedaron fuera.
 */
export function mergeImported(existentes: Deck[], nuevas: Deck[]): MergeResult {
  const hueco = Math.max(0, MAX_BARAJAS - existentes.length);
  // Cada una se compara con las que ya habia y con las que entraron antes que
  // ella: un archivo con dos barajas del mismo nombre tambien choca consigo.
  const vistas = [...existentes];
  let renombradas = 0;
  const entran = nuevas.slice(0, hueco).map((d) => {
    const nombre = nombreLibre(d.nombre, vistas);
    if (nombre !== d.nombre) renombradas++;
    const deck = nombre === d.nombre ? d : { ...d, nombre };
    vistas.push(deck);
    return deck;
  });
  return {
    lista: [...entran, ...existentes],
    entraron: entran.length,
    sobraron: nuevas.length - entran.length,
    renombradas,
  };
}

/**
 * La lista con `deck` primera: reemplaza la que tenga su id o, si es nueva, la
 * suma. Devuelve `null` si es nueva y ya hay MAX_BARAJAS.
 *
 * **Nunca desplaza.** `saveDecks` recorta quedandose con las primeras, asi que
 * poner una nueva delante con la lista llena expulsaba en silencio la mas
 * vieja. Es el mismo criterio de `mergeImported`, por el otro camino.
 */
export function insertDeck(lista: Deck[], deck: Deck): Deck[] | null {
  const resto = lista.filter((d) => d.id !== deck.id);
  if (resto.length === lista.length && lista.length >= MAX_BARAJAS) return null;
  return [deck, ...resto];
}

/**
 * Lo que pasa al guardar una baraja: `lleno` es el tope de MAX_BARAJAS y
 * `sin-espacio`, que el navegador no dejo escribir (cuota llena o
 * almacenamiento bloqueado). Se distinguen porque el remedio es otro.
 */
export type GuardarResultado = "ok" | "lleno" | "sin-espacio";

/** Inserta o reemplaza una baraja, dejando la mas reciente primera. */
export function saveDeck(deck: Deck): GuardarResultado {
  const lista = insertDeck(readDecks(), deck);
  if (!lista) return "lleno";
  return saveDecks(lista) ? "ok" : "sin-espacio";
}

/** El aviso de una baraja que no se pudo guardar, igual en todas las vistas. */
export function mensajeNoGuardada(
  resultado: Exclude<GuardarResultado, "ok">,
  accion = "guardar",
): string {
  return resultado === "lleno"
    ? `No se pudo ${accion}: ya hay ${MAX_BARAJAS} barajas guardadas, el máximo. Elimina alguna para hacer espacio.`
    : `No se pudo ${accion}: el almacenamiento del navegador está lleno.`;
}

export function deleteDeck(id: string): boolean {
  return saveDecks(readDecks().filter((d) => d.id !== id));
}
