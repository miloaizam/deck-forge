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

### Oros iniciales de raza de Conjuros

- **Qué:** el proyecto dice que Conjuros trae oros iniciales por raza, como
  Dinastía del Dragón (los 33 de esa ya están en Adicionales). **La API no
  los tiene**: el listado de Conjuros son 81 cartas (`edid` 000–080) y
  `/static/cards/41/081.png` en adelante da 404.
- **Por dónde:** conseguir el arte por otro lado y cargarlos como los de
  Dinastía: `Oro Inicial <raza>` en Adicionales, frecuencia `Oro`, sin
  habilidad, ilustrador leído del pie.
- **Terminado cuando:** están en Adicionales, o se confirma que no existen.

## Imágenes de las cartas

Conviene hacer este grupo **en una sola pasada**: las cinco entradas tocan las
mismas WebP y el mismo `scripts/convert_images.py`. Dos cosas que valen para
todas: `data:images` **se salta las WebP que ya existen** (hay que borrarlas
antes de regenerar), y **una URL de imagen ya publicada no se reutiliza**
(`/cards/*` va con 7 días de caché: el arte nuevo va con otro nombre en el
campo `imagen`; ver CLAUDE.md).

### Arte de los packs y de la promo de Sarras con esquinas blancas y marca de agua

- **Qué pasa:** catorce cartas sueltas llegan con el arte sin recortar a
  sangre: **esquinas redondeadas blancas y un filete claro** alrededor, donde
  el resto del catálogo viene con esquinas rectas y el redondeo lo pone la
  interfaz (`rounded-card`). Son las once de Pack América, todas en
  Adicionales —`ad-020` Lou Carcolh, `ad-021` Dama Dragón, `ad-022` Lambton
  Worm, `ad-023` Nube Incendiaria, `ad-024` Guadaña Dragón, `ad-025`
  Kyrenia, `ad-026` Tugarín, `ad-027` Devastador, `ad-028` Dragón de Magma,
  `ad-029` Balaur y `ad-030` Ataque de Dragón—, las dos promos PB1 (`ad-018`
  Dante, `ad-019` Gólem de Praga) y la promo de Sarras (`aa-001`).
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
  `imagen`, como `ad-020-recorte.webp`. La marca de agua no se quita recortando:
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
  los packs: Lahmu (`ad-005`) y Ataque de Dragón (`ad-030`, que imprime
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
