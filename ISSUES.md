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

## Nueva revisión del catálogo: podrían faltar cartas

- **Qué pasa:** hay cartas que dan la impresión de no estar en el catálogo.
  Además de las faltantes, conviene aprovechar la pasada para buscar errores
  de datos que se hayan escapado.
- **Precedentes:** la API ya escondió cartas antes. Por arriba, Sol Naciente
  tenía a Takemikazuchi (SN-143) fuera del listado; por abajo, las seis
  Legendarias de Dominio no existen en la API; y la extensión de Escuelas
  Elementales tampoco estaba.
- **Ya revisado, sin red:** las diez ediciones cargadas no tienen huecos en
  su numeración (la única excepción, Sol Naciente 132 y 140, ya está
  explicada: Ordalía y la promo de Sarras).
- **Qué falta revisar**, por producto:
  - **Barajas prearmadas del formato**: **Pack América**, **Kit Terra
    Orientalis** y **Kit Sanctum**. Según el fandom, los dos kits salieron el
    9 de septiembre de 2021 y cada uno agregó **dos cartas nuevas** al formato,
    inspiradas en Dinastía del Dragón.
  - **Promos de juego organizado** de Escuelas Elementales. Por ejemplo, la
    **Danza Macabra** de OP: ya están EE-053 y LG-024, pero hay que ver si la de
    OP es otra impresión (otro arte o código `2021-0XX`) y si hay más promos.
  - Cada edición contra su total **impreso** en el pie (`ESC-040-300`,
    `SOL-013-232`…) y contra la lista del fandom, y
    `/static/cards/<ed>/<n>.png` desde 001 y unos números más allá del último.
- **Por dónde:** la API (`/cards/edition/<slug>` de cada producto), el fandom
  por `api.php?action=parse` y La Guarida como índice. **Desde la sesión del
  26-09-2026 los tres dominios (`api.myl.cl`, `myl.fandom.com`,
  `laguarida.store`) estaban bloqueados por la red del entorno**: hay que
  permitirlos antes de empezar.
- **Cómo clasificar cada carta que aparezca:** nueva del formato (se carga),
  reimpresión de una que ya está (se carga compartiendo `identidad`), de fuera
  del formato (no se carga salvo que la Banlist la admita) o no jugable (juez,
  ficha): no se carga. Primero un informe, después la carga.
- **Arreglado cuando:** cada producto y cada edición cuadran con lo cargado, o
  la diferencia queda explicada en CLAUDE.md como se hizo con Ordalía y la
  promo dorada de Sarras.

## Cartas de fuera de las diez ediciones que los documentos nombran y no están

- **Qué pasa:** la Fe de Erratas y la Banlist erratan o ponen en observación
  cartas que **no están en el catálogo**, porque no son de las diez ediciones
  cargadas. Si el formato las admite, hoy no se pueden agregar a una baraja:

  | Carta | De dónde | Qué dicen los documentos |
  |---|---|---|
  | Devastador | Furia (`1FU-004-190`) | Errata de raza: Bestia → **Dragón** |
  | Dragón de Magma | Furia (`1FU-033-190`) | Errata de raza: Bestia → **Dragón** |
  | Ataque de Dragón | Furia (`1FU-038-190`) | Tres versiones impresas → «Destruye un Aliado oponente» |
  | Lahmu | Dominio, `DO-RP-006` | Errata de habilidad. Es una reimpresión con código `RP` que la API de Dominio no entrega |
  | Wyvern Dorado | Camelot | En observación: **Única**; errata «Aliado raza Dragón» |
  | Wotan | Midgard | En observación, sin condición |
  | Melusina | Templarios | En observación, sin condición |
  | Jarnvid | Asgard | En observación: **Única**; errata de Tótem de raza Eterno |
  | Anubis de Inpu | Kemet | En observación: **Única** |
  | Mut | Kemet | En observación: **libre por tres copias** |
  | Bibi Dalair Kaur | Dharma | En observación: **Errante** |
  | Raksasa Sombrío | Dharma | En observación; errata de habilidad entera |
  | Muhammad Bin Qasim | Dharma | En observación |

- **Ojo con lo que ya hay en el repo:** `scripts/fetch_card.py`
  (`pnpm run data:card`) existe para esto y baja una carta suelta a
  `data-src/extras.json`, pero **ese archivo nunca se commiteó**: no hay
  ninguna carta suelta cargada. Y las seis ediciones `parcial` de
  `src/lib/editions.ts` y de `EDITION_CODES` (Helénica, Imperio, Espada
  Sagrada, Dominios de Ra, Cruzadas y Furia) están vacías y **no coinciden**
  con las de esta tabla, salvo Furia. Hay que ver de dónde salió esa lista.
- **Por dónde:** decidir con el reglamento cuáles entran; cargarlas con
  `pnpm run data:card`; sumar las ediciones que falten como `parcial`
  (Camelot, Midgard, Templarios, Asgard, Kemet, Dharma) con su prefijo **al
  final** de `PREFIJOS` (`deck-code.ts`) y de `EDITION_CODES`; aplicarles la
  errata y la condición de la Banlist. Lahmu va aparte: es de Dominio, hay que
  conseguir su arte y darle un código que no choque con los de la API.
- **Arreglado cuando:** cada una está en el catálogo o su exclusión queda
  explicada, y `FUERA_DEL_FORMATO` de `src/lib/documentos.test.ts` se reduce a
  las que de verdad no entran.
