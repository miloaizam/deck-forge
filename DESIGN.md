# DESIGN.md — cómo se ve DeckForge

Convenciones de diseño. Los valores salen de la guía de marca
([`docs/brand.html`](docs/brand.html), ábrela en el navegador) y están
implementados como tokens en [`src/app/globals.css`](src/app/globals.css).
Para lo técnico, ver [CLAUDE.md](CLAUDE.md).

---

## 1. Los tres principios

**Intuitivo.** El usuario llega a hacer una cosa: encontrar cartas y armar un
baraja. Esa acción está siempre a la vista.

- La búsqueda y los filtros nunca se esconden detrás de un menú.
- Cero navegación anidada: como máximo un nivel.
- Estado siempre visible: cuántas cartas lleva la baraja, qué filtro está activo,
  cuántos resultados hay. Nada de que el usuario adivine.
- Toda acción da respuesta inmediata (<100 ms percibidos). Si algo tarda, se
  muestra un esqueleto de carga, no un spinner sobre pantalla vacía.
- Vacío ≠ error: "no hay cartas con esos filtros" viene con un botón para
  limpiarlos.

**Moderno.** Dark-first, limpio, con aire.

- Fondo oscuro profundo, superficies apenas más claras, bordes de 1 px.
- Radios generosos (14–22 px) y espaciado holgado.
- Micro-transiciones de 150–250 ms; nada rebota ni gira.
- Tipografía geométrica con tracking negativo en los títulos.

**Llamativo.** El violeta es acento, no relleno.

- Un solo punto de color por vista: el elemento más importante de la pantalla.
- El brillo violeta (`shadow-glow`) se reserva para lo destacado —el logo, el
  botón principal, la carta seleccionada—. Si todo brilla, nada destaca.
- El gradiente de wordmark es para el nombre de marca y títulos de portada.
  No para texto corrido.

---

## 2. Tokens

Todos disponibles como utilidades de Tailwind. **Nunca escribas un hex en un
componente.**

### Violeta de marca

| Token | Hex | Uso |
|---|---|---|
| `brand-200` | `#C4B5FD` | detalles muy claros sobre violeta |
| `brand-300` | `#A78BFA` | acentos de texto, eyebrows, iconos activos |
| `brand-500` | `#8B5CF6` | anillo de foco, hover, bordes activos |
| **`brand-600`** | **`#7C3AED`** | **primario**: botón principal, estado activo |
| `brand-700` | `#6D28D9` | pressed, selección de texto |
| `brand-800` | `#5B21B6` | fondos violeta profundos |

### Superficies (modo oscuro, el modo por defecto)

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0D0B14` | fondo de página |
| `surface` | `#15121F` | lo que flota sobre la página (modales, hoja, ayuda) y el panel de filtros |
| `panel` | `#1B1730` | tarjetas, paneles en la página, popovers, campos |
| `line` | `#2A2342` | bordes y separadores |

Jerarquía de profundidad: `bg → surface → panel`. Tres niveles bastan; no
inventes un cuarto. Un contenedor que lleva **campos** dentro va un nivel por
debajo de ellos, para que contrasten: por eso el panel de filtros es `surface`
y sus selectores `panel`, y en el panel del constructor el nombre de la
baraja va en `surface`.

### Texto

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#EDE9F7` | texto principal |
| `muted` | `#9A93B5` | secundario, metadatos, placeholders |

### Estados

Dicen **qué pasó**, no son la marca: van en detalles (el icono y el filete
izquierdo de un aviso, el anillo de un botón que borra) y, como mucho, en un
**tinte** del 5 al 15 % detrás de su propio texto (la caja del estado de una
baraja, la pastilla «Legal»). Nunca de relleno lleno salvo en el botón que
confirma algo destructivo, al apuntarlo. Cada uno lleva además su icono, así
que el color no es el único indicador.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `success` | `#34D399` | `#047857` | se creó, guardó, importó o duplicó algo |
| `danger` | `#F87171` | `#B91C1C` | se borró o se vació algo |
| `warning` | `#FBBF24` | `#92400E` | algo no se pudo hacer, y el aviso dice por qué |
| `accent` | (el de la marca) | | informativo: enlace copiado, archivo exportado |

### Al pasar el cursor

Todo lo que se puede pulsar y tiene contorno —botones, filtros, selectores,
tarjetas, filas, cartas— responde igual: **un anillo `brand-500` de 2 px,
separado 2 px del borde**, el mismo del foco del teclado. El borde no cambia.
Lo que borra o vacía lleva el anillo en `danger`, y lo que descarta algo menos
grave, en `warning`. Las cartas además suben un poco. Un elemento sin contorno
(un enlace de la navbar, un texto) solo aclara su color. Las clases viven en
`src/lib/ui.ts` (`ANILLO` y los botones de la sección 6).

El `warning` claro era `#B45309` (amber-700) y bajó a `#92400E` (amber-800):
axe-core lo midió en 4.1–4.3:1 sobre sus propios tintes, bajo el 4.5:1 de AA.

### Tema claro

La app es **dark-first**, pero tiene tema claro conmutable desde la navbar. Se
activa con `data-theme="light"` en `<html>` y **solo redefine tokens**: ningún
componente sabe en qué tema está.

| Token | Oscuro | Claro |
|---|---|---|
| `bg` | `#0D0B14` | `#F5F3FB` |
| `surface` / `panel` | `#15121F` / `#1B1730` | `#FFFFFF` |
| `line` | `#2A2342` | `#E3DEF2` |
| `ink` | `#EDE9F7` | `#1B1730` |
| `muted` | `#9A93B5` | `#5F5880` |
| `accent` | `#A78BFA` | `#6D28D9` |
| `accent-soft` | `#241B45` | `#EDE9FE` |

**Nunca uses un `brand-*` directo para texto o fondo de acento**: usa `accent` y
`accent-soft`. `brand-300` sobre fondo claro da 2.47:1 y es ilegible. Los
`brand-*` sí sirven donde el color no cambia con el tema (botón primario
`brand-600` con texto blanco, anillo de foco `brand-500`).

Desviación consciente de la guía de marca: su gris `#8A82A6` solo alcanza
3.28:1 sobre el fondo claro, así que el secundario en tema claro es `#5F5880`
(5.98:1). Todas las combinaciones de ambos temas están verificadas en AA.

El tema se guarda en `localStorage` y un script inline lo aplica antes del
primer pintado, para que la página no parpadee.

**Los assets de marca también cambian de tema.** `logo-white.svg` e
`icon-white.svg` son invisibles sobre el fondo claro: cada tema monta su
versión y el CSS elige cuál se muestra (`.solo-oscuro` / `.solo-claro`), sin
estado de React. Lo mismo vale para cualquier SVG monocromo que se agregue.

El token `halo` es el resplandor decorado de la portada. En oscuro es violeta
profundo; en claro, violeta suave: reusar el mismo color se lee como una
mancha lavada, no como profundidad.

### Radios

`rounded-chip` 11px · `rounded-card` 14px · `rounded-panel` 18px ·
`rounded-tile` 22px · `rounded-app` 28px.

Regla: a mayor superficie, mayor radio. Un chip y un modal no comparten radio.

### Elevación

- `shadow-glow` — `0 18px 40px -18px rgb(124 58 237 / .6)`. Violeta que se
  filtra por debajo. Solo para lo destacado.
- `shadow-halo` — `0 0 18px -6px rgb(124 58 237 / .55)`. Brillo parejo y
  corto, sin caer hacia abajo: para destacar un bloque dentro de una lista
  (la última novedad), donde `shadow-glow` se montaba sobre el siguiente.
- `shadow-panel` — sombra neutra suave para modales y menús flotantes.

Nada de sombras negras duras: la profundidad viene del contraste entre
superficies, no de la sombra.

### Gradientes

- `bg-forge` → `radial-gradient(120% 120% at 30% 20%, #1d1633, #0c0a13)`.
  El fondo de "forja". Para tiles, portadas de carta y el marco del isotipo.
- `text-wordmark` → `linear-gradient(92deg, #A78BFA, #7C3AED)` recortado al
  texto. Solo para el nombre de marca y títulos de portada.

---

## 3. Tipografía

**Space Grotesk** (SIL OFL), pesos 400 / 500 / 600 / 700. Auto-hospedada por
`next/font` — no se carga nada desde Google en producción.

| Rol | Tamaño | Peso | Detalle |
|---|---|---|---|
| Display (portada) | `clamp(2.75rem, 8vw, 4.5rem)` | 700 | `tracking-[-0.02em]`, `leading-none` |
| Título de página (`h1`) | 30 px (`text-3xl`) | 700 | `tracking-[-0.02em]` |
| Título de panel o modal | 20 px (`text-xl`) | 600 | `tracking-[-0.01em]` |
| Rótulo de sección | 14 px | 700 | mayúsculas, `tracking-[0.1em]` (curva, mano, tipos del panel) |
| Eyebrow | 13 px | 400 | mayúsculas, `tracking-[0.28em]`, `accent` (utilidad `eyebrow`) |
| Label | 11 px | 400 | mayúsculas, `tracking-[0.18em]`, `muted` (sobre un dato o un campo) |
| Botón | 13 px | 400 / 500 | 500 en el principal |
| Cuerpo | 15–17 px | 400 | `leading-relaxed`, máx. **54 caracteres** por línea |
| Metadato | 13 px | 400 | `muted`, cifras con `tabular-nums` |

- Cifras en tablas y contadores: siempre `tabular-nums`, para que no bailen.
- Una sola familia en todo el sitio. No se agrega una segunda tipografía.

---

## 4. Layout

- Contenedor: **un solo `<main>` de `max-w-[1480px]`** en todas las páginas,
  con `px-4 sm:px-6` (y el esqueleto de carga, igual). La guía de marca
  hablaba de 1040, pero la grilla de cartas y el constructor con su panel
  necesitan el ancho; el texto corrido se acota por su cuenta (`max-w-[54ch]`,
  la línea de tiempo a 760 px).
- Espaciado en múltiplos de 4; los saltos entre secciones son grandes (48–64 px).
- Mobile-first: la grilla arranca en 2 columnas y crece; el panel de baraja pasa
  a hoja inferior en pantallas chicas.
- Breakpoints los de Tailwind por defecto. El punto crítico de la marca es
  **720 px** (donde las rejillas de dos columnas colapsan a una).

---

## 5. Movimiento

- Duraciones 150–250 ms; easing `--ease-out-soft`.
- Hover en carta: sube 4 px y la rodea el anillo `brand-500` (no cambia el
  borde). Nada escala.
- Las transiciones de color usan las de Tailwind (`transition-colors`, 150
  ms); lo que se mueve usa `--ease-out-soft` y 200–220 ms. Fuera de rango, a
  propósito: el barrido de una imagen que carga (1,4 s, en bucle), las barras
  de la curva de coste (700 ms, escalonadas) y la barra de progreso de la
  baraja (300 ms).
- Cambios de filtro: transición de opacidad, no reordenamientos animados.
- **Lo que aparece y desaparece se anima, sin nada que rebote ni gire.** Las
  clases viven en `globals.css` ("Aparecer y desaparecer"):

  | Elemento | Clase | Al abrir | Al cerrar |
  |---|---|---|---|
  | Detalle de una carta | `panel-anim panel-sube` | fundido y sube 16 px | fundido |
  | Confirmación | `panel-anim panel-crece` | fundido y crece desde 0,96 | fundido |
  | Panel de ayuda | `panel-anim panel-derecha` | entra desde la derecha | sale por la derecha |
  | Hoja de la baraja (teléfono) | `panel-anim panel-abajo` | sube desde abajo | baja |
  | Fondo oscuro de los cuatro | (el `::backdrop` de `panel-anim`) | se oscurece | se aclara |
  | Menú de la navbar (teléfono) | filas de grilla `0fr` → `1fr` | se despliega | se pliega |
  | Panel de filtros | `pliegue` + `abierto` | se despliega y empuja la grilla | se pliega |
  | Desplegables de filtros | `despliegue` + `hidden` | fundido y baja 6 px | fundido |
  | Preguntas de la ayuda | `desplegable` | la respuesta se abre | se cierra |
  | Avisos flotantes | `aviso` / `aviso-saliendo` | fundido y baja 6 px | fundido, y los de abajo suben |
  | Panel y hoja de la baraja | `AutoHeight` (componente) | crece al agregar | se encoge al quitar |
  | Fila nueva del panel | `fila-entra` | fundido desde la izquierda | — |
  | Cartas de las grillas (catálogo, edición, constructor), cartas del detalle de una baraja, barajas de Mis barajas, novedades, mano de prueba | `aparece` | fundido y sube 4 px | — |
  | Barras de la curva de coste | `scale` con retraso por columna | crecen desde abajo, una tras otra, al entrar en pantalla | — |
  | Imagen de carta que baja | `imagen-carga` | su hueco late hasta que llega | — |

  La entrada dura algo más que la salida (220 contra 160 ms en los modales):
  cerrar es algo que ya se decidió. Los paneles que se deslizan no se
  desvanecen, porque un panel a medio transparentar mientras se mueve se ve
  sucio. Todo es CSS (`@starting-style` y `transition-behavior:
  allow-discrete`); un navegador que no lo entienda abre y cierra de golpe.
- **Un cambio de alto se anima, no salta.** `height: auto` no tiene
  transición en CSS, así que `AutoHeight` mide el contenido con un
  ResizeObserver y pone el alto en píxeles. El panel de filtros, que tiene
  desplegables que se salen de él, recorta solo mientras se abre.
- **Un elemento que se anima al cerrar tiene que seguir montado mientras
  sale.** Por eso los desplegables se ocultan con `hidden` en vez de
  desmontarse, y `CardModal` y `ConfirmDialog` siguen pintando la última
  carta y el último texto mientras se desvanecen.
- **Se respeta `prefers-reduced-motion`** — ya está implementado en
  `globals.css`; no lo anules.

---

## 6. Componentes

Cada pieza que se repite tiene **una** versión, con sus clases en
[`src/lib/ui.ts`](src/lib/ui.ts). Un componente nuevo usa esas constantes; si
ninguna sirve, se agrega una aquí antes de escribir clases sueltas. La
revisión del 16-10-2026 encontró, entre otras cosas, ocho versiones del botón
violeta, tres alturas de secundario y cuatro estilos de deshabilitado; la
galería con el antes y el después vive en el artifact «Sistema de diseño
DeckForge».

### Botones

Reglas comunes a todos:

- **Texto de 13 px**; peso 500 en el principal. Icono de **14** en los botones
  con texto y de **16** en los de solo icono (14 en los compactos).
- **Alto de 44 px** (`h-11` / `size-11`). Donde no cabe —una tarjeta, una fila,
  un aviso— va la versión **compacta**: la caja se ve de 36 y `AREA_TACTIL` (un
  `::after` 4 px más grande por lado) lleva lo que se pulsa a 44.
- **Hover**: el `ANILLO` violeta, que es el mismo del foco del teclado. El
  borde no cambia y nada se rellena de gris.
- **Deshabilitado** (`disabled`): opacidad 40 y sin eventos.
  **Bloqueado** (`aria-disabled`, que al pulsarse explica por qué en un aviso):
  `BLOQUEADO`, gris al 40 % con el cursor de prohibido.
- **Foco**: anillo `brand-500` en todos, también en los rellenos de violeta.

| Variante | Constante | Aspecto | Para qué | Ejemplos |
|---|---|---|---|---|
| Principal | `BOTON_PRIMARIO` | violeta lleno, texto blanco; al apuntar, violeta más claro y anillo | la acción principal de una vista: una por vista | Guardar baraja, Armar una baraja, Agregar a la baraja, Robar mano, Leer en el sitio |
| Secundario | `BOTON_SECUNDARIO` | contorno `line`, texto `muted` que se aclara | todo lo demás | Editar, Exportar, Importar, Mulligan, Quitar una copia, Filtros, Limpiar filtros, Ver más, Cancelar |
| Suave | `BOTON_SUAVE` | `accent-soft` con borde violeta; se llena al apuntar | una acción destacada que no es la principal | Usar este arte en la baraja |
| Icono | `BOTON_ICONO` | cuadrado de 44 con contorno | acciones sin texto de una vista | imagen, enlace, exportar, duplicar y borrar en el detalle; menú; vaciar colección |
| Icono libre | `BOTON_ICONO_LIBRE` | sin contorno, solo el icono | cerrar y conmutadores que no deben pesar | cerrar un modal, la hoja o la ayuda; tema; ayuda; ordenar |
| Compactos | `BOTON_PRIMARIO_COMPACTO`, `BOTON_SECUNDARIO_COMPACTO`, `BOTON_ICONO_COMPACTO`, `BOTON_ICONO_LIBRE_COMPACTO` | igual, de 36 visibles | dentro de tarjetas, filas y avisos | acciones de una tarjeta de Mis barajas, Tengo / Ya la tengo, Recuperar / Descartar, − y + de la colección, cerrar un aviso, limpiar un filtro |
| Peligro | `HOVER_PELIGRO` (se suma) | anillo y texto rojos al apuntar | lo que borra o vacía sin vuelta | Borrar la baraja, Vaciar la baraja, Vaciar la colección |
| Aviso | `HOVER_AVISO` (se suma) | anillo y texto ámbar al apuntar | lo que descarta algo menos grave | Descartar el borrador |
| Confirmar | `BOTON_CONFIRMAR[tono]` (se suma al secundario) | tinte rojo o ámbar que se llena al apuntar; violeta lleno (`normal`) si no se pierde nada | el botón que confirma en un modal | Vaciar la baraja, Borrar, Guardar igual, Compartir las 3 |
| Enlace | `ENLACE` | texto `accent` subrayado; se atenúa al apuntar | una salida dentro de un texto o un estado vacío | Limpiar los filtros, Ver mis barajas, Ver mi colección |
| Portada | `PRIMARY_BUTTON`, `SECONDARY_BUTTON` | 56 de alto, 17 px, brillo y ascenso | la única salida de una pantalla suelta | Entrar a la forja, Reintentar, Volver al inicio |

Un botón de icono **siempre** lleva `aria-label` y `title`. Un botón con texto
visible **no** lleva `aria-label`: su nombre accesible tiene que contener lo
que se ve (WCAG 2.5.3); lo que le falta a un lector de pantalla se agrega con
un `<span className="sr-only">`, como «Ver detalle de» delante del nombre de
una carta.

### Controles de fila y de carta

| Control | Dónde | Cómo es |
|---|---|---|
| `−` / `+` de la baraja | filas del panel del constructor | `BOTON_FILA` de 44 transparente con un círculo `CAJA_FILA` de 28 que se pinta al apuntar: anillo, y el `+` además se llena de violeta (`QuantityStepper.tsx`) |
| Moneda del oro inicial | filas de Oros del panel | la misma caja, pero con su círculo **siempre** visible; activa, rellena de `accent-soft` |
| `−` / `+` de la colección | filas de Tengo y Me faltan | `BOTON_ICONO_LIBRE_COMPACTO` |
| Corazón «me falta» | filas de Agregar cartas | `BOTON_ICONO_LIBRE_COMPACTO`; marcado en `accent` (no en rojo: el rojo es para lo que se borra) |
| Estrella de portada | cartas de `/baraja` | 28 visibles y 44 de área (`after:-inset-2`); en reposo oculta salvo en pantallas táctiles |
| Pie de la carta (`− n +`) | catálogo del constructor | **excepción**: sin anillo, porque es parte de la carta (que ya lo lleva) y el `overflow-hidden` lo cortaría; el `+` se llena de violeta y el foco va hacia adentro |

### Segmentos y pestañas

`SEGMENTOS` (la cinta, `bg-panel`, `role="group"`) y `SEGMENTO` con
`SEGMENTO_ACTIVO` / `SEGMENTO_INACTIVO` (cada opción, `aria-pressed`). La
activa va en violeta lleno con su contador al 90 % de blanco. El anillo va
**hacia adentro**, porque la cinta puede scrollear y su `overflow` cortaría uno
hacia afuera. Son dos: «Agregar a: Baraja / Side deck» y «Tengo / Me faltan /
Agregar cartas».

### Campos

`TEXT_FIELD` (44 de alto, `bg-panel`, borde `line`) para el buscador y los
buscadores de los selectores; `DECK_NAME_FIELD` y `DECK_NOTE_FIELD` para el
nombre (48, 15 px) y la nota de la baraja. El `Select` propio usa la misma
caja: activo, borde `brand-600` y fondo `accent-soft`; su `X` de limpiar es un
`BOTON_ICONO_LIBRE_COMPACTO`. La única excepción es el salto de página, que es
un campo subrayado.

### Pastillas y contadores

- `PASTILLA` — etiqueta de texto de 12 px: el estado de una baraja (Legal,
  Incompleta, Con baneada, con el tinte de su estado), el tipo de una novedad,
  el tipo, la raza y la escuela en el detalle de una carta.
- `CONTADOR` — un número blanco sobre violeta, redondo de 20: filtros puestos,
  cartas de cada tipo en el panel, erratas y baneadas por sección.

### Contenedores

| Pieza | Clases | Uso |
|---|---|---|
| Panel | `bg-panel rounded-panel border border-line` + `p-5 sm:p-6` | tarjetas de análisis, tarjetas de documento, panel del constructor |
| Tarjeta | `bg-panel rounded-card border border-line` + `p-4 sm:p-5` | novedades, fichas de errata, ítems de la Banlist, filas de la colección |
| Tarjeta de baraja | `rounded-panel`, sube 2 px y anillo al apuntar | Mis barajas: toda la tarjeta es un enlace |
| Aviso en línea | `AVISO_EN_LINEA` | algo que espera una decisión: el borrador, la colección compartida |
| Estado de la baraja | `DeckIssues` | caja, barra, título y lista del mismo tono |
| Aviso flotante | `Toaster` | `bg-panel/95`, filete izquierdo del tono e icono; se va solo |
| Vacío | `VACIO` | caja punteada, título `ink`, salida con `ENLACE` |
| Modal | `<dialog>` `bg-surface rounded-panel shadow-panel` | detalle de carta, confirmar, ayuda (lateral), hoja de la baraja (abajo) |
| Popover | `bg-panel rounded-card shadow-panel` | lista de un `Select` |

### Cartas, vista por vista

La carta se muestra distinto según lo que se hace con ella. Lo que **no**
cambia: la proporción (`CARD_RATIO`, 512 × 732), el borde `line` de 1 px y el
barrido `imagen-carga` mientras baja.

| Vista | Tamaño | Radio | Al apuntar | Encima | Por qué |
|---|---|---|---|---|---|
| Catálogo y constructor (`CardTile`) | hasta 200 px, grilla | `card` | `CONTORNO_CARTA`: anillo y sube 4 px; el nombre pasa a `accent` | lazos Errata / Baneada, pastilla «Oro inicial», pie `− n +` en el constructor | es la vista de elegir: lleva todo lo que decide |
| Mesa de `/baraja` (`DeckSections`) | 10 por fila, copias apiladas | `card`, con `shadow-panel` | `CONTORNO_CARTA_GRUPO`: el anillo rodea la pila entera | moneda del oro inicial, estrella de portada | se lee como un mazo sobre la mesa; la sombra separa las copias |
| Mano de prueba | hasta 88 px | `card` | `CONTORNO_CARTA` | nada | es un vistazo: sin lazos ni insignias |
| Detalle (`CardModal`) | 420 px | `card` | — | lazos grandes, selector de impresiones (56 px, borde violeta en la elegida) | aquí se lee la carta |
| Fila de la colección | 36 px | 4 px (`rounded`) | la fila lleva el anillo | gris y atenuada en «Me faltan» | se recorren cientos: importa el nombre |
| Fila del panel | 28 px | 4 px | el nombre pasa a `accent` | — | la lista de la baraja, no su arte |
| Portada de Mis barajas | 92 × 131 fijo, arriba (nunca se estira con la tarjeta) | 4 px | la tarjeta lleva el anillo | — | identifica la baraja |

Los lazos solo van donde la carta se elige o se lee (grilla y detalle): en la
mesa, la mano y las filas, el estado de la baraja ya avisa de una baneada.

---

## 7. Uso del logo

Archivos en `public/brand/`: `logo-white.svg`, `logo-violet.svg`,
`icon-white.svg`, `icon-violet.svg`.

**Sí**

- Versión blanca sobre fondos oscuros (el caso normal en la app).
- Versión violeta sobre fondos claros o neutros.
- Margen mínimo alrededor ≈ la altura del ícono.
- El isotipo para favicon, avatar y app icon: funciona desde 16 px.

**No**

- Deformarlo ni cambiar la proporción entre ícono y texto.
- Violeta sobre negro puro (contraste insuficiente).
- Reemplazar la tipografía ni recolorear la llama.

---

## 8. Accesibilidad

No es opcional. Una baraja mal etiquetado es una baraja que alguien no puede armar.

- **Contraste** AA mínimo: 4.5:1 en texto normal, 3:1 en texto grande y en
  bordes de controles. `muted` sobre `bg` cumple; no lo uses más apagado.
- **El color nunca es el único indicador.** Legalidad, escuela y atributo
  llevan además texto o ícono.
- **Foco visible** en todo elemento interactivo: anillo `brand-500` de 2 px con
  2 px de offset (ya global en `globals.css`). Nunca `outline: none` sin
  reemplazo.
- **Objetivos táctiles** ≥ 44×44 px. Los botones de +/− cantidad son el punto
  donde esto más se rompe: cuídalos. Ojo con una trampa: el área que se pulsa y
  la caja que se **ve** no tienen por qué medir lo mismo. En las filas de la baraja
  el `<button>` mide 44 y es transparente, y dentro lleva un círculo de 28 que
  solo se pinta al apuntarlo (`BOTON_FILA` y `CAJA_FILA` en
  `QuantityStepper.tsx`). Tres cajas con borde de 44 px por fila pesaban más que
  la carta que acompañan; encoger el botón para arreglarlo sería romper la
  regla, no cumplirla. Los botones **compactos** hacen lo mismo al revés: se
  ven de 36 y un `::after` (`AREA_TACTIL`) estira lo que se pulsa a 44.
- **Teclado**: todo se puede usar sin mouse. Los modales atrapan el foco, se
  cierran con `Esc` y devuelven el foco al elemento que los abrió.
- **Imágenes**: `alt` con el nombre de la carta (`alt="Carta: {nombre}"`), no
  "imagen" ni vacío. Las decorativas van con `alt=""`, y también la de una
  carta **dentro de un botón que ya la nombra** (la grilla, las filas): si no,
  el lector la anuncia dos veces.
- **Nombre accesible = lo que se ve, y algo más.** Un botón con texto no lleva
  `aria-label` que lo reemplace: el nombre tiene que contener el texto visible
  (WCAG 2.5.3, «label in name»), o quien maneja la página por voz no puede
  nombrarlo. Lo que falta para un lector de pantalla va en `sr-only`.
- **HTML semántico**: `<button>` para acciones, `<a>` para navegar, encabezados
  en orden. Nada de `<div onClick>`.
- **Controles propios = patrón ARIA completo.** El `<select>` nativo no se puede
  estilizar (el navegador dibuja la lista con colores del sistema), así que
  `Select` es un listbox propio. Reemplazarlo obliga a devolver lo que el nativo
  daba gratis: rol anunciado, flechas, Inicio/Fin, Enter, Escape, cierre al
  hacer clic fuera y foco visible. Si no puedes sostener eso, usa el nativo.
- **Zoom** hasta 200% sin romper el layout ni perder contenido.
- **Cómo se revisa**: `pnpm run a11y` (tras `pnpm run build`) pasa
  [axe-core](https://github.com/dequelabs/axe-core) por todas las páginas, en
  los dos temas, en escritorio y teléfono, con los modales abiertos, y falla
  con cualquier violación seria o crítica de WCAG 2.2 AA. La primera pasada
  (16-10-2026) encontró nombres accesibles que no contenían el texto visible y
  tres contrastes bajo 4.5:1 (el blanco al 75–80 % sobre violeta y el ámbar
  del tema claro); se corrigieron todos. axe no ve todo: el foco, el orden del
  teclado y los lectores de pantalla se siguen probando a mano.

---

## 9. Escribir en la interfaz

- Español de Chile, tuteo, directo y breve. "Agregar a la baraja", no
  "Proceder a añadir la carta seleccionada".
- Los términos del juego se respetan tal cual: *Aliado*, *Talismán*, *Tótem*,
  *Frecuencia*, *Mega Real*. No los traduzcas ni los simplifiques.
- Las keywords impresas (*Única*, *Furia*, *Imbloqueable*…) se resaltan en
  `brand-300` dentro del texto de habilidad: son reglas, no prosa, y el jugador
  las busca con la vista. La lista vive en `KEYWORDS_IMPRESAS`
  (`src/lib/types.ts`) y excluye las etiquetas internas de la API.
- Los errores dicen qué pasó y qué hacer: "La baraja ya lleva 3 copias de
  Kirin, el máximo permitido".
- **El sitio informa, no conversa.** Los avisos describen la acción en forma
  impersonal —"Baraja "X" eliminada.", "Cambios guardados correctamente en
  "X".", "No se pudo copiar el enlace."—, nunca en primera persona ("Borré…",
  "No pude…"): no es un chatbot que cuenta lo que hizo.
- Sin signos de exclamación ni emojis en la UI.
