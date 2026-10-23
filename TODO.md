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

De dónde sale lo de hoy (23-10-2026): la revisión de código (`/code-review`) y
la de seguridad (`/security-review`) de todo lo de cuentas, Comunidad y foto
de perfil (`a620db7..HEAD`), y la revisión visual de las 16 páginas a 1440,
768 y 390 px con la skill `taste-skill`.

---

## Orden sugerido

1. **Pegar el esquema en Supabase** (la cinta de la portada).
2. **Por decidir**, cuando haya ganas: no bloquea nada.

## Base de datos

### Pegar el esquema nuevo en Supabase

- **Qué:** la cinta de cartas de la portada pide `cartas_destacadas()`, que
  no existe hasta pegar el esquema (con las tablas `destacadas` y
  `destacadas_estado`). Mientras tanto la portada recibe un 404 y se queda
  con el grupo fijo de cartas; nada se rompe.
- **Por dónde:** Supabase → SQL Editor → pegar `supabase/esquema.sql` entero
  → Run.
- **Terminado cuando:** con 10 barajas públicas o más, la portada dice «Las
  más usadas en la Comunidad» bajo la cinta.

## Por decidir

Salió de la revisión visual con `taste-skill`. Son cosas que esa skill marca
como defecto y que hoy son decisiones de la marca; no se tocan sin decidirlo.

### Documentos con media pantalla vacía

- **Qué:** bajo las tres tarjetas (DAR, Fe de Erratas y Banlist) no hay nada.
- **Opciones:** dejarla así (es una página de paso) o agregar debajo lo último
  que cambió en cada documento.

### Columnas angostas en Novedades y Privacidad

- **Qué:** en escritorio el texto ocupa ~650 px y deja vacía la derecha. La
  skill lo castiga; para texto de lectura es lo correcto.
- **Recomendación:** dejarlo como está.

### Lo que la skill considera «plantilla»

- **Qué:** el violeta de marca, el degradado y el título degradado de la
  portada, las etiquetas chicas en mayúsculas sobre cada título («BARAJAS»,
  «COMUNIDAD», «TODO»), los iconos dentro de círculos de color, las pastillas
  («Legal», «Oro inicial»), el brillo violeta de la última novedad y las
  etiquetas «DONDE DICE / DEBE DECIR» de la Fe de Erratas.
- **Recomendación:** mantenerlos; son coherentes en todo el sitio y están en
  DESIGN.md. Lo único que valdría revisar es la etiqueta «TODO» del catálogo,
  que no dice nada.
