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

## Datos

### Reimpresiones en los kits entre Conjuros y Furia

- **Qué:** revisar los kits y mazos que salieron entre Conjuros y Furia
  buscando reimpresiones de cartas del catálogo que falten en Arte
  Alternativo. Quedan fuera las ediciones ya revisadas entre Bushido y
  Escuelas Elementales. **Mariamman** del Kit Eterno ya está (`aa-420`); el
  resto de los kits de **Colecciones Raciales 2021** (y los de 2020) está
  sin revisar.
- **Por dónde:** el listado de productos del fandom (la plantilla de cada
  carta trae una tabla «Otras versiones» con cada reimpresión, y
  `Lista de cartas de Colecciones Raciales 2021`); la API no tiene los kits.
  Mismo criterio que la carga de Arte Alternativo
  (CLAUDE.md): que la habilidad sea igual o casi igual, y consultar los
  casos dudosos.
- **Terminado cuando:** cada kit está revisado y sus reimpresiones cargadas
  en `data-src/arte-alternativo.json`.

## Grande y con decisiones previas

### Pegar el esquema nuevo en Supabase

- **Qué:** el esquema ganó dos cosas el 23-10-2026: `por_nombre` en
  `listar_publicas` (el orden A-Z de la Comunidad) y la **foto de perfil**
  (bucket `avatares`, sus políticas, las columnas `avatar` y `avatar_oculto` y
  el motivo de reporte `foto`). Hasta que se pegue, el botón A-Z y subir una
  foto dan error; el resto funciona igual.
- **Por dónde:** Supabase → SQL Editor → pegar `supabase/esquema.sql` entero
  → Run. Se puede correr las veces que haga falta.
- **Terminado cuando:** en `/comunidad` el botón de las flechas ordena por
  nombre sin error, y en «Tu cuenta» «Poner foto» sube una que se ve en la
  navbar y en la Comunidad (Storage → `avatares` muestra el archivo).

### Probar las cuentas de punta a punta

- **Qué:** las cuentas y la Comunidad están encendidas (22-10-2026), pero
  falta la prueba con Google de verdad, que solo puede hacer una persona: la
  sesión en la nube no llega a `supabase.co`.
- **Por dónde:** la lista «Antes de anunciarlo» de
  [`docs/cuentas.md`](docs/cuentas.md), paso 5, en `deckforge-myl.pages.dev`
  y con dos cuentas de Google. Lo que falle se anota aquí.
- **Terminado cuando:** los seis puntos de esa lista pasan.
