import { esOroInicial } from "./card-order";
import { RAZAS, TIPOS, type Card } from "./types";

/**
 * Los tres tipos de Oro, que el catalogo y el constructor distinguen:
 *
 * - **Con habilidad**: una carta como cualquier otra. Tope de 3 copias, o 1
 *   si es Unica.
 * - **Sin habilidad**: el recurso con que se paga todo. Sin tope de copias, y
 *   cualquiera puede ser el oro inicial de una baraja.
 * - **Oro inicial de edicion**: las cartas "Oro Inicial <edicion>", a arte
 *   completo. Funcionan igual que las sin habilidad; se separan para poder
 *   filtrarlas y lucirlas.
 * - **Oro inicial de raza**: lo mismo, pero "Oro Inicial <raza>". Salieron en
 *   Dinastia del Dragon, tres por raza, y viven en Adicionales.
 *
 * Ojo con el nombre: "oro inicial" a secas es el ROL dentro de la baraja (el
 * Oro sin habilidad que se aparta antes de empezar, `Deck.oroInicial`), y lo
 * puede cumplir cualquiera de los tres ultimos tipos. Por eso los iniciales
 * se llaman "de edicion" y "de raza" en toda la interfaz. Las reglas no miran esta clase:
 * `oroSinHabilidad` (deck-rules.ts) cubre a los dos.
 *
 * Los tres grupos no se pisan: cada Oro cae en uno solo.
 */

export const CLASES_DE_ORO = [
  "con-habilidad",
  "sin-habilidad",
  "inicial-edicion",
  "inicial-raza",
] as const;
export type ClaseDeOro = (typeof CLASES_DE_ORO)[number];

export const ETIQUETA_ORO: Record<ClaseDeOro, string> = {
  "con-habilidad": "Oro con habilidad",
  "sin-habilidad": "Oro sin habilidad",
  "inicial-edicion": "Oro inicial de edición",
  "inicial-raza": "Oro inicial de raza",
};

/** La pastilla que llevan en la grilla los dos tipos de oro inicial. */
export const PASTILLA_ORO: Partial<Record<ClaseDeOro, string>> = {
  "inicial-edicion": "Inicial de edición",
  "inicial-raza": "Inicial de raza",
};

const RAZAS_DE_ORO = new Set<string>(RAZAS);

export function esClaseDeOro(v: string): v is ClaseDeOro {
  return (CLASES_DE_ORO as readonly string[]).includes(v);
}

export function claseDeOro(
  card: Pick<Card, "tipo" | "nombre" | "habilidad">,
): ClaseDeOro | null {
  if (card.tipo !== "Oro") return null;
  if (card.habilidad.trim() !== "") return "con-habilidad";
  if (!esOroInicial(card)) return "sin-habilidad";
  const sufijo = card.nombre.slice("Oro Inicial ".length);
  return RAZAS_DE_ORO.has(sufijo) ? "inicial-raza" : "inicial-edicion";
}

/** Lo que se escribe bajo el nombre de una carta: su clase si es Oro, si no raza o tipo. */
export function subtituloDeCarta(card: Card): string {
  const clase = claseDeOro(card);
  return clase ? ETIQUETA_ORO[clase] : (card.raza ?? card.tipo);
}

/** El tipo de una carta, con la clase si es Oro ("Oro sin habilidad"). */
export function tipoDeCarta(card: Card): string {
  const clase = claseDeOro(card);
  return clase ? ETIQUETA_ORO[clase] : card.tipo;
}

/**
 * Las opciones del filtro Tipo: los tipos de carta en orden alfabetico, con
 * los tres tipos de Oro justo debajo de "Oro" (que sigue ofreciendo todos).
 * Para el jugador los tres son tipos de carta, asi que no llevan filtro
 * aparte.
 */
const COLLATOR = new Intl.Collator("es");
export const OPCIONES_DE_TIPO: readonly string[] = [...TIPOS]
  .sort(COLLATOR.compare)
  .flatMap((t) => (t === "Oro" ? [t, ...CLASES_DE_ORO] : [t]));

/** Si la carta cae en esa opcion del filtro Tipo: un tipo o una clase de Oro. */
export function coincideTipo(card: Card, valor: string): boolean {
  if (valor === "") return true;
  return esClaseDeOro(valor) ? claseDeOro(card) === valor : card.tipo === valor;
}

/** Como se lee una opcion del filtro Tipo. */
export function etiquetaDeTipo(valor: string): string {
  return esClaseDeOro(valor) ? ETIQUETA_ORO[valor] : valor;
}
