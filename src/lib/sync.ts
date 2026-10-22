import * as z from "zod/mini";

import { estaVacia, fusionar, sanearColeccion, type Coleccion } from "./coleccion";
import { MAX_BARAJAS, nombreLibre, type Lapida } from "./deck-storage";
import { deckSchema, type Deck } from "./types";

/**
 * La sincronizacion de barajas y coleccion con la cuenta, como logica pura:
 * sin red, sin React y sin `localStorage`. Recibe lo que hay en el navegador y
 * lo que hay en la nube, y dice que escribir en cada lado. La red la pone
 * `src/components/nube/nube.ts`.
 *
 * La regla es una sola: **gana el mas reciente**, comparando `actualizado`.
 * Un borrado tambien tiene fecha (la lapida), asi que un borrado viejo no se
 * lleva una edicion nueva hecha en otro equipo, ni una edicion vieja revive
 * una baraja borrada despues.
 *
 * En la nube solo hay ids de cartas y copias: lo mismo que se guarda en el
 * navegador (`deckSchema`). Las cartas se resuelven por id en el sitio.
 */

/* ------------------------------------------------------------------ *
 * Lo que llega de la nube se valida como todo lo de afuera (seguridad #4)
 * ------------------------------------------------------------------ */

const fechaMs = z.int().check(z.nonnegative());
const contador = z.int().check(z.nonnegative());

/** Una fila de `barajas`, como la devuelve la API al dueno. */
export const filaBarajaSchema = z.object({
  id: z.string().check(z.regex(/^[a-z0-9]{10}$/)),
  datos: z.unknown(),
  actualizado: fechaMs,
  borrada: z.boolean(),
  publica: z.boolean(),
  public_id: z.string().check(z.uuid()),
  oculta: z.boolean(),
  likes: contador,
  copias: contador,
  afinidad: z.nullable(z.string().check(z.maxLength(40))),
});
export type FilaBaraja = z.infer<typeof filaBarajaSchema>;

/** Una baraja en la nube, ya leida. `deck` es null si esta borrada. */
export interface Remota {
  id: string;
  deck: Deck | null;
  actualizado: number;
}

/** Lo publico de una baraja propia, para Mis barajas y su detalle. */
export interface EstadoPublico {
  publicId: string;
  publica: boolean;
  oculta: boolean;
  likes: number;
  copias: number;
  /** La afinidad con que se lista (`claveAfinidad` de comunidad.ts). */
  afinidad: string | null;
}

/**
 * Las filas de la nube en barajas validas. Una fila cuyo `datos` no pasa
 * `deckSchema`, o cuyo id interno no coincide con el de la fila, se ignora:
 * no se borra ni se trae.
 */
export function leerFilas(filas: unknown): {
  remotas: Remota[];
  publicas: Record<string, EstadoPublico>;
} {
  const lista = z.array(z.unknown()).check(z.maxLength(1000)).safeParse(filas);
  const remotas: Remota[] = [];
  const publicas: Record<string, EstadoPublico> = {};
  for (const bruta of lista.success ? lista.data : []) {
    const fila = filaBarajaSchema.safeParse(bruta);
    if (!fila.success) continue;
    const f = fila.data;
    if (f.borrada) {
      remotas.push({ id: f.id, deck: null, actualizado: f.actualizado });
      continue;
    }
    const deck = deckSchema.safeParse(f.datos);
    if (!deck.success || deck.data.id !== f.id) continue;
    remotas.push({ id: f.id, deck: deck.data, actualizado: f.actualizado });
    publicas[f.id] = {
      publicId: f.public_id,
      publica: f.publica,
      oculta: f.oculta,
      likes: f.likes,
      copias: f.copias,
      afinidad: f.afinidad,
    };
  }
  return { remotas, publicas };
}

/* ------------------------------------------------------------------ *
 * Barajas
 * ------------------------------------------------------------------ */

export interface PlanBarajas {
  /** La lista que queda en el navegador. */
  locales: Deck[];
  /** Si `locales` difiere de lo que habia (hay que guardarla). */
  cambioLocal: boolean;
  /** Barajas que suben a la nube (nuevas o mas recientes que las de alla). */
  subir: Deck[];
  /** Barajas que se marcan borradas en la nube, con la fecha del borrado. */
  borrar: Lapida[];
  /** Cuantas llegaron de la nube y entraron al navegador. */
  traidas: number;
  /** Cuantas de la nube no cupieron bajo MAX_BARAJAS (se quedan alla). */
  noCupieron: number;
}

/**
 * Junta las barajas del navegador con las de la nube.
 *
 * Por cada id: si esta en un solo lado, pasa al otro; si esta en los dos,
 * gana el `actualizado` mayor; si en un lado esta borrada, la lapida compite
 * con su fecha igual que una edicion. Empate: no se toca nada.
 *
 * **Nunca desplaza**, con el criterio de `mergeImported`: lo que llega de la
 * nube entra solo si cabe bajo MAX_BARAJAS, empezando por lo mas reciente, y
 * lo que no cabe se queda en la nube sin borrarse. Si una que llega choca de
 * nombre con otra del navegador, entra renombrada con `nombreLibre` y sube
 * asi, para que el nombre nuevo quede tambien alla.
 *
 * `ahora` es la fecha de esa reescritura (inyectada para los tests).
 */
export function fusionarBarajas(
  locales: Deck[],
  remotas: Remota[],
  lapidas: Lapida[],
  ahora: number,
): PlanBarajas {
  const remotaDe = new Map(remotas.map((r) => [r.id, r]));
  const lapidaDe = new Map(lapidas.map((l) => [l.id, l.borrada]));

  const subir: Deck[] = [];
  const borrar: Lapida[] = [];
  let cambioLocal = false;

  // 1. Lo que hay en el navegador, contra la nube.
  const quedan: Deck[] = [];
  for (const local of locales) {
    const remota = remotaDe.get(local.id);
    if (!remota || local.actualizado > remota.actualizado) {
      subir.push(local);
      quedan.push(local);
    } else if (remota.actualizado > local.actualizado) {
      cambioLocal = true;
      if (remota.deck) quedan.push(remota.deck);
      // Borrada en la nube despues de la ultima edicion de aqui: se va.
    } else {
      quedan.push(local);
    }
  }

  // 2. Lo borrado en el navegador que la nube todavia tiene viva.
  const enLocal = new Set(locales.map((d) => d.id));
  const restaurar: Deck[] = [];
  for (const [id, borrada] of lapidaDe) {
    if (enLocal.has(id)) continue;
    const remota = remotaDe.get(id);
    if (!remota?.deck) continue; // ya borrada alla, o nunca subio
    if (borrada >= remota.actualizado) borrar.push({ id, borrada });
    else restaurar.push(remota.deck); // se edito alla despues de borrarla aqui
  }

  // 3. Lo que solo esta en la nube, de lo mas reciente a lo mas viejo.
  const nuevas = remotas
    .flatMap((r) => (r.deck && !enLocal.has(r.id) && !lapidaDe.has(r.id) ? [r.deck] : []))
    .concat(restaurar)
    .sort((a, b) => b.actualizado - a.actualizado);

  // Entran delante, como una baraja recien guardada; las de aqui conservan
  // su orden.
  const llegan: Deck[] = [];
  let noCupieron = 0;
  for (const deck of nuevas) {
    if (quedan.length + llegan.length >= MAX_BARAJAS) {
      noCupieron++;
      continue;
    }
    const nombre = nombreLibre(deck.nombre, [...llegan, ...quedan]);
    if (nombre === deck.nombre) {
      llegan.push(deck);
    } else {
      const renombrada = { ...deck, nombre, actualizado: ahora };
      llegan.push(renombrada);
      subir.push(renombrada);
    }
    cambioLocal = true;
  }

  return {
    locales: [...llegan, ...quedan],
    cambioLocal,
    subir,
    borrar,
    traidas: llegan.length,
    noCupieron,
  };
}

/* ------------------------------------------------------------------ *
 * Coleccion
 * ------------------------------------------------------------------ */

export interface ColeccionFechada {
  coleccion: Coleccion;
  /** Cuando cambio, en ms. 0 si no se sabe (un sobre viejo). */
  actualizado: number;
}

/** El `datos` de la fila de `colecciones`, validado entrada por entrada. */
export function leerColeccionRemota(
  datos: unknown,
  actualizado: unknown,
): ColeccionFechada {
  const fecha = fechaMs.safeParse(actualizado);
  const sobre = typeof datos === "object" && datos !== null ? datos : {};
  const cartas = "cartas" in sobre ? sobre.cartas : undefined;
  const quiero = "quiero" in sobre ? sobre.quiero : undefined;
  return {
    coleccion: sanearColeccion(cartas, quiero).coleccion,
    actualizado: fecha.success ? fecha.data : 0,
  };
}

/** Lo que va en `datos`: el mismo sobre que en el navegador. */
export const coleccionComoDatos = (col: Coleccion) => ({
  cartas: col.tengo,
  quiero: col.quiero,
});

export interface PlanColeccion {
  /** Lo que se guarda en el navegador, o null si no cambia. */
  local: ColeccionFechada | null;
  /** Lo que sube a la nube, o null si no hace falta. */
  subir: ColeccionFechada | null;
}

const misma = (a: Coleccion, b: Coleccion) =>
  JSON.stringify(coleccionComoDatos(a)) === JSON.stringify(coleccionComoDatos(b));

/**
 * Junta la coleccion del navegador con la de la nube.
 *
 * La **primera vez** que este navegador se une a la cuenta no se elige una:
 * se suman con `fusionar` (la cantidad mayor de cada carta), igual que al
 * importar un respaldo, para que entrar no le borre nada a nadie. Despues,
 * gana la mas reciente entera.
 */
export function fusionarColecciones(
  local: ColeccionFechada,
  remota: ColeccionFechada | null,
  primeraVez: boolean,
  ahora: number,
): PlanColeccion {
  if (!remota) {
    if (estaVacia(local.coleccion)) return { local: null, subir: null };
    return { local: null, subir: { ...local, actualizado: local.actualizado || ahora } };
  }
  if (primeraVez) {
    const junta = fusionar(remota.coleccion, local.coleccion);
    if (misma(junta, remota.coleccion)) {
      return misma(junta, local.coleccion)
        ? { local: null, subir: null }
        : { local: remota, subir: null };
    }
    const nueva = { coleccion: junta, actualizado: ahora };
    return { local: misma(junta, local.coleccion) ? null : nueva, subir: nueva };
  }
  if (local.actualizado > remota.actualizado) return { local: null, subir: local };
  if (remota.actualizado > local.actualizado) return { local: remota, subir: null };
  return { local: null, subir: null };
}
