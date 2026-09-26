# Documentos oficiales del formato

Transcripciones de DeckForge de los documentos oficiales del formato Escuelas
Elementales, con el estilo del sitio. Esta carpeta es la **fuente**: los datos y
el generador. Los PDF viven en **`public/reglas/`** y se publican; la página
`/documentos` los enlaza para abrir y descargar, y `/documentos/fe-de-erratas` y
`/documentos/banlist` los dibujan en HTML con estos mismos datos. **Todavía no
se aplican** al catálogo ni al validador de barajas (ver `TODO.md`).

| Archivo | Qué es | Original |
|---|---|---|
| `public/reglas/FeDeErratas-260926.pdf` | 63 cartas corregidas: lo que dice la carta impresa y lo que debe decir, con el cambio resaltado. | *Fe de Erratas: Escuelas Elementales*, junio de 2022 (20 páginas) |
| `public/reglas/BanlistEstandar-260926.pdf` | 9 prohibidas, 31 Únicas, 37 erratas y ajustes, y las cartas de otras ediciones en observación. | *Banlist Formato Estándar RE MyL*, modificado el 26-11-2025 (5 páginas) |

El sufijo es la fecha de la transcripción (AAMMDD). Una versión nueva del
documento oficial es un archivo nuevo, no se pisa el anterior: al cambiarlo,
actualizar `VERSION` en `generar.mjs` y `DOCUMENTOS` en `src/lib/documentos.ts`
(el test comprueba que el PDF exista y tenga las páginas que dice).

## Cómo está hecho

- **`fuente/*.json`** son los datos transcritos, y son la fuente de verdad: los
  PDF se generan a partir de ellos. Cuando se apliquen las erratas y la
  banlist al sitio, se leerán de aquí.
- **`src/lib/documentos.ts`** tiene un esquema de Zod para cada JSON, y
  **`src/lib/documentos.test.ts`** los valida en `pnpm run check` y los cruza
  con el catálogo: cada carta nombrada tiene que existir, o estar en una lista
  que dice por qué no (fuera del formato, falta en el catálogo, o no es una
  carta sino una regla de construcción).
- **`fuente/generar.mjs`** arma el HTML de cada documento y lo imprime a PDF con
  Chromium. Colores del tema oscuro de `src/app/globals.css`, Space Grotesk y
  el logotipo de `public/brand/`.

```bash
pnpm run build                    # la tipografía sale del build, como en docs/og-image.html
node documentos/fuente/generar.mjs
```

Playwright **no** es dependencia del repo: el script lo busca en
`PLAYWRIGHT_PATH` o en la instalación global de Node.

Los PDF van **sin etiquetar** (`tagged: false`). Con la tipografía variable,
Chromium la incrusta como Type3, y las etiquetas subían la Fe de Erratas a unos
990 KB, pegada al límite de 1 MB del pre-commit. Sin ellas pesa unos 750 KB.
El texto se sigue pudiendo seleccionar y buscar, y los PDF llevan marcadores.

Los originales **no se suben**: el de la banlist pesa 6 MB y el pre-commit
corta en 1 MB.

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
  - No están, por ser de ediciones fuera del formato: Devastador, Ataque de
    Dragón, Dragón de Magma, Lahmu, Wyvern Dorado, Raksasa Sombrío, Jarnvid,
    Melusina, Wotan, Muhammad Bin Qasim, Bibi Dalair Kaur, Anubis de Inpu y Mut.
  - Tampoco está **Traer el Terror**, que sí debería ser del formato: queda
    anotado para la revisión de cartas faltantes (`ISSUES.md`).
