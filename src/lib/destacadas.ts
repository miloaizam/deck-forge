import * as z from "zod/mini";

import type { Card } from "./types";

/**
 * Las cartas de la cinta de la portada: las mas usadas en las barajas
 * publicas de la Comunidad.
 *
 * La base guarda solo ids (CLAUDE.md, "Cuentas y Comunidad"): la funcion
 * `cartas_destacadas()` de `supabase/esquema.sql` devuelve las 80 ids que
 * estan en mas barajas, ya calculadas. Agruparlas por carta (las impresiones
 * de Kirin suman juntas) y quitar los Oros sin habilidad, que estan en todas
 * las barajas, necesita el catalogo, y la portada no lo baja: lee
 * `/data/portada.json`, que el build arma con `gruposDePortada()`. Son ~24 KB
 * con gzip y solo se piden cuando hay ranking que mostrar.
 */

/** Cuantas cartas lleva la cinta. */
export const CARTAS_EN_CINTA = 12;

/** Con menos barajas publicas el ranking no dice nada: va el grupo fijo. */
export const MIN_BARAJAS = 10;

/**
 * El grupo fijo, en el HTML: lo que se ve sin red, mientras llega el ranking
 * o si no lo hay. Legendarias y Ultra Reales de Escuelas Elementales, la
 * edicion que da nombre al formato.
 */
export const DESTACADAS_FIJAS = [
  "ee-001",
  "ee-002",
  "ee-003",
  "ee-004",
  "ee-009",
  "ee-010",
  "ee-011",
  "ee-012",
  "ee-013",
  "ee-014",
  "ee-015",
  "ee-019",
] as const;

/** Lo que pinta la cinta de cada carta. */
export interface CartaCinta {
  nombre: string;
  imagen: string;
  thumb: string;
}

const ID = /^[a-z]{2}-\d{3}$/;
const SLUG = /^[a-z0-9-]+$/;

/** Lo que responde `cartas_destacadas()`, que viene de afuera (seguridad #4). */
const filasSchema = z
  .array(
    z.object({
      carta: z.string().check(z.regex(ID)),
      barajas: z.int().check(z.minimum(0)),
      total: z.int().check(z.minimum(0)),
    }),
  )
  .check(z.maxLength(80));

export type FilaDestacada = z.infer<typeof filasSchema>[number];

/** `null` si la respuesta no tiene la forma esperada. */
export function leerFilas(datos: unknown): FilaDestacada[] | null {
  const r = filasSchema.safeParse(datos);
  return r.success ? r.data : null;
}

/**
 * `/data/portada.json`: un grupo por carta (todas sus impresiones), con el
 * nombre y la imagen de la impresion que va primera en el catalogo. La
 * imagen va sin `/cards/` ni `.webp`: son 2650 ids y el archivo se repite
 * mucho. Es nuestro, pero llega por la red: se valida igual.
 */
const gruposSchema = z
  .array(
    z.tuple([
      z.array(z.string().check(z.regex(ID))).check(z.minLength(1), z.maxLength(60)),
      z.string().check(z.minLength(1), z.maxLength(80)),
      z.string().check(z.regex(SLUG), z.maxLength(40)),
    ]),
  )
  .check(z.maxLength(5000));

export type GrupoPortada = z.infer<typeof gruposSchema>[number];

export function leerGrupos(datos: unknown): GrupoPortada[] | null {
  const r = gruposSchema.safeParse(datos);
  return r.success ? r.data : null;
}

/** Un Oro sin habilidad va en todas las barajas: no dice nada de la Comunidad. */
function cuentaParaLaCinta(card: Card): boolean {
  return !(card.tipo === "Oro" && card.habilidad === "");
}

/**
 * Los grupos de `/data/portada.json`, del catalogo ya ordenado (`getCards()`):
 * la primera impresion de cada carta es la que la representa.
 */
export function gruposDePortada(cards: readonly Card[]): GrupoPortada[] {
  const grupos = new Map<string, GrupoPortada>();
  for (const card of cards) {
    if (!cuentaParaLaCinta(card)) continue;
    const grupo = grupos.get(card.identidad);
    if (grupo) grupo[0].push(card.id);
    else grupos.set(card.identidad, [[card.id], card.nombre, slugDeImagen(card.imagen)]);
  }
  return [...grupos.values()];
}

function slugDeImagen(imagen: string): string {
  return imagen.replace(/^\/cards\//, "").replace(/\.webp$/, "");
}

export function cartaDeGrupo(grupo: GrupoPortada): CartaCinta {
  const [, nombre, slug] = grupo;
  return { nombre, imagen: `/cards/${slug}.webp`, thumb: `/cards/thumb/${slug}.webp` };
}

/**
 * Las cartas de la cinta, de la mas usada a la menos: cada impresion suma a
 * su carta y lo que no es carta del catalogo (un Oro sin habilidad, un id
 * viejo) se ignora. `null` si no alcanza: menos de `MIN_BARAJAS` barajas
 * publicas o menos de `CARTAS_EN_CINTA` cartas distintas. Entonces se queda
 * el grupo fijo.
 */
export function elegirDestacadas(
  filas: readonly FilaDestacada[],
  grupos: readonly GrupoPortada[],
): CartaCinta[] | null {
  if (filas.length === 0 || filas[0].total < MIN_BARAJAS) return null;
  const grupoDeId = new Map<string, number>();
  grupos.forEach((g, i) => {
    for (const id of g[0]) grupoDeId.set(id, i);
  });
  const usos = new Map<number, number>();
  for (const f of filas) {
    const g = grupoDeId.get(f.carta);
    if (g !== undefined) usos.set(g, (usos.get(g) ?? 0) + f.barajas);
  }
  if (usos.size < CARTAS_EN_CINTA) return null;
  return [...usos]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, CARTAS_EN_CINTA)
    .map(([g]) => cartaDeGrupo(grupos[g]));
}
