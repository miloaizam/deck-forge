# Issues

Errores, bugs y cosas que **existen pero hay que arreglar o mejorar**. Lo que
todavía no existe va en [TODO.md](TODO.md).

**Cómo se usa.** Al encontrar un problema que no se arregla en el momento, se
anota aquí. Al arreglarlo, en el **mismo commit** se borra su entrada. No se
tacha ni se marca como resuelto: lo resuelto queda en el historial de git, y
aquí solo vive lo que sigue roto. Si el arreglo es parcial, se reescribe la
entrada con lo que queda.

Cada entrada lleva qué pasa, dónde, y cómo se comprueba que está arreglado.
Ordenadas de más a menos importante.

---

## Cartas en observación de la Banlist, sin cargar

- **Qué pasa:** la Banlist pone **en observación** nueve cartas de ediciones
  que no son del formato, cada una con una condición: Wyvern Dorado (Camelot,
  Única), Wotan (Midgard), Melusina (Templarios), Jarnvid (Asgard, Única),
  Anubis de Inpu (Kemet, Única), Mut (Kemet, libre por tres copias), Bibi
  Dalair Kaur (Dharma, Errante), Raksasa Sombrío y Muhammad Bin Qasim
  (Dharma). **Por decisión del proyecto no se cargaron** al revisar las cartas
  faltantes (26-09-2026): el catálogo cubre las diez ediciones y los productos
  especiales del formato, y estas no son de ninguno.
- **Por dónde, si se decide cargarlas:** `pnpm run data:card <edición>
  <número>` (el buscador `POST https://api.myl.cl/cards/search` da la edición y
  el número de cada una), sumar sus ediciones como `parcial` con el prefijo al
  final de `PREFIJOS`, aplicar la condición de la Banlist y la errata, y
  sacarlas de `FUERA_DEL_FORMATO` en `documentos.test.ts`.
- **Arreglado cuando:** se cargan, o se confirma que no entran y esta entrada
  pasa a CLAUDE.md como decisión.
