/**
 * Lo que la Fe de Erratas y la Banlist cambian en el TEXTO de cada carta,
 * escrito a mano desde los dos documentos (`documentos/fuente/*.json`).
 *
 * `erratas.ts` lo aplica sobre cada impresion (`conErratas`), asi que cada
 * edicion conserva su forma de imprimir y solo cambia lo que la errata dice.
 * Las `Unica` de la Banlist y de la Fe de Erratas, la raza, el coste y el
 * atributo no van aqui: salen de `efectoEnReglas()`. Aqui va lo que el
 * documento escribe en prosa y hay que traducir a texto de carta.
 *
 * Muchas erratas ya estaban en el texto del catalogo, porque Escuelas
 * Elementales reimprimio la carta corregida y su texto se propago hacia
 * atras (CLAUDE.md). Esas no necesitan entrada.
 *
 * `erratas.test.ts` exige que cada `cambia` encuentre su texto en TODAS las
 * impresiones de la carta: un reemplazo que no se aplica falla, no se pierde.
 *
 * La Fe de Erratas es de los tres formatos; la Banlist, de uno. Lo que sale
 * SOLO de la Banlist Estandar lleva `soloEstandar` y no se aplica en VCR ni en
 * Infanteria, que tienen la suya (decision del proyecto, 27-10-2026). Lo que
 * dicen los dos documentos vale en los tres. Las Unicas y Errantes de las
 * listas de cada Banlist no van aqui: salen de `efectoEnReglas()`.
 */

export interface TextoErratado {
  /** Keywords que la errata le da a la carta ("Errante", "Indesterrable"…). */
  declara?: string[];
  /** Trozos que cambian: [lo impreso, lo que debe decir]. */
  cambia?: [string, string][];
  /** Una frase que la errata agrega, como linea propia al final. */
  agrega?: string;
  /** El nombre corregido. */
  nombre?: string;
  /** Sale solo de la Banlist Estandar: no vale en VCR ni en Infanteria. */
  soloEstandar?: true;
}

export const TEXTOS_ERRATADOS: Record<string, TextoErratado> = {
  // Fe de Erratas: "daño de Combate" y "hasta dos cartas".
  "Punzón de Hueso": {
    cambia: [
      ["hizo daño al Mazo Castillo", "hizo daño de combate al Mazo Castillo"],
      ["puedes elegir dos cartas", "puedes elegir hasta dos cartas"],
    ],
  },
  // Fe de Erratas: "puedes elegir otro Tótem objetivo".
  Inti: {
    cambia: [["puedes elegir un Tótem objetivo", "puedes elegir otro Tótem objetivo"]],
  },
  // Banlist: "si todos los Aliados que controlas son de Raza Faerie y/o Eterno".
  Amaterasu: {
    soloEstandar: true,
    cambia: [
      [
        "son de Raza Faerie, puedes elegir",
        "son de Raza Faerie y/o Eterno, puedes elegir",
      ],
    ],
  },
  // Fe de Erratas y Banlist: "hasta tres Armas de distinto nombre".
  "Ada Lovelace": {
    cambia: [["hasta tres Armas en", "hasta tres Armas de distinto nombre en"]],
  },
  // Fe de Erratas y Banlist: "Errante". De los tres formatos: lo dice la Fe
  // de Erratas, no solo la Banlist Estandar.
  "Constantino XI": { declara: ["Errante"] },
  // Fe de Erratas: "Cuando un Aliado de Raza Bestia entre en juego bajo tu control".
  Lahmu: {
    cambia: [
      [
        "Cuando juegues un Aliado de Raza Bestia",
        "Cuando un Aliado de Raza Bestia entre en juego bajo tu control",
      ],
    ],
  },
  // Fe de Erratas: "Destruye un Aliado oponente".
  "Ataque de Dragón": {
    cambia: [["Destruye el Aliado oponente objetivo.", "Destruye un Aliado oponente."]],
  },
  // Banlist: "No puede hacer objetivo de su habilidad a sí mismo."
  Adapa: {
    soloEstandar: true,
    agrega: "Este Aliado no puede hacerse objetivo de su propia habilidad.",
  },
  // Fe de Erratas: "Baraja el resto."
  Suleiman: { cambia: [["sin pagar su coste.", "sin pagar su coste. Baraja el resto."]] },
  // Fe de Erratas y Banlist: "una carta de ahí que no sea Oro".
  "La Voisin": {
    cambia: [["elige una carta de ahí y", "elige una carta de ahí que no sea Oro y"]],
  },
  // Fe de Erratas y Banlist: "Cuando un Oponente Robe una carta".
  "Babalú Ayé": { cambia: [["Cuando un jugador Robe", "Cuando un oponente Robe"]] },
  // Banlist: "Indesterrable".
  Amikiri: {
    soloEstandar: true,
    declara: ["Indesterrable"],
  },
  // Banlist: "Errante".
  "Ciempiés Gigante": {
    soloEstandar: true,
    declara: ["Errante"],
  },
  // Fe de Erratas: errata de nombre.
  "Caída del Sol": { nombre: "Caída de Sol" },
  // Fe de Erratas y Banlist: cancela las habilidades disparadas.
  Invencible: {
    cambia: [
      [
        "al comienzo de la Declaración de Bloqueo",
        "al comienzo de tu Declaración de Bloqueo",
      ],
      [
        "para que ese Aliado no dispare sus Habilidades este turno.",
        "para Cancelar las habilidades disparadas de ese Aliado. Ese Aliado no dispara sus habilidades este turno.",
      ],
    ],
  },
  // Fe de Erratas: el texto entero.
  Goecia: {
    cambia: [
      [
        "Mira las primeras dos cartas del Mazo Castillo de tu oponente, juega una sin pagar su coste y Destierra la otra. (Si la carta elegida es un Aliado, Arma, Tótem u Oro, entra en juego bajo tu control).",
        "Mira las primeras dos cartas del Mazo Castillo de tu oponente y elige una. Si la carta elegida es un Oro, ponlo en juego en tu Reserva de Oros bajo tu control; si no, puedes jugarla sin pagar su coste. Luego, Destierra la otra carta. (Los Aliados, Armas o Tótems jugados de esta manera entran en juego bajo tu control).",
      ],
    ],
  },
  // Fe de Erratas: "Puedes pagar el coste de una carta oponente jugada desde
  // un Cementerio para Anularla".
  "Arnold Von Winkelried": {
    cambia: [
      [
        "Mientras este Aliado esté en juego, cuando un oponente juegue una carta de un Cementerio, puedes pagar el coste de esa carta para Anularla.",
        "Puedes pagar el coste de una carta oponente jugada desde un Cementerio para Anularla.",
      ],
    ],
  },
  // Fe de Erratas y Banlist: "cartas Desterradas de esta manera".
  "Rito de Sangre": {
    cambia: [["cartas Desterradas hasta", "cartas Desterradas de esta manera hasta"]],
  },
  // Fe de Erratas y Banlist: "Errante".
  "Mal Nido": { declara: ["Errante"] },
  // Fe de Erratas: "Errante".
  Piedad: { declara: ["Errante"] },
  // Fe de Erratas: "Si un efecto oponente te hace Descartar este Aliado".
  Vodyanoy: { cambia: [["Si un efecto o habilidad oponente", "Si un efecto oponente"]] },
  // Fe de Erratas y Banlist: "Errante".
  Grotekop: { declara: ["Errante"] },
  // Fe de Erratas y Banlist: solo con Aliados de Raza Heroe.
  Krisna: {
    cambia: [
      [
        "Robar una o más cartas por un efecto, puedes",
        "Robar una o más cartas por un efecto y todos los Aliados que controlas son de Raza Héroe, puedes",
      ],
    ],
  },
  // Banlist: "Pasa a tener Oscuridad".
  Harionna: {
    soloEstandar: true,
    declara: ["Oscuridad"],
  },
  // Banlist: coste 1 (en `efectoEnReglas`) y "solo puede disparar su
  // habilidad si solo controlas Aliados de raza Barbaro".
  "Arjumand Banu Begum": {
    soloEstandar: true,
    cambia: [
      [
        "Cuando este Aliado haga daño de combate, puedes",
        "Cuando este Aliado haga daño de combate, si todos los Aliados que controlas son de Raza Bárbaro, puedes",
      ],
    ],
  },
  // Banlist: "Carta Errante".
  "Bibi Dalair Kaur": {
    soloEstandar: true,
    declara: ["Errante"],
  },
  // Banlist: "y si solo controlas Aliados de raza Sombra".
  "Ráksasa Sombrío": {
    soloEstandar: true,
    cambia: [
      [
        "Cuando este Aliado haga daño de combate, puedes",
        "Cuando este Aliado haga daño de combate, si todos los Aliados que controlas son de Raza Sombra, puedes",
      ],
    ],
  },
  // Banlist: "Solo puedes usar este Totem si solamente controlas Aliados de
  // raza Eterno".
  Járnvid: {
    soloEstandar: true,
    cambia: [
      [
        "En tu Fase de Vigilia, una vez por turno, puedes",
        "En tu Fase de Vigilia, una vez por turno, si todos los Aliados que controlas son de Raza Eterno, puedes",
      ],
    ],
  },
  // Fe de Erratas: "hasta dos copias".
  "Ojo de Balor": { cambia: [["hasta dos de copias", "hasta dos copias"]] },
  // Banlist: "Errante".
  Taishakuten: {
    soloEstandar: true,
    declara: ["Errante"],
  },
  // Banlist: "Errante".
  "Honjo Masamune": {
    soloEstandar: true,
    declara: ["Errante"],
  },
  // Banlist: "pasa de ser Carta Unica a Errante" (la Unica la quita
  // `efectoEnReglas`).
  Tsukuyomi: {
    soloEstandar: true,
    declara: ["Errante"],
  },
};

/**
 * Lo que una errata cambio en cartas cuyo texto ya viene corregido en
 * `data-src`: Escuelas Elementales reimprimio la carta con la errata y su
 * texto se propago hacia atras (CLAUDE.md), asi que el catalogo ya no tiene
 * el texto viejo con que comparar. Las frases van tal como las dice el
 * catalogo, y `AbilityText` las pinta en dorado. Las que se aplican al leer
 * (`TEXTOS_ERRATADOS`, las Unicas y Errantes de las Banlists) no van aqui:
 * salen del diff que hace `conErratas`.
 *
 * `erratas.test.ts` exige que cada frase este en el texto vigente de TODAS
 * las impresiones de la carta, y que ninguna errata de habilidad de los dos
 * documentos quede sin resaltar.
 */
export interface ResalteImpreso {
  /**
   * Cada frase marca su siguiente aparicion en el texto: "juego" cuatro veces
   * son las cuatro primeras. Entre corchetes va la parte que se pinta y fuera
   * el contexto que la ubica ("Mientras este [Tótem]"), para no marcar la
   * aparicion equivocada ni una palabra que no cambio.
   */
  frases: string[];
  /** Sale solo de la Banlist Estandar: no se marca en VCR ni en Infanteria. */
  soloEstandar?: true;
}

/** Las erratas que solo le dan `Única` a una carta que ya la declara. */
const UNICA: ResalteImpreso = { frases: ["Única"] };

export const RESALTES_IMPRESOS: Record<string, ResalteImpreso> = {
  // Fe de Erratas: la hacen Unica.
  Aruspicina: UNICA,
  "Akai Misuto": UNICA,
  "Ballesta Gigante": UNICA,
  Bouda: UNICA,
  "Cristalino Amarillo": UNICA,
  Euforia: UNICA,
  "Fuerza Compartida": UNICA,
  Hidromancia: UNICA,
  Hnoss: UNICA,
  Ikiryo: UNICA,
  "Luz Solar": UNICA,
  Mantus: UNICA,
  "Margot la Fee": UNICA,
  Raziel: UNICA,
  "Rey Roble": UNICA,
  Sarras: UNICA,
  Simargl: UNICA,
  Tezcatlipoca: UNICA,
  // Fe de Erratas: "entre en juego bajo tu control" en vez de "juegues". En
  // Estandar suma la linea de la Banlist, que sale del diff.
  Adapa: { frases: ["Sacerdote [entra en juego bajo tu control]"] },
  // Fe de Erratas y Banlist: "Desterrar" en vez de "Destruir".
  Astra: { frases: ["Desterrar"] },
  // Fe de Erratas y Banlist: "Mientras esta Arma" / "Mientras este Tótem".
  Archa: { frases: ["Mientras esta [Arma]"] },
  "Coto de Caza": { frases: ["Mientras este [Tótem]"] },
  // Fe de Erratas: Errante y la condicion de escuela o de raza.
  "Akiko Yamamoto": {
    frases: [
      "Errante",
      "si todos los Aliados que controlas son Luz y/o Samurái,",
      "el Aliado [Samurái] objetivo",
    ],
  },
  "Azi Dahaka": {
    frases: ["Errante", "si todos los Aliados que controlas son de Raza Dragón,"],
  },
  Dimachaerus: {
    frases: ["Errante", "si todos los Aliados que controlas son Guerrero,"],
  },
  Nostradamus: {
    frases: ["Errante", "si todos los Aliados que controlas son Sacerdote,"],
  },
  Yaoguai: { frases: ["Errante"] },
  // Fe de Erratas: "En Guerra de Talismanes" en vez de "En la Fase de
  // Asignacion de Dano".
  "Carmina Burana": { frases: ["En Guerra de Talismanes"] },
  // Fe de Erratas: entra desde la mano y no se usa en el primer turno.
  "Espejo Negro": { frases: ["desde tu mano", "Si no es tu primer turno,"] },
  // Fe de Erratas: "un Oro" en vez de "el Oro objetivo".
  Kukulkán: { frases: ["Destruir [un] Oro"] },
  // Fe de Erratas: "Desterrar" en vez de "Descartar".
  Kuyén: { frases: ["Desterrar"] },
  // Fe de Erratas: sobraba un "de" ("dos de copias"). Se marca donde estaba.
  "Ojo de Balor": { frases: ["hasta [dos copias]"] },
  // Fe de Erratas: el Talisman oponente se anula y la carta se reescribe.
  Sealtiel: {
    frases: ["Única", "para Anular una carta oponente, jugada desde su mano,"],
  },
  // Fe de Erratas: cancela las habilidades disparadas.
  Teúrgia: { frases: ["Cancela las habilidades disparadas de ese Aliado"] },
  // Fe de Erratas: "de tu Cementerio" en vez de "de un Cementerio".
  Trismegistus: { frases: ["Desterrada de [tu] Cementerio"] },
  // Fe de Erratas: "en tu Mazo Castillo o Cementerio".
  "Ukita Hideie": { frases: ["en tu Mazo Castillo o Cementerio"] },
  // Fe de Erratas: sobraba "o habilidad" ("un efecto o habilidad oponente").
  Vodyanoy: { frases: ["un [efecto oponente]"] },
  // Fe de Erratas: el oponente, que se puede usar mas de una vez por turno,
  // Bestias, todos los contadores y "una habilidad" sin "activada objetivo".
  Yestay: {
    frases: [
      "bajo el control de [un Oponente]",
      "Puedes utilizar esta habilidad más de una vez por turno.",
      "Si sólo controlas [Bestias]",
      "quitar [todos los contadores de] Alimento",
      "para cancelar [una habilidad]",
    ],
  },
  // Fe de Erratas: "en juego" donde la carta decia "en jugo", cuatro veces.
  "Wyrm de la Plaga": { frases: ["juego", "juego", "juego", "juego"] },
};

/** La frase sin los corchetes que marcan la parte a pintar. */
export function sinCorchetes(frase: string): string {
  return frase.replace(/[[\]]/g, "");
}
