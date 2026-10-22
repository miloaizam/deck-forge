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

### Encender las cuentas y la Comunidad

- **Qué:** las cuentas (Supabase con Google) y la Comunidad ya están en el
  código y documentadas en CLAUDE.md («Cuentas y Comunidad»), pero
  **apagadas**: `supabase/proyecto.json` lleva `url` y `key` en `null`.
- **Por dónde:** [`docs/cuentas.md`](docs/cuentas.md), pasos 1 a 5: crear el
  proyecto, correr `supabase/esquema.sql`, configurar Google, llenar
  `proyecto.json`, `pnpm run build && pnpm run audit`. En el mismo commit que
  las enciende, la ayuda (`faq.ts`: la cuenta y la Comunidad) y la entrada de
  `novedades.ts`.
- **Terminado cuando:** la prueba de punta a punta de `docs/cuentas.md` pasa
  en `deckforge-myl.pages.dev` con dos cuentas de Google.
