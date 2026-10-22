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

### Base de datos y cuentas de usuario

- **Qué:** cuentas opcionales con Supabase (Google), sincronización de
  barajas y colección, y la Comunidad (barajas públicas, likes, copias,
  reportes). **El código ya está y está apagado**: `supabase/proyecto.json`
  lleva `url` y `key` en `null`. Esquema en `supabase/esquema.sql` (probado
  contra Postgres 16), cliente en `src/components/nube/`, lógica pura en
  `src/lib/sync.ts` y `src/lib/comunidad.ts`, pruebas con Supabase simulado
  en `e2e/nube.spec.ts` (`pnpm run e2e:nube`).
- **Falta:** decidir si se queda Supabase o se pasa a Cloudflare D1 (en
  conversación); crear el proyecto y Google OAuth (guía en el plan, pasarla a
  `docs/cuentas.md`); llenar `proyecto.json`; probar de punta a punta con
  Google; y documentar en CLAUDE.md (§1, §2, §4, §6, §7, §9), DESIGN.md,
  `faq.ts` y `novedades.ts`.
- **Terminado cuando:** se puede crear una cuenta, iniciar sesión, guardar y
  recuperar barajas desde otro dispositivo y publicar en la Comunidad, con
  CLAUDE.md al día.
