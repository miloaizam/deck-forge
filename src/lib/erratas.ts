import banlistJson from "../../documentos/fuente/banlist-estandar.json";
import feDeErratasJson from "../../documentos/fuente/fe-de-erratas.json";
import { keywordsPropias, sinRecordatorios } from "./ability";
import {
  banlistSchema,
  claveDeNombre,
  DOCUMENTOS,
  ETIQUETA_CAMBIO,
  feDeErratasSchema,
  type Cambio,
} from "./documentos";
import { ATRIBUTOS, RAZAS, type Atributo, type Card, type Raza } from "./types";
import { cambiosDeTexto } from "./word-diff";

/**
 * La Fe de Erratas y la Banlist, aplicadas a las cartas.
 *
 * El catalogo muestra el texto ORIGINAL de cada carta (el que se verifico
 * contra el arte) y la errata va aparte: el modal la ensena con su boton y la
 * grilla le pone un lazo. Las reglas de la baraja, en cambio, juegan con lo
 * erratado: una carta que la Banlist declara Unica topa en una copia aunque su
 * texto impreso no lo diga, y una baneada deja la baraja fuera del formato.
 *
 * Las entradas se asocian por NOMBRE (`claveDeNombre`, sin tildes ni
 * mayusculas), asi que alcanzan a todas las impresiones de la carta, Arte
 * Alternativo incluido. `erratas.test.ts` exige que cada entrada encuentre al
 * menos una carta del catalogo.
 *
 * Importa los JSON sin `node:fs`, asi que sirve igual en el cliente, en el
 * build y en los tests (scripts/ts-imports.mjs les pone el atributo json).
 */

const FE = feDeErratasSchema.parse(feDeErratasJson);
const BAN = banlistSchema.parse(banlistJson);

export type FuenteErrata = "fe-de-erratas" | "banlist";

/** Una errata para mostrar en el modal de la carta. */
export interface ErrataDeCarta {
  fuente: FuenteErrata;
  /** Que cambia. "nota" es una errata de la Banlist en prosa ("Errante"). */
  cambio: Cambio | "nota";
  /** "Donde dice". `null` si el documento no lo da. */
  antes: string | null;
  /** "Debe decir", o la nota de la Banlist. */
  despues: string;
  /** Una aclaracion del propio documento. */
  nota?: string;
}

/** Donde se lee cada documento en el sitio. */
export const RUTA_DE_FUENTE: Record<FuenteErrata, string> = {
  "fe-de-erratas": DOCUMENTOS.feDeErratas.ruta,
  banlist: DOCUMENTOS.banlist.ruta,
};

export const NOMBRE_DE_FUENTE: Record<FuenteErrata, string> = {
  "fe-de-erratas": "Fe de Erratas",
  banlist: "Banlist",
};

/**
 * Las entradas de la Banlist que no nombran una carta sino una regla de
 * construccion, con las cartas a las que se le muestran.
 */
const REGLAS_DE_CONSTRUCCION: Record<string, string[]> = {
  "Mazo Desafiante y/o Guerrero": ["Shingas", "Karna"],
};

const POR_NOMBRE = new Map<string, ErrataDeCarta[]>();
function agregar(nombre: string, e: ErrataDeCarta) {
  const k = claveDeNombre(nombre);
  // Lo que hace cada keyword no se explica, igual que en el catalogo: la Fe de
  // Erratas copia la carta con sus recordatorios ("Única (Sólo puedes tener
  // una copia…)") y en el panel ahogan lo que cambia.
  const limpia =
    e.cambio === "habilidad" || e.cambio === "nota"
      ? {
          ...e,
          antes: e.antes && sinRecordatorios(e.antes),
          despues: sinRecordatorios(e.despues),
        }
      : e;
  POR_NOMBRE.set(k, [...(POR_NOMBRE.get(k) ?? []), limpia]);
}

for (const e of FE.entradas) {
  const errata: ErrataDeCarta = {
    fuente: "fe-de-erratas",
    cambio: e.cambio,
    antes: e.antes ?? e.versiones?.[0] ?? null,
    despues: e.despues,
    nota: e.nota,
  };
  agregar(e.nombre, errata);
  // Una errata de nombre se encuentra tambien por el nombre nuevo.
  if (e.cambio === "nombre" && claveDeNombre(e.despues) !== claveDeNombre(e.nombre)) {
    agregar(e.despues, errata);
  }
}
for (const nombre of BAN.unicas) {
  agregar(nombre, {
    fuente: "banlist",
    cambio: "nota",
    antes: null,
    despues: "Carta Única.",
  });
}
for (const c of BAN.observacion.condiciones) {
  if (c.condicion) {
    agregar(c.carta, {
      fuente: "banlist",
      cambio: "nota",
      antes: null,
      despues: `${c.condicion}.`,
    });
  }
}
for (const e of BAN.erratas) {
  const errata: ErrataDeCarta = {
    fuente: "banlist",
    cambio: "nota",
    antes: null,
    despues: /[.]$/.test(e.texto) ? e.texto : `${e.texto}.`,
  };
  const destinos = REGLAS_DE_CONSTRUCCION[e.carta];
  if (destinos) {
    for (const d of destinos) agregar(d, { ...errata, nota: e.carta });
  } else {
    agregar(e.carta, errata);
  }
}

const BANEADAS = new Set(BAN.prohibidas.map(claveDeNombre));

/** Las erratas de la carta, de los dos documentos. Vacio si no tiene. */
export function erratasDe(card: Pick<Card, "nombre">): ErrataDeCarta[] {
  return POR_NOMBRE.get(claveDeNombre(card.nombre)) ?? [];
}

export function tieneErrata(card: Pick<Card, "nombre">): boolean {
  return POR_NOMBRE.has(claveDeNombre(card.nombre));
}

/** Si la Banlist la prohibe. Se puede jugar igual, pero fuera del formato. */
export function estaBaneada(card: Pick<Card, "nombre">): boolean {
  return BANEADAS.has(claveDeNombre(card.nombre));
}

/** Lo que una errata cambia de cara a las reglas de la baraja. */
export interface EfectoEnReglas {
  unica?: boolean;
  raza?: Raza;
  atributo?: Atributo;
  coste?: number;
}

/**
 * Los efectos que no se leen del texto de forma mecanica, escritos a mano
 * desde la Banlist. Cada uno cita la entrada.
 */
const EFECTOS_A_MANO: Record<string, EfectoEnReglas> = {
  // "Aliado de raza Faerie: pasa de ser Carta Unica a Errante."
  [claveDeNombre("Tsukuyomi")]: { unica: false },
  // "Aliado raza Barbaro coste 2 fuerza 3: cambia su coste a 1 y solo puede
  // disparar su habilidad si solo controlas Aliados de raza Barbaro."
  [claveDeNombre("Arjumand Banu Begum")]: { coste: 1 },
  // "Pasa a tener Oscuridad. Dicho atributo solo se considera para mazos con
  // la mecanica Oscuridad." En las reglas el atributo solo abre la via del
  // atributo, asi que basta con darselo.
  [claveDeNombre("Harionna")]: { atributo: "Oscuridad" },
};

const EFECTOS = new Map<string, EfectoEnReglas>();
function efecto(nombre: string, e: EfectoEnReglas) {
  const k = claveDeNombre(nombre);
  EFECTOS.set(k, { ...EFECTOS.get(k), ...e });
}
for (const nombre of BAN.unicas) efecto(nombre, { unica: true });
for (const c of BAN.observacion.condiciones) {
  if (c.condicion === "Carta Única") efecto(c.carta, { unica: true });
}
for (const e of BAN.erratas) {
  // "Carta Unica." dentro de la errata (Krisna, Wyvern Dorado, Jarnvid).
  if (/(^|\. )Carta Única/.test(e.texto)) efecto(e.carta, { unica: true });
}
for (const e of FE.entradas) {
  // Solo se SUMA: el "debe decir" a veces es un trozo de la habilidad (Ataque
  // de Dragon, Vodyanoy) y no traer "Unica" no quiere decir perderla.
  if (e.cambio === "habilidad" && keywordsPropias(e.despues).includes("Única")) {
    efecto(e.nombre, { unica: true });
  }
  if (e.cambio === "raza" && (RAZAS as readonly string[]).includes(e.despues)) {
    efecto(e.nombre, { raza: e.despues as Raza }); // validado justo arriba
  }
}
for (const [k, e] of Object.entries(EFECTOS_A_MANO)) {
  EFECTOS.set(k, { ...EFECTOS.get(k), ...e });
}
// Que la tabla a mano no nombre un atributo que no existe.
for (const e of EFECTOS.values()) {
  if (e.atributo && !(ATRIBUTOS as readonly string[]).includes(e.atributo)) {
    throw new Error(`atributo desconocido: ${e.atributo}`);
  }
}

export function efectoEnReglas(card: Pick<Card, "nombre">): EfectoEnReglas {
  return EFECTOS.get(claveDeNombre(card.nombre)) ?? {};
}

/** Todos los nombres con alguna errata o efecto, para los tests. */
export function nombresConErrata(): string[] {
  return [...POR_NOMBRE.keys(), ...BANEADAS];
}

/** Un cambio de la errata unica de una carta, listo para mostrar. */
export type CambioDeErrata =
  | { tipo: "texto"; sale: string; entra: string }
  | { tipo: "dato"; etiqueta: string; sale: string | null; entra: string }
  | { tipo: "nota"; texto: string };

/** La errata de una carta, juntando la Fe de Erratas y la Banlist. */
export interface ErrataUnica {
  cambios: CambioDeErrata[];
  fuentes: FuenteErrata[];
}

/** Las palabras de un texto, sin tildes, mayusculas ni puntuacion. */
const palabras = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((p) => p && p !== "carta");

/**
 * Si la nota de la Banlist ya la dice otra errata: "Carta Unica." cuando la
 * Fe de Erratas suma "Unica", "Raza Dragon." cuando cambia la raza, o la misma
 * habilidad copiada casi palabra por palabra. Se mide por cuantas de sus
 * palabras estan en lo otro.
 */
function yaDicha(nota: string, otros: string[]): boolean {
  if (/^Se corrige su texto/.test(nota) && otros.length > 0) return true;
  const propias = palabras(nota);
  if (propias.length === 0) return true;
  return otros.some((o) => {
    const set = new Set(palabras(o));
    return propias.filter((p) => set.has(p)).length / propias.length >= 0.75;
  });
}

/** Un punto pegado a la frase siguiente ("Errante.En") se separa para el diff. */
const separarFrases = (s: string) => s.replace(/\.(?=\p{Lu})/gu, ". ");

/**
 * La errata de la carta en UNA sola lista: solo lo que cambia, sin el texto
 * entero (ese ya esta en el modal), y sin repetir lo que la Banlist dice de
 * nuevo cuando la Fe de Erratas ya lo dijo. Null si no tiene errata.
 */
export function errataUnica(card: Pick<Card, "nombre">): ErrataUnica | null {
  const todas = erratasDe(card);
  if (todas.length === 0) return null;
  const cambios: CambioDeErrata[] = [];
  const fuentes = new Set<FuenteErrata>();
  const dichas: string[] = [];

  for (const e of todas) {
    if (e.cambio === "nota") continue;
    fuentes.add(e.fuente);
    if (e.cambio === "habilidad") {
      dichas.push(e.despues);
      if (!e.antes) {
        cambios.push({ tipo: "nota", texto: e.despues });
        continue;
      }
      const antes = separarFrases(e.antes);
      const despues = separarFrases(e.despues);
      const trozos = cambiosDeTexto(antes, despues);
      // Si la errata reescribe media carta, los trozos sueltos no se leen:
      // va el texto nuevo entero.
      const nuevas = trozos.reduce((n, c) => n + palabras(c.entra).length, 0);
      if (nuevas > palabras(despues).length * 0.5) {
        cambios.push({ tipo: "nota", texto: despues });
      } else {
        for (const c of trozos) {
          // Un punto o una mayuscula de diferencia no es lo que cambia.
          if (palabras(c.sale).join(" ") === palabras(c.entra).join(" ")) continue;
          cambios.push({ tipo: "texto", ...c });
        }
      }
    } else {
      dichas.push(`${ETIQUETA_CAMBIO[e.cambio]} ${e.despues}`);
      cambios.push({
        tipo: "dato",
        etiqueta: ETIQUETA_CAMBIO[e.cambio],
        sale: e.antes,
        entra: e.despues,
      });
    }
  }
  // Las notas de la Banlist, de la mas larga a la mas corta: asi "Carta
  // Unica." cae como repetida cuando otra nota ya la dice.
  const notas = todas
    .filter((e) => e.cambio === "nota")
    .sort((a, b) => b.despues.length - a.despues.length);
  for (const e of notas) {
    if (yaDicha(e.despues, dichas)) continue;
    dichas.push(e.despues);
    fuentes.add(e.fuente);
    cambios.push({ tipo: "nota", texto: e.despues });
  }
  return { cambios, fuentes: [...fuentes] };
}
