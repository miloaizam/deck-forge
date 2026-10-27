import { FORMATOS, type Formato, type Frecuencia } from "./types";

/**
 * Los formatos de juego dentro de Escuelas Elementales (decision del
 * proyecto, 27-10-2026): Estandar, VCR e Infanteria. Los tres comparten el DAR
 * y la Fe de Erratas; cada uno tiene su Banlist (`erratas.ts`), y VCR e
 * Infanteria acotan ademas las frecuencias.
 *
 * Este modulo es liviano a proposito (nombres y frecuencias): lo importan la
 * Comunidad y los filtros. Lo que necesita las Banlists, que pesan, vive en
 * `en-formato.ts`.
 *
 * La frecuencia se mira por CARTA y no por impresion: una carta entra en VCR
 * si alguna de sus impresiones en las diez ediciones (Bushido a Escuelas
 * Elementales) es Vasallo, Cortesano o Real, y entonces vale con cualquier
 * arte, Milenaria o Arte Alternativo incluidos. Las reimpresiones de Arte
 * Alternativo y de Adicionales no cuentan para eso: una carta no se vuelve
 * Real porque un pack la reimprimiera asi. La unica excepcion es la carta que
 * solo existe en Adicionales (los packs), que no tiene otra frecuencia que
 * mirar.
 */

export const NOMBRE_FORMATO: Record<Formato, string> = {
  estandar: "Estándar",
  vcr: "VCR",
  infanteria: "Infantería",
};

/**
 * Las frecuencias que admite cada formato; `null` es todas. Los Oros van en
 * los tres: son el recurso con que se paga, e Infanteria hace Unicas a dos
 * Oros con habilidad (Cavorita y Contrabando de Seda).
 */
export const FRECUENCIAS_DEL_FORMATO: Record<Formato, readonly Frecuencia[] | null> = {
  estandar: null,
  vcr: ["Vasallo", "Cortesano", "Real", "Oro"],
  infanteria: ["Vasallo", "Cortesano", "Oro"],
};

/** Lo que el formato acota, en una frase para la interfaz. */
export const DESCRIPCION_FORMATO: Record<Formato, string> = {
  estandar: "Todas las frecuencias.",
  vcr: "Solo Vasallos, Cortesanos y Reales.",
  infanteria: "Solo Vasallos y Cortesanos.",
};

export function esFormato(valor: string): valor is Formato {
  return (FORMATOS as readonly string[]).includes(valor);
}
