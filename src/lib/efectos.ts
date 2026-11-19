import { splitAbility } from "./ability";
import type { Card } from "./types";

/**
 * Lo que la carta HACE, para el filtro "Efecto" del catalogo (decision del
 * proyecto, 18-11-2026). Va aparte de "Habilidad", que es lo que la carta ES
 * (las keywords que declara): mezclarlos dejaria un filtro donde unas opciones
 * dicen una cosa y otras la contraria, que es por lo que Alimentar, Purificar
 * y Honor salieron de `KEYWORDS_IMPRESAS` (ver CLAUDE.md).
 *
 * No se resalta nada en el texto: solo se filtra. Se lee la habilidad tal
 * como la muestra el catalogo (erratada para el formato y sin recordatorios),
 * en minusculas y sin tildes, y cada efecto es un patron sobre ese texto. Los patrones se
 * ajustaron mirando aciertos y dudosos contra el catalogo real;
 * `efectos.test.ts` fija los casos que costaron.
 */

interface Efecto {
  nombre: string;
  coincide: (texto: string, cuerpo: string) => boolean;
}

/** Una frase: no cruza un punto ni un salto de linea. */
const F = "[^.\\n]";

const re = (patron: string) => {
  const r = new RegExp(patron, "u");
  return (texto: string) => r.test(texto);
};

/**
 * Lo que se saca del Cementerio a la mano, al juego o a la Reserva de Oros,
 * o se juega desde ahi. No cuenta lo que vuelve al Castillo (es barajar) ni
 * lo que se destierra o se baraja "para" otra cosa: ese "para" corta la frase.
 */
const SIN_PARA = `(?:(?!\\bpara\\b)${F})*`;
/** Entre "juega" y "de tu Cementerio" no cabe otro verbo que mueva cartas. */
const SIN_OTRO_VERBO = `(?:(?!\\b(destierra|baraja|bota|descarta|destruye)\\b)${F})*`;
const RECUPERAR = [
  `(de|desde) (tu|el|su|un|cualquier) cementerio${SIN_PARA}\\b(a|en) (tu|su) mano`,
  `(de|desde) (tu|el|su|un|cualquier) cementerio${SIN_PARA}(en juego|al juego|reserva de oros|(en|a) tu linea de)`,
  `\\b(a|en) (tu|su) mano${F}*(de|desde) (tu|el|su) cementerio`,
  `\\b(juega|juegalo|juegala|juegalos|jugar|jugarlo|jugarla|pon|ponlo|ponla|ponlos|ponlas|poner|ponerlo|ponerla|sube|subelo|subela)\\b${SIN_OTRO_VERBO}(de|desde) (tu|el|su|un|cualquier) cementerio`,
].join("|");

/** La palabra en el cuerpo, fuera de lo que la carta declara de si misma. */
const enCuerpo = (palabra: string) => (_t: string, cuerpo: string) =>
  new RegExp(`\\b${palabra}`, "u").test(cuerpo);

export const EFECTOS: readonly Efecto[] = [
  // "destru" sin "ctib": Indestructible no destruye nada.
  { nombre: "Destruir", coincide: re("\\bdestru(?!ctib)") },
  // \b deja fuera "indesterrable", y "Destierro" solo cuenta como destino
  // ("al Destierro"): "las cartas de tu Destierro" nombra la zona.
  {
    nombre: "Desterrar",
    coincide: re("\\bdestierr(?!o\\b)|\\bdesterr(?!able)|\\bal destierro"),
  },
  { nombre: "Anular", coincide: re("\\banul") },
  {
    nombre: "Robar",
    coincide: re("\\brob(a|an|ar|as|e|en|ara|aran|aras|arla|arlas|arlo|arlos)\\b"),
  },
  {
    nombre: "Buscar",
    coincide: re("\\bbusc(a|an|ar|as|ala|alo|alas|alos|arla|arlo|arlas|arlos)\\b"),
  },
  {
    nombre: "Descartar o botar",
    coincide: re(
      "\\bdescart|\\bbot(a|an|ar|as|e|en|ala|alo|alas|alos|arla|arlo|arlas|arlos|ara|aran)\\b",
    ),
  },
  { nombre: "Recuperar del Cementerio", coincide: re(RECUPERAR) },
  {
    nombre: "Cambiar la Fuerza",
    coincide: re(
      [
        "\\b(gana|ganan|ganara|ganaran|pierde|pierden|perdera|perderan) (\\d+|x|uno|dos|tres|un|una) (a la|de) fuerza",
        "\\bfuerza (es|sera|se convierte|igual a)\\b",
        "\\bduplica(r)? la fuerza",
        "\\bdoble de (su )?fuerza",
      ].join("|"),
    ),
  },
  {
    // No "entra en juego bajo tu control", que no le quita nada a nadie.
    nombre: "Tomar el control",
    coincide: re(
      "\\b(toma|tomas|tomar|gana|ganas|ganar|obten|obtienes) el control|\\bpasa(n)? a (estar bajo )?tu control|\\bcambia(n)? de control",
    ),
  },
  {
    nombre: "Jugar sin pagar o más barato",
    coincide: (t) =>
      /sin pagar|\b(\d+|x|un|una|uno|dos|tres) oros? menos|\breduc\w* (en \w+ )?(el|su) coste|\bcoste (se )?reduc/u.test(
        t,
      ) && !/no pueden reducir/u.test(t),
  },
  { nombre: "Dar Indestructible", coincide: enCuerpo("indestructible") },
  { nombre: "Dar Indesterrable", coincide: enCuerpo("indesterrable") },
  { nombre: "Dar Imbloqueable", coincide: enCuerpo("imbloqueable") },
];

export const NOMBRES_DE_EFECTOS = EFECTOS.map((e) => e.nombre);

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/**
 * Los efectos de cada carta, calculados una vez. La clave es el objeto: el
 * catalogo de cada formato trae sus propias cartas (con su texto erratado),
 * asi que cada una se mira con el texto que muestra.
 */
const memo = new WeakMap<Card, ReadonlySet<string>>();

export function efectosDe(card: Card): ReadonlySet<string> {
  const guardado = memo.get(card);
  if (guardado) return guardado;
  // Sin los recordatorios entre parentesis: "Indestructible (Este Aliado no
  // puede ser Destruido)" no destruye nada, ni "Exhumar (Puedes jugar esta
  // carta desde tu Cementerio…)" es otra forma de recuperar. Las
  // declaraciones con coste ("Traición - Destierra…") si cuentan.
  const { keywords, cuerpo: resto } = splitAbility(card.habilidad);
  const cuerpo = normalizar(resto);
  const texto = normalizar([...keywords.map((k) => k.texto), resto].join("\n"));
  const efectos = new Set(
    EFECTOS.filter((e) => e.coincide(texto, cuerpo)).map((e) => e.nombre),
  );
  memo.set(card, efectos);
  return efectos;
}

export const tieneEfecto = (card: Card, efecto: string) =>
  efecto === "" || efectosDe(card).has(efecto);
