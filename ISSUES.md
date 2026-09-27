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

## Arte de Pack América y de las promos PB1 con esquinas blancas y marca de agua

- **Qué pasa:** cinco cartas de los mazos llegan con el arte sin recortar a
  sangre: **esquinas redondeadas blancas y un filete claro** alrededor, donde
  el resto del catálogo viene con esquinas rectas y el redondeo lo pone la
  interfaz (`rounded-card`). Son las tres de Pack América (`pa-001`
  Devastador, `pa-006` Lambton Worm, `pa-013` Dragón de Magma) y las dos promos
  PB1 (`pb-102` Dante, `pb-103` Gólem de Praga). Las tres de Pack América
  llevan además la **marca de agua «Mitos y Leyendas»** sobre la ilustración,
  que es como las publica el fandom. Los datos de las cinco están bien
  (verificados contra el arte el 26-09-2026); es solo la imagen.
- **Por decisión del proyecto no se arreglan sueltas**: se quedan como están
  hasta la pasada de imágenes de TODO.md ("Recortar el arte de la extensión de
  Escuelas Elementales", "Revisar la resolución de las imágenes de las
  cartas"…), y se arreglan ahí, todas juntas.
- **Por dónde:** el mismo recorte que la extensión de Escuelas Elementales.
  Ojo: **no se puede reutilizar la URL** (`/cards/*` va con 7 días de caché,
  CLAUDE.md), así que el arte recortado va con un nombre nuevo en el campo
  `imagen`, como `pb-002-tiamat.webp`. La marca de agua no se quita
  recortando: hace falta otra fuente del arte.
- **Arreglado cuando:** las cinco se ven con el mismo borde que el resto en la
  grilla y el modal, y sin marca de agua.

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
