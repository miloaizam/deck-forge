# TODO

Todo lo pendiente del proyecto, en **una sola lista**: lo que falta hacer y lo
que existe pero está mal. Va agrupado por tema, para trabajar de a un grupo.

**Cómo se usa.** Al hacer o arreglar algo de esta lista, en el **mismo commit**
se borra su entrada. No se tacha ni se marca como hecho: lo hecho ya queda en
el historial de git y en [CLAUDE.md](CLAUDE.md), y aquí solo vive lo que falta.
Si queda a medias, se reescribe la entrada con lo que queda. Y lo que se
descubra roto y no se arregle en el momento se anota aquí, en su grupo, en vez
de perderse.

Cada entrada lleva qué es, por dónde empezar y cuándo se da por terminada.

---

## Orden sugerido

1. **Pegar el esquema en Supabase** (la cinta de la portada y el filtro de
   formato de la Comunidad).
2. **Cargar las cartas de fuera del bloque de VCR.**

## Base de datos

### Pegar el esquema nuevo en Supabase

- **Qué:** la cinta de cartas de la portada pide `cartas_destacadas()`, que
  no existe hasta pegar el esquema (con las tablas `destacadas` y
  `destacadas_estado`). Mientras tanto la portada recibe un 404 y se queda
  con el grupo fijo de cartas; nada se rompe. Y el filtro de formato de la
  Comunidad pide la columna `barajas.formato` y el parámetro `formato` de
  `listar_publicas` (27-10-2026): sin ellos, la lista sin filtro sigue
  saliendo, pero con «VCR» o «Infantería» puesto da error.
- **Por dónde:** Supabase → SQL Editor → pegar `supabase/esquema.sql` entero
  → Run.
- **Terminado cuando:** con 10 barajas públicas o más, la portada dice «Las
  más usadas en la Comunidad» bajo la cinta, y en `/comunidad` el filtro
  «VCR» lista sin error.

## Datos

### Las cartas de fuera del bloque que admite VCR

- **Qué:** la Banlist VCR admite trece cartas de fuera del bloque EE y nueve
  no están en el catálogo: **Nixe** (Templarios), **Yudhishthira** (Dharma),
  **Nefertari** y **Helios** (Kemet), **Tormod Kark** y **Reina Aesir**
  (Asgard), **Serpopardo** (Camelot), **Sacerdotisa de Odín** (Midgard) y
  **Hadas** (Furia). La Banlist las nombra, pero no se pueden agregar.
- **Por dónde:** cargarlas en `data-src/extras.json` (Adicionales) como las
  nueve de observación de la Estándar, revisadas contra el arte
  (`pnpm run data:card <edicion> <numero>`), y borrarlas de
  `FALTAN_EN_EL_CATALOGO` (`src/lib/documentos.ts`): el test exige que
  sigan faltando mientras estén ahí. Ojo con «Hadas»: que sea la de Furia.
- **Terminado cuando:** las nueve salen en el catálogo con `?formato=vcr` y
  `FALTAN_EN_EL_CATALOGO` queda vacía.
