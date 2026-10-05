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
  // Banlist: "Errante".
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
  Adapa: { agrega: "Este Aliado no puede hacerse objetivo de su propia habilidad." },
  // Fe de Erratas: "Baraja el resto."
  Suleiman: { cambia: [["sin pagar su coste.", "sin pagar su coste. Baraja el resto."]] },
  // Fe de Erratas y Banlist: "una carta de ahí que no sea Oro".
  "La Voisin": {
    cambia: [["elige una carta de ahí y", "elige una carta de ahí que no sea Oro y"]],
  },
  // Fe de Erratas y Banlist: "Cuando un Oponente Robe una carta".
  "Babalú Ayé": { cambia: [["Cuando un jugador Robe", "Cuando un oponente Robe"]] },
  // Banlist: "Indesterrable".
  Amikiri: { declara: ["Indesterrable"] },
  // Banlist: "Errante".
  "Ciempiés Gigante": { declara: ["Errante"] },
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
  Harionna: { declara: ["Oscuridad"] },
  // Banlist: coste 1 (en `efectoEnReglas`) y "solo puede disparar su
  // habilidad si solo controlas Aliados de raza Barbaro".
  "Arjumand Banu Begum": {
    cambia: [
      [
        "Cuando este Aliado haga daño de combate, puedes",
        "Cuando este Aliado haga daño de combate, si todos los Aliados que controlas son de Raza Bárbaro, puedes",
      ],
    ],
  },
  // Banlist: "Carta Errante".
  "Bibi Dalair Kaur": { declara: ["Errante"] },
  // Banlist: "y si solo controlas Aliados de raza Sombra".
  "Ráksasa Sombrío": {
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
  Taishakuten: { declara: ["Errante"] },
  // Banlist: "Errante".
  "Honjo Masamune": { declara: ["Errante"] },
  // Banlist: "pasa de ser Carta Unica a Errante" (la Unica la quita
  // `efectoEnReglas`).
  Tsukuyomi: { declara: ["Errante"] },
};
