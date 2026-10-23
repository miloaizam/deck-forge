import { bloquesDelDar, claveDeNombre, type BloqueDar, type Dar } from "./documentos";
import { cartasDe } from "./marcado";
import type { Card } from "./types";

/** Lo que la pagina del DAR necesita de una carta de ejemplo. */
export interface CartaDoc {
  nombre: string;
  thumb: string;
  imagen: string;
}

/** Las cartas de ejemplo, por `claveDeNombre`; falta la que no es del formato. */
export type CartasDoc = Record<string, CartaDoc | undefined>;

/** Cada carta que el DAR muestra o nombra, sin repetir. */
export function cartasDelDar(dar: Dar): string[] {
  const nombres = dar.secciones.flatMap((s) =>
    [...bloquesDelDar(s.bloques)].flatMap((b): string[] => {
      switch (b.tipo) {
        case "cartas":
          return b.cartas;
        case "caso":
          return [...(b.carta ? [b.carta] : []), ...(b.cita ?? []).flatMap(cartasDe)];
        case "parrafo":
        case "nota":
          return cartasDe(b.texto);
        case "lista":
          return b.items.flatMap(cartasDe);
        case "etiquetada":
          return b.items.flatMap((i) => cartasDe(i.texto));
        default:
          return [];
      }
    }),
  );
  return [...new Set(nombres)];
}

/**
 * La impresion que se muestra de cada carta: la primera en el orden del
 * catalogo (`getCards` ya viene ordenado), que es la de la edicion mas nueva.
 * Arte Alternativo y Adicionales van al final de ese orden, asi que solo
 * salen si la carta no tiene otra.
 */
export function resolverCartas(nombres: string[], catalogo: Card[]): CartasDoc {
  const buscadas = new Set(nombres.map(claveDeNombre));
  const cartas: CartasDoc = {};
  for (const c of catalogo) {
    const k = claveDeNombre(c.nombre);
    if (buscadas.has(k) && !cartas[k]) {
      cartas[k] = { nombre: c.nombre, thumb: c.thumb, imagen: c.imagen };
    }
  }
  return cartas;
}

/** Cuantas reglas con letra tiene el DAR (las cifras de /documentos). */
export function reglasDelDar(dar: Dar): number {
  return dar.secciones.reduce(
    (n, s) => n + [...bloquesDelDar(s.bloques)].filter((b) => b.tipo === "regla").length,
    0,
  );
}

/** Los conceptos de juego de la seccion 10 (Agrupar … Traicion). */
export function conceptosDelDar(dar: Dar): number {
  const s = dar.secciones.find((x) => x.id === "10");
  return s ? apartadosNumerados(s.bloques).length : 0;
}

/** Los apartados numerados de una lista de bloques: los hijos del indice. */
export function apartadosNumerados(
  bloques: BloqueDar[],
): { id: string; numero: string; titulo: string }[] {
  return bloques.flatMap((b) =>
    b.tipo === "apartado" && b.numero
      ? [{ id: b.id, numero: b.numero, titulo: b.titulo }]
      : [],
  );
}
