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
| `surface` | `#15121F` | bloques y barras sobre el fondo |
| `panel` | `#1B1730` | tarjetas, modales, panel de baraja |
| `line` | `#2A2342` | bordes y separadores |

Jerarquía de profundidad: `bg → surface → panel`. Tres niveles bastan; no
inventes un cuarto.

### Texto

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#EDE9F7` | texto principal |
| `muted` | `#9A93B5` | secundario, metadatos, placeholders |

### Estados

Dicen **qué pasó**, no son la marca: van solo en detalles (el icono y el filete
izquierdo de un aviso), nunca de fondo. Cada uno lleva además su icono, así que
el color no es el único indicador.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `success` | `#34D399` | `#047857` | se creó, guardó, importó o duplicó algo |
| `danger` | `#F87171` | `#B91C1C` | se borró o se vació algo |
| `warning` | `#FBBF24` | `#B45309` | algo no se pudo hacer, y el aviso dice por qué |
| `accent` | (el de la marca) | | informativo: enlace copiado, archivo exportado |

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
| Display | `clamp(34px, 6vw, 58px)` | 700 | `tracking-[-0.02em]`, `leading-none` |
| Título de sección | 24–28 px | 600 | `tracking-[-0.01em]` |
| Eyebrow | 13 px | 500 | mayúsculas, `tracking-[0.28em]`, `brand-300` |
| Label | 12 px | 500 | mayúsculas, `tracking-[0.22em]`, `muted` |
| Cuerpo | 15–17 px | 400 | `leading-relaxed`, máx. **54 caracteres** por línea |
| Metadato | 13 px | 400 | `muted`, cifras con `tabular-nums` |

- Cifras en tablas y contadores: siempre `tabular-nums`, para que no bailen.
- Una sola familia en todo el sitio. No se agrega una segunda tipografía.

---

## 4. Layout

- Contenedor de contenido: `max-w-[1040px]` (el de la guía de marca).
  La grilla del catálogo puede ir hasta `max-w-[1280px]`.
- Espaciado en múltiplos de 4; los saltos entre secciones son grandes (48–64 px).
- Mobile-first: la grilla arranca en 2 columnas y crece; el panel de baraja pasa
  a hoja inferior en pantallas chicas.
- Breakpoints los de Tailwind por defecto. El punto crítico de la marca es
  **720 px** (donde las rejillas de dos columnas colapsan a una).

---

## 5. Movimiento

- Duraciones 150–250 ms; easing `--ease-out-soft`.
- Hover en carta: elevación sutil + borde que pasa a `brand-500`. Sin escalar
  más de 1.02.
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

## 6. Uso del logo

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

## 7. Accesibilidad

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
  regla, no cumplirla.
- **Teclado**: todo se puede usar sin mouse. Los modales atrapan el foco, se
  cierran con `Esc` y devuelven el foco al elemento que los abrió.
- **Imágenes**: `alt` con el nombre de la carta (`alt="Carta: {nombre}"`), no
  "imagen" ni vacío. Las decorativas van con `alt=""`.
- **HTML semántico**: `<button>` para acciones, `<a>` para navegar, encabezados
  en orden. Nada de `<div onClick>`.
- **Controles propios = patrón ARIA completo.** El `<select>` nativo no se puede
  estilizar (el navegador dibuja la lista con colores del sistema), así que
  `Select` es un listbox propio. Reemplazarlo obliga a devolver lo que el nativo
  daba gratis: rol anunciado, flechas, Inicio/Fin, Enter, Escape, cierre al
  hacer clic fuera y foco visible. Si no puedes sostener eso, usa el nativo.
- **Zoom** hasta 200% sin romper el layout ni perder contenido.

---

## 8. Escribir en la interfaz

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
