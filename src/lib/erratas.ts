import banlistJson from "../../documentos/fuente/banlist-estandar.json";
import feDeErratasJson from "../../documentos/fuente/fe-de-erratas.json";
import { keywordsPropias, sinRecordatorios, splitAbility } from "./ability";
import { TEXTOS_ERRATADOS } from "./erratas-aplicadas";
import {
  banlistSchema,
  claveDeNombre,
  feDeErratasSchema,
  type Cambio,
} from "./documentos";
import { ATRIBUTOS, RAZAS, type Atributo, type Card, type Raza } from "./types";

/**
 * La Fe de Erratas y la Banlist, aplicadas a las cartas.
 *
 * `cards.json` guarda el texto IMPRESO de cada carta (el que se verifico
 * contra el arte); `getCards()` le aplica las erratas con `conErratas()`, asi
 * que el catalogo, el buscador y las reglas ven el texto vigente. La grilla y
 * el modal ponen un lazo en la imagen de la carta erratada o baneada. Una
 * carta que la Banlist declara Unica topa en una copia, y una baneada deja la
 * baraja fuera del formato.
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

/** Una entrada de los documentos que alcanza a una carta. */
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
  // una copia…)").
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

/**
 * Donde va una keyword nueva: delante de las que la carta ya declara al
 * comienzo ("Furia. Cuando…" -> "Errante. Furia. Cuando…"), o en una linea
 * propia si no declara ninguna.
 */
function declarar(texto: string, keyword: string): string {
  if (keywordsPropias(texto).includes(keyword)) return texto;
  if (texto.trim() === "") return `${keyword}.`;
  const [primera, ...resto] = texto.split("\n");
  if (splitAbility(primera).keywords.length > 0) {
    return [`${keyword}. ${primera}`, ...resto].join("\n");
  }
  return [`${keyword}.`, primera, ...resto].join("\n");
}

/** Una keyword que la errata quita (Tsukuyomi deja de ser Unica). */
function quitarDeclaracion(texto: string, keyword: string): string {
  return texto
    .split("\n")
    .map((l) =>
      splitAbility(l).cuerpo === ""
        ? l.replace(new RegExp(`${keyword}\\.\\s*`, "u"), "").trim()
        : l,
    )
    .filter((l) => l !== "")
    .join("\n");
}

/**
 * La carta con la Fe de Erratas y la Banlist aplicadas: el texto vigente, que
 * es el que muestra el catalogo y el que se juega. El lazo de la imagen
 * (`CardRibbons`) avisa que el texto no es el impreso.
 *
 * Cambia la habilidad (con `TEXTOS_ERRATADOS` y las Unicas de los dos
 * documentos), las keywords que de ella salen, el nombre, la raza, el
 * atributo y el coste. Las keywords que la carta tiene por una condicion de
 * su texto, que no se leen de la declaracion (`keywords.test.ts`), se
 * conservan. Las cartas sin errata salen tal cual, la misma referencia.
 */
export function conErratas(card: Card): Card {
  const texto = TEXTOS_ERRATADOS[card.nombre];
  const efecto = efectoEnReglas(card);
  if (!texto && Object.keys(efecto).length === 0) return card;

  let habilidad = card.habilidad;
  for (const [antes, despues] of texto?.cambia ?? []) {
    habilidad = habilidad.replace(antes, despues);
  }
  if (texto?.agrega) habilidad = `${habilidad}\n${texto.agrega}`;
  for (const k of texto?.declara ?? []) habilidad = declarar(habilidad, k);
  if (efecto.atributo) habilidad = declarar(habilidad, efecto.atributo);
  if (efecto.unica === true) habilidad = declarar(habilidad, "Única");
  if (efecto.unica === false) habilidad = quitarDeclaracion(habilidad, "Única");

  const antes = new Set(keywordsPropias(card.habilidad));
  const condicionales = card.keywords.filter((k) => !antes.has(k));
  const keywords = [...new Set([...keywordsPropias(habilidad), ...condicionales])];

  return {
    ...card,
    nombre: texto?.nombre ?? card.nombre,
    habilidad,
    keywords,
    raza: efecto.raza ?? card.raza,
    atributo: efecto.atributo ?? card.atributo,
    coste: efecto.coste ?? card.coste,
  };
}
