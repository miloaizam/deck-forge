/**
 * La mesa como datos (GAME.md §5). Sin interfaz, sin red y sin reglas: solo
 * donde esta cada carta y que marcas lleva. Lo que la mueve vive en
 * `apply.ts`, y lo que prepara un juego desde una baraja, en `setup.ts`.
 *
 * Cada carta sobre la mesa es una FICHA con su `uid`: dos copias de la misma
 * carta son dos fichas. Las zonas guardan listas de uids, en orden. En el
 * Castillo el indice 0 es el tope; en las demas, lo ultimo que llego va al
 * final.
 *
 * Una ficha anexada (Portar) o puesta debajo de otra NO esta en ninguna
 * lista: va con su anfitriona, y por eso se mueve con ella sin hacer nada.
 */

/** Las nueve zonas del DAR (§3), mas el Mazo de Soporte (el side). */
export const ZONAS = [
  "castillo",
  "mano",
  "reserva",
  "oroPagado",
  "defensa",
  "ataque",
  "apoyo",
  "cementerio",
  "destierro",
  "soporte",
] as const;

export type Zona = (typeof ZONAS)[number];

/** Las zonas DENTRO del juego. Salir de ellas borra las marcas de la carta. */
export const ZONAS_EN_JUEGO: readonly Zona[] = [
  "reserva",
  "oroPagado",
  "defensa",
  "ataque",
  "apoyo",
];

/** Lo que solo ve su dueno (y el Castillo, ni el: su orden no lo sabe nadie). */
export const ZONAS_PRIVADAS: readonly Zona[] = ["castillo", "mano", "soporte"];

/** Los contadores del DAR (§10.12) y uno generico para lo demas. */
export const CONTADORES = ["honor", "conquista", "alimento", "generico"] as const;

export type Contador = (typeof CONTADORES)[number];

/** Largo maximo de la nota libre de una carta. */
export const MAX_NOTA = 200;

export interface Ficha {
  uid: string;
  /** Id de impresion del catalogo, el mismo que guarda la baraja. */
  cartaId: string;
  /** Quien la trajo a la mesa. No cambia nunca (DAR §5). */
  dueno: string;
  /** De que lado esta mientras sigue en juego («tomar el control»). */
  controlador: string;
  bocaAbajo: boolean;
  /** Uid del Aliado que la porta (Armas, DAR §10.39). */
  portadaPor: string | null;
  /** Uid de la carta bajo la que esta (DAR §10.38). */
  debajoDe: string | null;
  /** Solo los que valen mas de cero. */
  contadores: Partial<Record<Contador, number>>;
  /** Modificador temporal de Fuerza («+2 hasta la Fase Final»). */
  fuerza: number;
  /** Lo que cambia la carta y no cabe en un contador: Convertir, Copia… */
  nota: string;
}

export interface Jugador {
  id: string;
  zonas: Record<Zona, string[]>;
}

/** Como se nombra cada zona en la interfaz (los nombres del DAR). */
export const NOMBRE_ZONA: Record<Zona, string> = {
  castillo: "Castillo",
  mano: "Mano",
  reserva: "Reserva de Oro",
  oroPagado: "Oro Pagado",
  defensa: "Línea de Defensa",
  ataque: "Línea de Ataque",
  apoyo: "Línea de Apoyo",
  cementerio: "Cementerio",
  destierro: "Destierro",
  soporte: "Mazo de Soporte",
};

/** La zona con su articulo, para las frases del registro. */
export const ZONA_CON_ARTICULO: Record<Zona, string> = {
  castillo: "el Castillo",
  mano: "la mano",
  reserva: "la Reserva de Oro",
  oroPagado: "el Oro Pagado",
  defensa: "la Línea de Defensa",
  ataque: "la Línea de Ataque",
  apoyo: "la Línea de Apoyo",
  cementerio: "el Cementerio",
  destierro: "el Destierro",
  soporte: "el Mazo de Soporte",
};

/** Las fases y pasos del turno, en orden (DAR §9). */
export const FASES = [
  "agrupacion",
  "vigilia",
  "ataque",
  "bloqueo",
  "guerraTalismanes",
  "dano",
  "final",
  "robar",
] as const;

export type Fase = (typeof FASES)[number];

export const NOMBRE_FASE: Record<Fase, string> = {
  agrupacion: "Agrupación",
  vigilia: "Vigilia",
  ataque: "Declaración de Ataque",
  bloqueo: "Declaración de Bloqueo",
  guerraTalismanes: "Guerra de Talismanes",
  dano: "Asignación de Daño",
  final: "Fase Final",
  robar: "Robar",
};

/** El marcador de turno: no obliga a nada, ordena la conversacion. */
export interface Turno {
  numero: number;
  activo: string;
  fase: Fase;
  /** Quien tiene la prioridad en la Guerra de Talismanes. */
  prioridad: string | null;
}

/**
 * Cartas que alguien esta viendo sin sacarlas de su zona: mirar o mostrar
 * las de arriba del Castillo (DAR §10.34, §10.35), o recorrer una zona
 * entera para buscar (§10.8).
 */
export interface Revelado {
  /** De quien es la zona. */
  jugador: string;
  zona: Zona;
  uids: string[];
  /** Quien las ve: un jugador, o los dos. */
  para: string | "todos";
  /** Quien lo abrio: el unico que lo puede cerrar. */
  por: string;
  modo: "mirar" | "mostrar" | "buscar";
  /** En una busqueda: si la carta elegida se muestra («Buscar y mostrar»). */
  mostrar: boolean;
}

/**
 * Una linea del registro. Guarda datos y no texto: la frase la arma la
 * vista con los nombres del catalogo (`registro.ts`). Una carta va con su id
 * SOLO si los dos jugadores la podian ver; si no, `null` («una carta»).
 */
export interface EntradaRegistro {
  n: number;
  por: string;
  tipo: string;
  cartas: (string | null)[];
  desde?: Zona;
  hacia?: Zona;
  cuantas?: number;
  /** Un dato mas: la fase, la moneda, el contador o la nota. */
  detalle?: string;
  /** El otro jugador que nombra la entrada: de quien es el Castillo, quien comienza. */
  objetivo?: string;
}

/** Cuantas lineas guarda el registro. */
export const MAX_REGISTRO = 200;

export interface Mesa {
  fichas: Record<string, Ficha>;
  /** En el orden en que se sentaron. Para practicar basta uno. */
  jugadores: Jugador[];
  turno: Turno;
  revelado: Revelado | null;
  registro: EntradaRegistro[];
}

export function enJuego(zona: Zona): boolean {
  return ZONAS_EN_JUEGO.includes(zona);
}

export function zonasVacias(): Record<Zona, string[]> {
  return Object.fromEntries(ZONAS.map((z) => [z, []])) as unknown as Record<
    Zona,
    string[]
  >; // seguro: fromEntries sobre ZONAS arma exactamente una lista por zona
}

export function jugador(mesa: Mesa, id: string): Jugador | undefined {
  return mesa.jugadores.find((j) => j.id === id);
}

/** Donde esta una ficha que va en una lista. `null` si va anexada o no existe. */
export function ubicar(
  mesa: Mesa,
  uid: string,
): { jugador: Jugador; zona: Zona; indice: number } | null {
  for (const j of mesa.jugadores) {
    for (const zona of ZONAS) {
      const indice = j.zonas[zona].indexOf(uid);
      if (indice >= 0) return { jugador: j, zona, indice };
    }
  }
  return null;
}

/** La ficha de la que cuelga esta, subiendo hasta la que esta en una lista. */
export function anfitriona(mesa: Mesa, uid: string): string {
  let actual = uid;
  for (let i = 0; i < 100; i++) {
    const f = mesa.fichas[actual];
    const arriba = f?.portadaPor ?? f?.debajoDe;
    if (!arriba) return actual;
    actual = arriba;
  }
  return actual;
}

/** Las fichas anexadas o puestas debajo de `uid`, directas. */
export function dependientes(mesa: Mesa, uid: string): Ficha[] {
  return Object.values(mesa.fichas).filter(
    (f) => f.portadaPor === uid || f.debajoDe === uid,
  );
}
