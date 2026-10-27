# Documentos oficiales del formato

Transcripciones de DeckForge de los documentos oficiales del formato Escuelas
Elementales, con el estilo del sitio. Esta carpeta es la **fuente**: los datos y
el generador. Los PDF viven en **`public/reglas/`** y se publican; la página
`/documentos` los enlaza para abrir y descargar, y `/documentos/dar`,
`/documentos/fe-de-erratas` y `/documentos/banlist` (y `/vcr`, `/infanteria`)
los dibujan en HTML con estos mismos datos. El catálogo y el validador de
barajas aplican la Fe de Erratas y la Banlist del formato de cada baraja
(`src/lib/erratas.ts`). Hay **tres formatos** (Estándar, VCR e Infantería):
comparten el DAR y la Fe de Erratas, y cada uno tiene su Banlist.

Los tres siguen **el mismo molde**, en el sitio y en PDF: portada (en el PDF),
índice enlazado, secciones con el mismo título y "Notas de la transcripción"
al final, con lo que se corrigió del original.

| Archivo | Qué es | Original |
|---|---|---|
| `public/reglas/DAR-261023.pdf` | Cómo se juega: 10 secciones y un anexo, 90 reglas con letra, 48 conceptos de juego y las cartas de ejemplo del catálogo. | *Documento Actualizado de Reglas*, revisión de julio de 2021 (62 páginas) |
| `public/reglas/FeDeErratas-261023.pdf` | 63 cartas corregidas: lo que dice la carta impresa y lo que debe decir, con el cambio resaltado. | *Fe de Erratas: Escuelas Elementales*, junio de 2022 (20 páginas) |
| `public/reglas/BanlistEstandar-261023.pdf` | 9 prohibidas, 31 Únicas, y 37 erratas y ajustes. Las cartas en observación siguen en el JSON (se aplican) pero no se publican. | *Banlist Formato Estándar RE MyL*, modificado el 26-11-2025 (5 páginas) |
| `public/reglas/BanlistVCR-261027.pdf` | Solo Vasallos, Cortesanos y Reales: 15 prohibidas, 47 Únicas, 15 Errantes y 13 cartas de fuera del bloque admitidas (9 todavía no están en el catálogo). | *Banlist Formato VCR RE MYL*, una imagen sin fecha |
| `public/reglas/BanlistInfanteria-261027.pdf` | Solo Vasallos y Cortesanos: 8 prohibidas, 40 Únicas y 7 Errantes. | *Banlist Open Formato Infantería Elemental Fights!!!*, una imagen sin fecha |

El sufijo es la fecha de la transcripción (AAMMDD); las Banlists de VCR e
Infantería, que llegaron después, llevan la suya (`VERSION_FORMATOS`). Para
generar solo algunos, se pasa el comienzo del nombre:
`node documentos/fuente/generar.mjs BanlistVCR BanlistInfanteria`. Una versión nueva del
documento oficial es un archivo nuevo, no se pisa el anterior: al cambiarlo,
actualizar `VERSION` en `generar.mjs` y `DOCUMENTOS` en `src/lib/documentos.ts`
(el test comprueba que el PDF exista y tenga las páginas que dice).

## Cómo está hecho

- **`fuente/*.json`** son los datos transcritos, y son la fuente de verdad: los
  PDF se generan a partir de ellos, y el sitio aplica las erratas y la
  Banlist leyéndolos de aquí.
- **`src/lib/documentos.ts`** tiene un esquema de Zod para cada JSON, y
  **`src/lib/documentos.test.ts`** los valida en `pnpm run check` y los cruza
  con el catálogo: cada carta nombrada tiene que existir, o estar en una lista
  que dice por qué no (fuera del formato, falta en el catálogo, o no es una
  carta sino una regla de construcción).
- **`fuente/generar.mjs`** arma el HTML de cada documento y lo imprime a PDF con
  Chromium. Colores del tema oscuro de `src/app/globals.css`, Space Grotesk y
  el logotipo de `public/brand/`. Las cartas de ejemplo del DAR salen de
  `public/data/cards.json` y `public/cards/`.

```bash
node documentos/fuente/generar.mjs
```

Playwright **no** es dependencia del repo: el script lo busca en
`PLAYWRIGHT_PATH` o en la instalación global de Node.

**La tipografía va en cuatro pesos estáticos** (`fuente/fuentes/sg-400…700.woff2`,
~13 KB cada uno), no la variable del sitio. Con la variable, Chromium la
incrusta como Type3 **una vez por hoja**: el DAR pesaba 2 MB y la Fe de Erratas
830 KB. Estática, va como TrueType una sola vez (DAR ~890 KB, Fe de Erratas
~480 KB, Banlist ~165 KB). El pie lleva la de 400 incrustada, porque Chromium
lo dibuja aparte y no ve los `@font-face` de la página. Se sacaron de la
variable que baja `next/font` (subconjunto latino) con fontTools, que no es
dependencia del repo:

```bash
pip install fonttools brotli          # en un venv aparte
fonttools varLib.instancer <space-grotesk>.woff2 wght=400 --static -o sg-400.woff2
```

Space Grotesk es SIL OFL: se puede redistribuir, y el copyright y el enlace a
la licencia van en los metadatos de cada archivo.

Las **cartas del DAR van en JPEG** y achicadas al ancho al que se imprimen:
Chromium guarda tal cual una imagen JPEG, pero descomprime una WebP y la
guarda sin pérdida.

Los PDF van **sin etiquetar** (`tagged: false`): las etiquetas suben el peso
y el límite es 1 MB. El texto se sigue pudiendo seleccionar y buscar, y los
PDF llevan marcadores y un índice enlazado.

Los originales **no se suben**: el de la banlist pesa 6 MB, el del DAR 4,3 MB,
y el pre-commit corta en 1 MB.

## Criterio de la transcripción

- **El texto de las cartas se copia tal cual**, erratas incluidas: el "Donde
  dice" es justamente lo que se corrige. En "Debe decir" tampoco se toca nada,
  aunque traiga cosas como "Una vez turno" (Inti) o "Errante.En" (Grotekop).
- **Se corrige el propio documento**: la ortografía y los nombres de carta,
  según el catálogo. Cada corrección queda anotada en la ficha de su carta
  (Fe de Erratas) o en "Notas de la transcripción" (Banlist).
- Lo que el original traía revuelto o incompleto se completó con el catálogo,
  y está dicho en la ficha:
  - el encabezado ilegible de **Simargl** (DO-023);
  - la entrada sin encabezado de **Bouda** (AM-056);
  - el código de **Rey Roble**, que el original repetía de Kuyén.

## Revisión (26-09-2026)

Se hizo contra los dos originales:

- **Todos los textos de las fichas** se buscaron en el texto extraído del PDF
  original y del nuevo.
  - En el nuevo están los 129 (antes, después y versiones de las 63 cartas).
  - En el original, 121 salen tal cual. Los otros 8 difieren solo por los
    números de página que el original mete en medio del texto ("o8ponente",
    "A7 liado") o por líneas partidas. Se revisaron palabra por palabra.
- **Conteos**:
  - Fe de Erratas: 62 "Donde dice" en el original más Nanna, que no lo usa,
    son las 63 entradas.
  - Banlist: 9 prohibidas, 31 Únicas, 37 erratas y 7 cartas en observación,
    por nombre, contra el original.
- **Estructura**: cada página del original se revisó a ojo. En la banlist, el
  texto extraído mezclaba la lista de prohibidas con la de observación; la
  imagen dejó claro qué es cada cosa.
- **Nombres contra el catálogo**:
  - Devastador, Dragón de Magma, Ataque de Dragón y Lahmu ya están, con su
    impresión de pack (en ContraAtaque y Dominio). De las nueve en
    observación están siete (sin aplicarles la Banlist); Wotan y Jarnvid no,
    y está anotado en `TODO.md`.
  - **«Traer el Terror» no existe**: la Banlist se equivoca de nombre y la
    carta es **Traer el Horror** (BU-081), que sí está en el catálogo. Se
    corrigió en `fuente/banlist-estandar.json` y en el PDF, y quedó en las
    notas de la transcripción.

## El DAR (23-10-2026)

*Documento Actualizado de Reglas*, revisión de julio de 2021: 62 páginas de
Word con las cartas escaneadas y la marca de MyL en cada hoja. Se transcribió
a `fuente/dar.json` sección por sección desde el texto extraído
(`pdftotext`), cotejando cada página con su imagen.

- **Criterio**: el de los otros dos. El texto de las reglas se copia del
  original y solo se corrige lo que es error del documento (palabras pegadas o
  partidas, ortografía, una frase duplicada); cada corrección está en
  `correcciones`, que la página y el PDF publican como "Notas de la
  transcripción".
- **Numeración**: el original no numera los apartados en el texto pero sí los
  cita ("Ver 10.2 Alimentar", "sección 6.6"). Se numeraron en orden y con eso
  las citas del original aciertan, salvo la de Alimentar (es el 10.3). Las
  letras de las reglas se conservan aunque salten (Tótems pasa de la E a la
  G), porque así se citan.
- **Cartas de ejemplo**: las del catálogo, no los escaneos. Seis no son del
  formato (Ningirsu, Soma, Sir Héctor, Aphofis, Kay, Walkirias) y van con su
  nombre y sin imagen. El pie de un ejemplo nombraba a Zeus Olimpios y la
  imagen era Shingas: se dejó la de la imagen.
- **Diagramas**: los tres del original, redibujados (anatomía de la carta,
  arena de juego y árbol de resolución).
- **Cotejo**: 11 secciones, 90 reglas con letra y los 48 conceptos de la
  sección 10, en el orden del original; `documentos.test.ts` lo fija.
