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

## Nueve cartas de los mazos del formato, sin arte de su impresión de pack

- **Qué pasa:** el formato admite la reimpresión de Pack América y Dominio de
  Tótems, que tiene otro diseño que la impresión original, y de estas nueve no
  se encontró esa imagen en ninguna fuente que se pueda bajar. Quedaron
  **fuera del catálogo** (CLAUDE.md, "Los mazos especiales del formato"):
  - **Pack América (SD1):** Lou Carcolh (SD1-04), Dama Dragón (SD1-11),
    Balaur (SD1-14), Ataque de Dragón (SD1-16), Nube Incendiaria (SD1-19),
    Guadaña Dragón (SD1-20), Kyrenia (SD1-21) y Tugarín (SD1-23).
  - **Dominio de Tótems (SD2):** Árbol del Grito.
- **Dónde se buscó:** el fandom solo tiene páginas `(SD)` de Devastador,
  Dragón de Magma, Lambton Worm, Cristalino Amarillo y Máscara de Oro; La
  Guarida no vende los SD; la API no tiene los mazos. La página de Facebook
  **Cartoteca MyL** publica cada carta con su código (`SD1-04-39 Lou
  Carcolh`), pero no se puede bajar sin sesión.
- **Por dónde:** conseguir las imágenes (escaneo propio o Cartoteca MyL),
  ponerlas en `images-src/pa-0NN.png` / `dt-0NN.png`, cargar la carta en
  `data-src/extras.json` leyendo el arte, sumar `dominio-de-totems` a
  `editions.ts` con la primera, y sacarlas de `SIN_ARTE` en
  `productos.test.ts` (y Ataque de Dragón de `documentos.test.ts`).
- **Arreglado cuando:** están las nueve, con la impresión del mazo.

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
