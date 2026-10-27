import banlistEstandarJson from "../../documentos/fuente/banlist-estandar.json";
import banlistInfanteriaJson from "../../documentos/fuente/banlist-infanteria.json";
import banlistVcrJson from "../../documentos/fuente/banlist-vcr.json";
import feDeErratasJson from "../../documentos/fuente/fe-de-erratas.json";
import { keywordsPropias, sinRecordatorios, splitAbility } from "./ability";
import { TEXTOS_ERRATADOS } from "./erratas-aplicadas";
import {
  cartasFueraDelBloque,
  claveDeNombre,
  type Banlist,
  type Cambio,
  type FeDeErratas,
} from "./documentos";
import {
  ATRIBUTOS,
  FORMATOS,
  RAZAS,
  type Atributo,
  type Card,
  type Formato,
  type Raza,
} from "./types";

/**
 * La Fe de Erratas y la Banlist de cada formato, aplicadas a las cartas.
 *
 * `cards.json` guarda el texto IMPRESO de cada carta (el que se verifico
 * contra el arte); `getCards()` y `useCatalogo()` le aplican las erratas con
 * `conErratas()`, asi que el catalogo, el buscador y las reglas ven el texto
 * vigente. La grilla y el modal ponen un lazo en la imagen de la carta
 * erratada o baneada. Una carta que la Banlist declara Unica topa en una
 * copia, y una baneada deja la baraja fuera del formato.
 *
 * La Fe de Erratas es de los tres formatos (Estandar, VCR e Infanteria); la
 * Banlist, de uno. Por eso todo lo de aqui recibe el formato, y sin el es
 * Estandar, que era el unico antes de que hubiera formatos.
 *
 * Las entradas se asocian por NOMBRE (`claveDeNombre`, sin tildes ni
 * mayusculas), asi que alcanzan a todas las impresiones de la carta, Arte
 * Alternativo incluido. `erratas.test.ts` exige que cada entrada encuentre al
 * menos una carta del catalogo.
 *
 * Importa los JSON sin `node:fs`, asi que sirve igual en el cliente, en el
 * build y en los tests (scripts/ts-imports.mjs les pone el atributo json).
 */

/*
 * Sin validar aqui, a proposito. Los JSON van DENTRO del bundle (no son una
 * entrada de afuera, CLAUDE.md seguridad #4), y validarlos al cargar el
 * modulo era parte de la tarea mas larga del catalogo en un telefono. Los
 * valida el build (`documentos-data.ts`, que tumba el export si no cumplen) y
 * `documentos.test.ts`, que ademas exige que validar no cambie nada: por eso
 * el `as` es seguro.
 */
const FE = feDeErratasJson as FeDeErratas;
export const BANLISTS: Record<Formato, Banlist> = {
  estandar: banlistEstandarJson as Banlist,
  vcr: banlistVcrJson as Banlist,
  infanteria: banlistInfanteriaJson as Banlist,
};

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

/** Lo que una errata cambia de cara a las reglas de la baraja. */
export interface EfectoEnReglas {
  unica?: boolean;
  /** La Banlist la vuelve Errante: no cambia la baraja, solo su texto. */
  errante?: boolean;
  raza?: Raza;
  atributo?: Atributo;
  coste?: number;
}

/** Lo que sale de un documento, indexado por `claveDeNombre`. */
interface Tablas {
  erratas: Map<string, ErrataDeCarta[]>;
  efectos: Map<string, EfectoEnReglas>;
  baneadas: Set<string>;
  /** Las cartas de fuera del bloque EE que el formato admite. */
  admitidas: Set<string>;
}

function tablas(): Tablas {
  return {
    erratas: new Map(),
    efectos: new Map(),
    baneadas: new Set(),
    admitidas: new Set(),
  };
}

function agregar(t: Tablas, nombre: string, e: ErrataDeCarta) {
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
  t.erratas.set(k, [...(t.erratas.get(k) ?? []), limpia]);
}

function efecto(t: Tablas, nombre: string, e: EfectoEnReglas) {
  const k = claveDeNombre(nombre);
  t.efectos.set(k, { ...t.efectos.get(k), ...e });
}

/** Una nota de la Banlist ("Carta Única."). */
function nota(despues: string, extra?: string): ErrataDeCarta {
  return {
    fuente: "banlist",
    cambio: "nota",
    antes: null,
    despues: /[.]$/.test(despues) ? despues : `${despues}.`,
    ...(extra ? { nota: extra } : {}),
  };
}

// La Fe de Erratas: comun a los tres formatos.
const COMUN = tablas();
for (const e of FE.entradas) {
  const errata: ErrataDeCarta = {
    fuente: "fe-de-erratas",
    cambio: e.cambio,
    antes: e.antes ?? e.versiones?.[0] ?? null,
    despues: e.despues,
    nota: e.nota,
  };
  agregar(COMUN, e.nombre, errata);
  // Una errata de nombre se encuentra tambien por el nombre nuevo.
  if (e.cambio === "nombre" && claveDeNombre(e.despues) !== claveDeNombre(e.nombre)) {
    agregar(COMUN, e.despues, errata);
  }
  // Solo se SUMA: el "debe decir" a veces es un trozo de la habilidad (Ataque
  // de Dragon, Vodyanoy) y no traer "Unica" no quiere decir perderla.
  if (e.cambio === "habilidad" && keywordsPropias(e.despues).includes("Única")) {
    efecto(COMUN, e.nombre, { unica: true });
  }
  if (e.cambio === "raza" && (RAZAS as readonly string[]).includes(e.despues)) {
    efecto(COMUN, e.nombre, { raza: e.despues as Raza }); // validado justo arriba
  }
}

/**
 * Las entradas de la Banlist Estandar que no nombran una carta sino una regla
 * de construccion, con las cartas a las que se le muestran.
 */
const REGLAS_DE_CONSTRUCCION: Record<string, string[]> = {
  "Mazo Desafiante y/o Guerrero": ["Shingas", "Karna"],
};

/**
 * Los efectos de la Banlist Estandar que no se leen del texto de forma
 * mecanica, escritos a mano. Cada uno cita la entrada.
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

/**
 * Lo que dice la Banlist de un formato. La seccion de erratas, sus reglas de
 * construccion y los efectos a mano solo los tiene la Estandar.
 */
function tablasDeBanlist(ban: Banlist): Tablas {
  const t = tablas();
  for (const nombre of ban.unicas) {
    agregar(t, nombre, nota("Carta Única"));
    efecto(t, nombre, { unica: true });
  }
  const condiciones = [
    ...(ban.observacion?.condiciones ?? []),
    ...(ban.fueraDelBloque ?? []),
  ];
  for (const c of condiciones) {
    if (c.condicion) agregar(t, c.carta, nota(c.condicion));
    if (c.condicion === "Carta Única") efecto(t, c.carta, { unica: true });
  }
  for (const e of ban.erratas) {
    const errata = nota(e.texto);
    const destinos = REGLAS_DE_CONSTRUCCION[e.carta];
    if (destinos) {
      for (const d of destinos) agregar(t, d, { ...errata, nota: e.carta });
    } else {
      agregar(t, e.carta, errata);
    }
    // "Carta Unica." dentro de la errata (Krisna, Wyvern Dorado, Jarnvid).
    if (/(^|\. )Carta Única/.test(e.texto)) efecto(t, e.carta, { unica: true });
  }
  // Errante por la lista: deja de ser Unica, como dice la Estandar de
  // Tsukuyomi ("pasa de ser Carta Unica a Errante"), salvo que la misma
  // Banlist la haga Unica.
  const errantes = [
    ...(ban.errantes ?? []),
    ...condiciones.filter((c) => c.condicion === "Carta Errante").map((c) => c.carta),
  ];
  for (const nombre of errantes) {
    if (ban.errantes?.includes(nombre)) agregar(t, nombre, nota("Carta Errante"));
    if (t.efectos.get(claveDeNombre(nombre))?.unica !== true) {
      efecto(t, nombre, { errante: true, unica: false });
    }
  }
  for (const nombre of ban.prohibidas) t.baneadas.add(claveDeNombre(nombre));
  for (const nombre of cartasFueraDelBloque(ban)) t.admitidas.add(claveDeNombre(nombre));
  return t;
}

const POR_FORMATO = Object.fromEntries(
  FORMATOS.map((f) => [f, tablasDeBanlist(BANLISTS[f])]),
) as Record<Formato, Tablas>; // una entrada por cada formato de FORMATOS
for (const [k, e] of Object.entries(EFECTOS_A_MANO)) {
  POR_FORMATO.estandar.efectos.set(k, { ...POR_FORMATO.estandar.efectos.get(k), ...e });
}

/**
 * Las cartas de fuera del bloque EE que nombra alguna Banlist. Las que no
 * nombra la del formato no entran en el: en VCR no hay Wotan.
 */
const FUERA_DEL_BLOQUE = new Set(
  FORMATOS.flatMap((f) => cartasFueraDelBloque(BANLISTS[f]).map(claveDeNombre)),
);

// La Fe de Erratas primero y la Banlist encima: si la Banlist del formato la
// vuelve Errante, manda sobre la Unica de la Fe de Erratas.
const EFECTOS = Object.fromEntries(
  FORMATOS.map((f) => {
    const m = new Map(COMUN.efectos);
    for (const [k, e] of POR_FORMATO[f].efectos) m.set(k, { ...m.get(k), ...e });
    return [f, m];
  }),
) as Record<Formato, Map<string, EfectoEnReglas>>; // idem
// Que la tabla a mano no nombre un atributo que no existe.
for (const e of Object.values(EFECTOS).flatMap((m) => [...m.values()])) {
  if (e.atributo && !(ATRIBUTOS as readonly string[]).includes(e.atributo)) {
    throw new Error(`atributo desconocido: ${e.atributo}`);
  }
}

/** Las erratas de la carta, de la Fe de Erratas y la Banlist del formato. */
export function erratasDe(
  card: Pick<Card, "nombre">,
  formato: Formato = "estandar",
): ErrataDeCarta[] {
  const k = claveDeNombre(card.nombre);
  return [
    ...(COMUN.erratas.get(k) ?? []),
    ...(POR_FORMATO[formato].erratas.get(k) ?? []),
  ];
}

export function tieneErrata(
  card: Pick<Card, "nombre">,
  formato: Formato = "estandar",
): boolean {
  const k = claveDeNombre(card.nombre);
  return COMUN.erratas.has(k) || POR_FORMATO[formato].erratas.has(k);
}

/** Si la Banlist del formato la prohibe. Se puede jugar igual, pero fuera del formato. */
export function estaBaneada(
  card: Pick<Card, "nombre">,
  formato: Formato = "estandar",
): boolean {
  return POR_FORMATO[formato].baneadas.has(claveDeNombre(card.nombre));
}

/**
 * Si es una carta de fuera del bloque EE que la Banlist del formato no
 * admite (Wotan en VCR, cualquiera en Infanteria).
 */
export function fueraDelBloque(
  card: Pick<Card, "nombre">,
  formato: Formato = "estandar",
): boolean {
  const k = claveDeNombre(card.nombre);
  return FUERA_DEL_BLOQUE.has(k) && !POR_FORMATO[formato].admitidas.has(k);
}

export function efectoEnReglas(
  card: Pick<Card, "nombre">,
  formato: Formato = "estandar",
): EfectoEnReglas {
  return EFECTOS[formato].get(claveDeNombre(card.nombre)) ?? {};
}

/** Todos los nombres con alguna errata o efecto, de los tres formatos, para los tests. */
export function nombresConErrata(): string[] {
  return [
    ...COMUN.erratas.keys(),
    ...FORMATOS.flatMap((f) => [
      ...POR_FORMATO[f].erratas.keys(),
      ...POR_FORMATO[f].baneadas,
    ]),
  ];
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
 * La carta con la Fe de Erratas y la Banlist del formato aplicadas: el texto
 * vigente, que es el que muestra el catalogo y el que se juega. El lazo de la
 * imagen (`CardRibbons`) avisa que el texto no es el impreso.
 *
 * Cambia la habilidad (con `TEXTOS_ERRATADOS` y las Unicas y Errantes de los
 * documentos), las keywords que de ella salen, el nombre, la raza, el
 * atributo y el coste. Las keywords que la carta tiene por una condicion de
 * su texto, que no se leen de la declaracion (`keywords.test.ts`), se
 * conservan. Las cartas sin errata salen tal cual, la misma referencia.
 */
export function conErratas(card: Card, formato: Formato = "estandar"): Card {
  const escrito = TEXTOS_ERRATADOS[card.nombre];
  const texto = escrito?.soloEstandar && formato !== "estandar" ? undefined : escrito;
  const efecto = efectoEnReglas(card, formato);
  if (!texto && Object.keys(efecto).length === 0) return card;

  let habilidad = card.habilidad;
  for (const [antes, despues] of texto?.cambia ?? []) {
    habilidad = habilidad.replace(antes, despues);
  }
  if (texto?.agrega) habilidad = `${habilidad}\n${texto.agrega}`;
  for (const k of texto?.declara ?? []) habilidad = declarar(habilidad, k);
  if (efecto.atributo) habilidad = declarar(habilidad, efecto.atributo);
  if (efecto.errante) habilidad = declarar(habilidad, "Errante");
  if (efecto.unica === true) {
    habilidad = declarar(habilidad, "Única");
    // Errante sobra en una Unica: con una sola copia en la baraja no puede
    // haber dos en mesa. Krisna y Anubis de Inpu la imprimen y la Banlist las
    // vuelve Unicas; `erratas.test.ts` vigila que nunca convivan.
    habilidad = quitarDeclaracion(habilidad, "Errante");
  }
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
