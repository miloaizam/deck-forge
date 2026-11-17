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
