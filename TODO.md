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

## Cartas por agregar

### Reimpresiones de otras ediciones

- **Qué:** agregar otras impresiones de cartas que **ya están** en el catálogo
  (Atavismo, Karma, las Legendarias de Trempulcahue, etc.). Son la misma carta:
  el objetivo es que el jugador **elija con qué arte la lleva** en su baraja.
- **De dónde:** la lista y las imágenes las entrega el proyecto. No hay que
  salir a buscarlas.
- **Por dónde:** cada reimpresión **comparte `identidad`** con su carta, para
  que el tope de copias las cuente juntas. Va en `data-src/extras.json` con los
  datos leídos de su arte, y su edición es la del producto donde salió, con su
  prefijo **al final** de `PREFIJOS` (`deck-code.ts`). Nunca se reutiliza una
  URL de imagen ya publicada (CLAUDE.md, caché de `/cards/*`).
- **Terminado cuando:** las reimpresiones salen en el catálogo, se pueden
  agregar a una baraja y cuentan como la misma carta.

### Oros iniciales por raza

- **Qué:** agregar los oros iniciales de raza que salieron en ediciones
  posteriores.
- **Ojo:** `esOroInicial()` los reconoce por el nombre "Oro Inicial
  <edición>". Si estos se llaman distinto, hay que cambiar el criterio (por
  ejemplo, un campo en el esquema, en `types.ts` y `schema.py` a la vez) y no
  forzar el nombre.
- **Terminado cuando:** están en el catálogo, se ordenan en el tramo de Oros
  como oros iniciales y sirven de oro inicial en el constructor.

### Wotan y Jarnvid, en observación en la Banlist y sin cargar

- **Qué pasa:** la Banlist pone en observación nueve cartas de fuera del
  formato. Siete ya están en el catálogo (29-09-2026); **Wotan** (Midgard,
  Eterno) y **Jarnvid** (Asgard, Eterno; la Banlist lo pide Única y lo errata
  a Tótem de raza Eterno) quedaron fuera **por decisión del proyecto, por el
  momento**. Siguen en `FUERA_DEL_FORMATO` de `documentos.test.ts`.
- **Por dónde, si se decide cargarlas:** `pnpm run data:card midgard <número>`
  y `asgard <número>` (el buscador `POST https://api.myl.cl/cards/search` da
  el número), sumar Midgard y Asgard como `parcial` en `editions.ts` y a
  `EDITION_CODES` (sus prefijos `mi` y `as` ya están en `PREFIJOS`), leer el
  arte, y sacarlas de `FUERA_DEL_FORMATO`. **Ojo con los ids**: `mi-015`,
  `as-002`, `as-005`, `as-085` y `as-104` ya están tomados en
  `ids-anteriores.ts` y no se pueden reusar.
- **Arreglado cuando:** están en el catálogo, o se decide que no entran y
  esta entrada pasa a CLAUDE.md como decisión.

## Imágenes de las cartas

Conviene hacer este grupo **en una sola pasada**: las cinco entradas tocan las
mismas WebP y el mismo `scripts/convert_images.py`. Dos cosas que valen para
todas: `data:images` **se salta las WebP que ya existen** (hay que borrarlas
antes de regenerar), y **una URL de imagen ya publicada no se reutiliza**
(`/cards/*` va con 7 días de caché: el arte nuevo va con otro nombre en el
campo `imagen`, como `pb-002-tiamat.webp`; ver CLAUDE.md).

### Arte de los packs y de la promo de Sarras con esquinas blancas y marca de agua

- **Qué pasa:** catorce cartas sueltas llegan con el arte sin recortar a
  sangre: **esquinas redondeadas blancas y un filete claro** alrededor, donde
  el resto del catálogo viene con esquinas rectas y el redondeo lo pone la
  interfaz (`rounded-card`). Son las once de Pack América —en ContraAtaque
  `ca-151` Devastador, `ca-152` Dragón de Magma, `ca-153` Balaur y `ca-154`
  Ataque de Dragón; en Templarios `te-007` Lou Carcolh, `te-030` Dama Dragón,
  `te-032` Lambton Worm, `te-049` Nube Incendiaria, `te-059` Guadaña Dragón,
  `te-061` Kyrenia y `te-063` Tugarín—, las dos promos PB1 de Dominio
  (`do-402` Dante, `do-403` Gólem de Praga) y la promo de Sarras (`cm-238`).
  Las de Pack América y Sarras llevan además la **marca de agua «Mitos y
  Leyendas»** sobre la ilustración, que es como circulan en internet. Los
  datos de las catorce están bien (verificados contra el arte); es solo la
  imagen.
- **Por decisión del proyecto no se arreglan sueltas**: se quedan como están
  hasta la pasada de imágenes de este grupo, y se arreglan ahí, todas
  juntas.
- **Por dónde:** el mismo recorte que la extensión de Escuelas Elementales.
  Ojo: **no se puede reutilizar la URL** (`/cards/*` va con 7 días de caché,
  CLAUDE.md), así que el arte recortado va con un nombre nuevo en el campo
  `imagen`, como `te-007-sd1.webp`. La marca de agua no se quita recortando:
  hace falta otra fuente del arte. Ojo: la marca de agua **no es solo de
  estas**, la trae casi todo el arte de la API (Dominio, Hijos del Sol, las
  ediciones extra…); Escuelas Elementales no. Quitarla en todo el catálogo
  es otra tarea, más grande.
- **Arreglado cuando:** las catorce se ven con el mismo borde que el resto en
  la grilla y el modal, y sin marca de agua.

### Recortar el arte de la extensión de Escuelas Elementales

- **Qué pasa:** las 11 cartas de la extensión (`ee-316` a `ee-326`: Visnu,
  Krisna, Harionna, Siddhattha Gotama, El Dharma, Aryuna, Karna, Loto Sagrado,
  Otakemaru Kijin, Arjumand Banu Begum y Divina Parashu) se ven con un marco
  raro en la grilla y en el modal. Su arte no viene de la API sino de La
  Guarida (534×760), y esas imágenes traen **el borde negro impreso de la
  carta y las esquinas redondeadas con el fondo de la foto**. Las de la API
  llegan recortadas a sangre, con esquinas rectas, y el redondeo lo pone la
  interfaz (`rounded-card`). Resultado: un marco oscuro más grueso que el del
  resto y restos grises en las esquinas. Revisado a ojo contra el resto del
  catálogo: solo estas 11 lo tienen.
- **Por dónde:** recortar esas 11 al mismo encuadre que las cartas de la API.
  La referencia buena es una carta de Escuelas Elementales con la misma
  plantilla (por ejemplo `ee-315`): medir en las dos cuánto sobra por lado y
  recortar en `scripts/convert_images.py` o antes, sobre el original. Ojo:
  los originales de `images-src/` no están en el repo (git-ignorado), así que
  hay que volver a bajarlos de La Guarida. Y `data:images` **se salta las
  WebP que ya existen**: borrar `public/cards/ee-3{16..26}.webp` y sus
  `thumb/` antes de regenerar.
- **Terminado cuando:** en una plancha junto a cartas de la API, las 11 se
  ven con el mismo borde y esquinas, en la grilla y en el modal, y en los dos
  temas.

### Cartas borrosas en la grilla del catálogo

- **Qué pasa:** en `/catalogo` las cartas se muestran grandes para que se lean,
  y a ese tamaño se ven un poco borrosas.
- **Medido:** la grilla usa las miniaturas de **200 px** (`card.thumb` en
  `CardTile.tsx`). En escritorio la carta ocupa 183 px de CSS: en una pantalla
  normal alcanza, pero en una de alta densidad (la mayoría de notebooks y
  teléfonos) son **366 px físicos**, y en un teléfono de 390 px de ancho,
  **507**. El navegador estira la miniatura 1,8 a 2,5 veces: de ahí lo
  borroso. La imagen grande del modal (420 px) tampoco llega a 2× en todas
  las pantallas.
- **Opciones a evaluar:** `srcset` con la miniatura y la imagen de 420 px, para
  que cada pantalla baje la que necesita (sin servidor funciona igual: son
  archivos estáticos); o miniaturas más grandes. Las dos cuestan descarga: la
  grilla pagina de a muchas cartas y hay que medir cuánto sube el peso de la
  página. Recordar que `next/image` va con `unoptimized` (no hay servidor que
  redimensione), así que el `srcset` se escribe a mano.
- **Terminado cuando:** se decide qué hacer con los números de peso delante y,
  si se hace, la grilla se ve nítida en una pantalla 2×.

### Revisar la resolución de las imágenes de las cartas

- **Qué:** que todas las cartas se vean con buena resolución. Hay que hacer
  una revisión edición por edición; **Escuelas Elementales se ve excelente** y
  sirve de referencia de lo que se busca.
- **Lo que ya se sabe:** todas las WebP salen a **420 px** de ancho y las
  miniaturas a **200 px** (`resize_to_width()`), pero el original de cada
  edición no es igual. La API entrega 512×732 casi siempre; las Legendarias de
  Axis Mundi, 709×1016; Legado Gótico, 419×600; y las seis Legendarias de
  Dominio, 354×508 (esas, ampliadas: tienen entrada propia, la siguiente).
  A mismo tamaño en pantalla, lo que cambia es cuánto detalle
  traía el original y cuánto se perdió al comprimir.
- **Por dónde:** una plancha por edición con la misma carta a tamaño real y
  ampliada, comparada contra Escuelas Elementales. Mirar también la calidad de
  compresión de `scripts/convert_images.py` y si conviene servir más de 420 px
  donde el original lo permite.
- **Terminado cuando:** ninguna edición se ve claramente peor que Escuelas
  Elementales, o la diferencia está explicada (un original que no existe a más
  resolución).

### Arte a tamaño completo para las seis Legendarias de Dominio

- **Qué:** DO-001 a DO-006 (Adapa, Caída del Sol, Devorar, Nammu, Xolotl y
  Carpa Dragón) no existen en la API, y su arte se consiguió aparte a
  **354×508**. `resize_to_width()` lo amplía a 420 de ancho, así que se ven
  más blandas que el resto.
- **Por dónde:** conseguir el arte a tamaño completo, borrar
  `public/cards/do-00X.webp` y su `thumb/` (`data:images` se salta las WebP
  que ya existen) y volver a correr `pnpm run data:images`.
- **Terminado cuando:** las seis se ven tan nítidas como el resto de Dominio
  en la grilla y en el modal.

## Erratas y banlist

### Aplicar las erratas y la banlist

- **Datos:** `documentos/fuente/fe-de-erratas.json` y `banlist-estandar.json`,
  ya validados con los esquemas de `src/lib/documentos.ts` y cruzados con el
  catálogo en `documentos.test.ts`.
- **Erratas:** el catálogo tiene que mostrar el texto erratado. Entre ellas, dos de
  los packs: Lahmu (`do-306`) y Ataque de Dragón (`ca-154`, que imprime
  "Destruye el Aliado oponente objetivo." y la Fe de Erratas deja en
  "Destruye un Aliado oponente"). Devastador y Dragón de Magma ya
  son Dragón porque su impresión de Pack América lo imprime. Ojo: al cargar
  Escuelas Elementales ya se propagó hacia atrás el texto vigente de **66
  cartas** (CLAUDE.md, "manda la última"); hay que ver cuáles cubre la Fe de
  Erratas y cuáles no.
- **Banlist:** el campo `legalidad` (`libre` / `restringida` / `prohibida`) ya
  existe en `src/lib/types.ts` y `scripts/schema.py`, y `validateDeck`
  (`src/lib/deck-rules.ts`) ya tiene las reglas `carta-prohibida` y
  `carta-restringida`. Hoy no disparan porque todas las cartas son `libre`.
  Falta cargar los datos, decidir qué limita `restringida` y mostrarlo en el
  catálogo y el constructor. La banlist además declara **31 cartas Únicas**
  (una copia) y 37 erratas de reglas, algunas de construcción ("Mazo
  Desafiante y/o Guerrero").
- **Ya publicadas:** se leen y descargan en `/documentos`. Al aplicarlas, que
  esas páginas y la ayuda dejen de decir "todavía no se aplican".
- **Terminado cuando:** el catálogo muestra el texto erratado, el validador
  rechaza o limita las cartas de la banlist y hay tests contra el catálogo
  real que lo comprueban.

## Grande y con decisiones previas

### Base de datos y cuentas de usuario

- **Qué:** conectar DeckForge a una base de datos (Supabase, por ejemplo) para
  poder crear cuentas y guardar barajas en la nube.
- **Ojo, cambia premisas del proyecto.** Hoy CLAUDE.md dice sin backend, sin
  cuentas, sin datos personales y con la CSP cerrada a `connect-src 'self'`.
  Antes de empezar hay que decidir y reescribir esas secciones (§1, §6 y §7):
  el host de la base de datos en la CSP, qué datos personales se guardan, si
  hace falta aviso de privacidad y cómo conviven las barajas de
  `localStorage` con las de la cuenta.
- **Por dónde:** el export estático se puede mantener si todo se hace desde el
  navegador con el cliente de Supabase y reglas de acceso por fila (RLS). La
  clave pública va en el bundle por diseño; la de servicio, nunca.
- **Terminado cuando:** se puede crear una cuenta, iniciar sesión y guardar y
  recuperar barajas desde otro dispositivo, con CLAUDE.md al día.
