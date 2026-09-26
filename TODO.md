# TODO

Funcionalidades y cambios **por hacer**: lo que todavía no existe. Los errores y
las cosas que existen pero están mal van en [ISSUES.md](ISSUES.md).

**Cómo se usa.** Al implementar algo de esta lista, en el **mismo commit** se
borra su entrada. No se tacha ni se marca como hecho: lo hecho ya queda en el
historial de git y en [CLAUDE.md](CLAUDE.md), y aquí solo vive lo que falta. Si
se implementa a medias, se reescribe la entrada con lo que queda.

Cada entrada lleva qué es, por qué importa, por dónde empezar y cuándo se da por
terminada.

---

## Recrear la Fe de Erratas y la Banlist de MyL

- **Qué:** rehacer como archivos propios los dos documentos oficiales del
  formato: la **Fe de Erratas** (qué dice hoy cada carta corregida) y la
  **Banlist** (qué cartas están prohibidas o restringidas).
- **Por qué:** son la base de las dos entradas que siguen. Tenerlos como datos
  y no solo como PDF permite aplicarlos al catálogo y al validador.
- **Por dónde:** un archivo de datos por documento, validado con Zod como todo
  lo que entra desde fuera del bundle, y su versión para leer y descargar.
  Anotar la fecha y la fuente oficial de cada uno.
- **Terminado cuando:** los dos documentos existen en el repo, completos y
  contrastados con la fuente oficial.

## Aplicar las erratas y la banlist

- **Erratas:** el catálogo tiene que mostrar el texto erratado. Ojo: al cargar
  Escuelas Elementales ya se propagó hacia atrás el texto vigente de **66
  cartas** (CLAUDE.md, "manda la última"); hay que ver cuáles cubre la Fe de
  Erratas y cuáles no.
- **Banlist:** el campo `legalidad` (`libre` / `restringida` / `prohibida`) ya
  existe en `src/lib/types.ts` y `scripts/schema.py`, y `validateDeck`
  (`src/lib/deck-rules.ts`) ya tiene las reglas `carta-prohibida` y
  `carta-restringida`. Hoy no disparan porque todas las cartas son `libre`.
  Falta cargar los datos, decidir qué limita `restringida` y mostrarlo en el
  catálogo y el constructor.
- **Terminado cuando:** el catálogo muestra el texto erratado, el validador
  rechaza o limita las cartas de la banlist y hay tests contra el catálogo
  real que lo comprueban.

## Publicar la Fe de Erratas y la Banlist en DeckForge

- **Qué:** que se puedan **ver** desde la web y **descargar**.
- **Por dónde:** `/erratas` es hoy un placeholder
  (`src/app/(app)/erratas/page.tsx`). Los descargables van en `public/reglas/`
  y se enlazan con `<a href="/reglas/x.pdf" download>`: la CSP lleva
  `object-src 'none'`, así que un PDF **no** se puede incrustar con `<embed>`,
  `<object>` ni `<iframe>` (CLAUDE.md, §6.11). Para verlos en la página, se
  pintan desde los datos como HTML.
- **Terminado cuando:** las dos listas se leen en el sitio, se descargan, y
  `pnpm run audit` pasa.

## Base de datos y cuentas de usuario

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

## Pre-guardado de la baraja en el constructor

- **Qué:** un borrador automático mientras se arma la baraja, a modo de
  salvoconducto: si se sale de `/constructor` sin guardar (otra pestaña, un
  enlace, se cierra el navegador), al volver se recupera.
- **Por qué:** hoy el constructor guarda a mano y lo no guardado se pierde.
- **Por dónde:** el borrador va aparte de las barajas guardadas en
  `localStorage` y se valida con Zod al leerlo, como el resto. Al volver, ofrecer
  retomarlo o descartarlo.
- **Terminado cuando:** salir y volver al constructor no pierde la baraja en
  curso, y guardar o descartar borra el borrador.

## Reimpresiones de otras ediciones

- **Qué:** agregar las reimpresiones de cartas que **ya están** en el catálogo
  pero salieron en ediciones fuera del formato: Atavismo, Karma, las
  Legendarias de Trempulcahue, etc.
- **Por dónde:** el mecanismo ya existe para las cartas sueltas:
  `data-src/extras.json` (`pnpm run data:card <edición> <número>`) y las
  ediciones `parcial` de `src/lib/editions.ts`. Cada reimpresión **comparte
  `identidad`** con su carta, para que el tope de copias las cuente juntas.
  Una edición nueva necesita su prefijo **al final** de `PREFIJOS` en
  `src/lib/deck-code.ts`: reordenar esa tabla rompe los enlaces compartidos.
- **Terminado cuando:** las reimpresiones salen en el catálogo, se pueden
  agregar a una baraja y cuentan como la misma carta.

## Testeador de barajas en `/baraja`

- **Qué:** sacar al azar una **mano inicial de 8 cartas** del principal, para
  ver qué puede salir.
- **Reglas:** el **oro inicial no entra** en el mazo que se baraja. Un botón de
  **mulligan** vuelve a barajar y saca **una carta menos** cada vez (8, 7, 6…),
  y otro vuelve a empezar desde 8.
- **Por dónde:** barajado Fisher–Yates sobre las copias del principal. La
  lógica pura va en `src/lib/` con su test; la isla interactiva, lo más abajo
  posible en la página.
- **Terminado cuando:** desde `/baraja` se roba una mano, se hacen mulligans y
  la mano nunca incluye el oro inicial.

## Distinguir los tres tipos de Oro

- **Qué:** que el catálogo y el constructor distingan los Oros **sin
  habilidad**, los **iniciales** y los **con habilidad**. Hoy son todos "Oro".
- **Ya existe:** `esOroInicial()` en `src/lib/card-order.ts` (reconoce la carta
  a arte completo de cada edición por su nombre, "Oro Inicial <edición>") y el
  criterio `oroSinHabilidad` de `src/lib/deck-rules.ts`
  (`tipo === "Oro" && habilidad === ""`).
- **Ojo con el nombre:** para las reglas, *el oro inicial de una baraja* es
  cualquier Oro sin habilidad que se aparta antes de empezar, no solo las
  cartas "Oro Inicial <edición>". La interfaz no puede mezclar los dos
  significados.
- **Terminado cuando:** se puede filtrar por cada tipo de Oro y se ven
  distintos en la grilla y en el panel de la baraja.

## Oros iniciales por raza

- **Qué:** agregar los oros iniciales de raza que salieron en ediciones
  posteriores.
- **Ojo:** `esOroInicial()` los reconoce por el nombre "Oro Inicial
  <edición>". Si estos se llaman distinto, hay que cambiar el criterio (por
  ejemplo, un campo en el esquema, en `types.ts` y `schema.py` a la vez) y no
  forzar el nombre.
- **Terminado cuando:** están en el catálogo, se ordenan en el tramo de Oros
  como oros iniciales y sirven de oro inicial en el constructor.

## Recortar el arte de la extensión de Escuelas Elementales

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

## Revisar la resolución de las imágenes de las cartas

- **Qué:** que todas las cartas se vean con buena resolución. Hay que hacer
  una revisión edición por edición; **Escuelas Elementales se ve excelente** y
  sirve de referencia de lo que se busca.
- **Lo que ya se sabe:** todas las WebP salen a **420 px** de ancho y las
  miniaturas a **200 px** (`resize_to_width()`), pero el original de cada
  edición no es igual. La API entrega 512×732 casi siempre; las Legendarias de
  Axis Mundi, 709×1016; Legado Gótico, 419×600; y las seis Legendarias de
  Dominio, 354×508 (esas, ampliadas: es el issue abierto del arte a baja
  resolución). A mismo tamaño en pantalla, lo que cambia es cuánto detalle
  traía el original y cuánto se perdió al comprimir.
- **Por dónde:** una plancha por edición con la misma carta a tamaño real y
  ampliada, comparada contra Escuelas Elementales. Mirar también la calidad de
  compresión de `scripts/convert_images.py` y si conviene servir más de 420 px
  donde el original lo permite.
- **Terminado cuando:** ninguna edición se ve claramente peor que Escuelas
  Elementales, o la diferencia está explicada (un original que no existe a más
  resolución).

## Cartas borrosas en la grilla del catálogo

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

## Preguntas frecuentes y ayuda de uso

- **Qué:** una sección de preguntas frecuentes sobre cómo usar la web: cómo
  guardar una baraja y dónde queda, cómo compartirla, cómo exportarla e
  importarla, cómo se usa el constructor (oro inicial, side deck, por qué una
  carta no se puede agregar), qué muestra cada vista y cosas así.
- **Dónde, a decidir:** un botón flotante abajo a la derecha que abre un
  panel, un enlace en la navbar o un botón de información. Van juntos con el
  botón de volver arriba (entrada siguiente): conviene decidir los dos a la
  vez para que no se pisen.
- **Ojo:**
  - Nada de widgets de terceros: la CSP solo deja cargar del propio origen.
    El contenido va en el sitio, como texto.
  - Si es un panel, es un diálogo con el patrón completo: foco atrapado,
    `Esc` para cerrar y el foco de vuelta al botón que lo abrió (DESIGN.md,
    accesibilidad).
  - Hay respuestas que ya existen y conviene no contradecir: las barajas
    viven en el navegador y no en un servidor, el enlace compartido no pasa
    por el servidor, y una baraja se arma por raza, por escuela o por
    atributo.
- **Terminado cuando:** un usuario nuevo puede resolver las dudas básicas
  (guardar, compartir, armar) sin salir del sitio.

## Avisar que los enlaces viejos de `/mazo/` ya no abren

- **Qué pasa:** los enlaces que se compartieron antes de cambiar "mazo" por
  "baraja" apuntan a `/mazo/?d=…` y hoy dan 404. Por decisión del proyecto
  **no se redirigen**: se le explica al usuario cómo sacar uno nuevo.
- **Qué decirle** (en la sección de preguntas frecuentes o en novedades):
  - Si la baraja está guardada en su navegador: abrirla en **Mis barajas** y
    volver a copiar el enlace. El nuevo ya es `/baraja/#d=…`.
  - Si solo tiene el enlace viejo: cambiar `/mazo/` por `/baraja/` en la
    dirección. El código sigue siendo válido (el formato no cambió), la
    baraja se abre y desde ahí se puede guardar o volver a compartir.
- **Terminado cuando:** esa explicación está en el sitio, donde el usuario
  la encuentre.

## Botón para volver arriba

- **Qué:** un botón pequeño abajo a la derecha que sube de una vez al
  principio de la vista. Se agradece sobre todo en el catálogo, que es largo.
- **Dónde:** junto al de preguntas frecuentes si ese queda también abajo a la
  derecha (entrada anterior).
- **Ojo:**
  - **En el móvil, el constructor ya ocupa el borde inferior**: la barra
    fija que abre la hoja de la baraja (`DeckSheet.tsx`, `bottom-0`) y el
    aviso de rechazos (`BuilderView.tsx`, `bottom-20`). El botón tiene que
    quedar por encima de esos o no mostrarse ahí.
  - Aparecer solo después de bajar un trecho, no en lo alto de la página.
  - El desplazamiento suave tiene que respetar `prefers-reduced-motion`
    (DESIGN.md, movimiento): con esa preferencia, el salto es instantáneo.
  - Objetivo táctil de 44×44 px aunque el botón se vea más chico, y
    `aria-label`.
- **Terminado cuando:** en el catálogo, el constructor y las barajas se puede
  volver arriba con un toque, sin tapar nada en el móvil.

## Sección de novedades para el usuario

- **Qué:** una página o sección con los cambios importantes del sitio y su
  fecha, escrita para quien juega y no para quien programa: "se puede armar
  una baraja Luz u Oscuridad", no "deckStats filtra por tipo". Solo lo que le
  cambia algo al usuario.
- **Fechas:** las da el historial de git (fecha del commit, que es cuando se
  hizo, no necesariamente cuando se publicó). Un borrador sacado de ahí:
  - **28 de agosto de 2026:** abre DeckForge con el catálogo de cartas, el
    buscador, los filtros y el tema claro u oscuro.
  - **29 de agosto:** llega el constructor de barajas: se arman, se guardan
    en el navegador y se comparten por enlace.
  - **14 al 16 de septiembre:** se completan las diez ediciones del formato.
    Con Steampunk llegan las barajas **Luz y Oscuridad**, una tercera forma de
    armar además de raza y escuela. Las barajas ganan side deck, portada y
    nota.
  - **19 de septiembre:** revisión completa del catálogo contra el arte de
    las cartas, y la extensión de Escuelas Elementales.
  - **26 de septiembre:** "mazo" pasa a llamarse "baraja", los enlaces para
    compartir miden la mitad, y al pegar uno en WhatsApp o Discord sale el
    logotipo.
- **Por dónde:** un archivo de datos con las entradas (fecha, título, texto
  corto) y una página que lo pinte. Decidir si va en la navbar o dentro de la
  sección de ayuda. Al agregar algo importante al sitio, se suma una entrada
  en el mismo commit.
- **Terminado cuando:** el usuario puede ver qué cambió y cuándo, sin
  lenguaje técnico.

## Curva de coste en el constructor

Del roadmap original, Fase 2 (`docs/plan.md`): nunca se hizo, aunque el README
la prometía (ya no).

- **Qué:** cuántas cartas del principal hay de cada coste, a la vista mientras
  se arma la baraja.
- **Por dónde:** `deckStats` en `src/lib/deck-rules.ts` ya recorre el
  principal para contar por tipo; la curva es otro contador ahí, con su test.
  Solo el principal, como los contadores por tipo: el side no se juega de
  salida. Los Oros no tienen coste (`coste: null`) y van aparte.
- **Terminado cuando:** el panel del constructor muestra la curva y se
  actualiza al agregar o quitar cartas.

## Exportar la baraja como imagen

Del roadmap, Fase 3 (`docs/plan.md`).

- **Por qué:** para compartir la baraja en redes sociales, donde un enlace dice
  menos que una imagen.
- **Ojo:** sin servidor y sin dependencias nuevas si se puede (canvas del
  navegador), y respetando la CSP: nada de recursos externos.
- **Terminado cuando:** desde `/baraja` se puede descargar una imagen de la
  baraja.
