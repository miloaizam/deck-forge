# Desarrollar en DeckForge

Cómo levantar el proyecto, cómo está organizado y qué se espera de un pull
request. Qué es DeckForge y qué hace está en el [README](README.md).

---

## Requisitos

- **Node.js 20.9+** (probado con 24). El repo trae `.nvmrc`.
  Los tests necesitan **Node 24**: usan el corredor de Node, que desde esa
  versión ejecuta TypeScript de fábrica.
- **pnpm** — el gestor de paquetes del proyecto, fijado en `packageManager`.
  Con Node 20+ basta `corepack enable pnpm`; si no, `npm i -g pnpm`.
- **Python 3.10+** — solo si vas a tocar los scripts de datos o de imágenes.
  Para trabajar en la app no hace falta.

## Cómo correrlo

```bash
pnpm install
pnpm run dev       # http://localhost:3000
```

El catálogo ya está commiteado (`public/data/cards.json` y `public/cards/`), así
que la app levanta sin bajar nada de ninguna API.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm run dev` | Desarrollo en http://localhost:3000 |
| `pnpm run build` | Genera el sitio estático en `out/` |
| `pnpm run preview` | Sirve `out/` en http://localhost:4173 |
| `pnpm run check` | Typecheck + lint + formato + tests |
| `pnpm run test` | Solo los tests |
| `pnpm run format` | Arregla el formato (prettier) |
| `pnpm run audit` | Auditoría de seguridad sobre `out/` (tras el build) |
| `pnpm run data:fetch <edicion>` | `api.myl.cl` → `data-src/` + `images-src/` |
| `pnpm run data:card <edicion> <n>` | Una carta suelta → `data-src/extras.json` |
| `pnpm run data:images` | `images-src/*` → `public/cards/*.webp` |
| `pnpm run data:cards` | `data-src/*.json` → `public/data/cards.json` |

Dos cosas de pnpm que muerden si vienes de npm: `pnpm audit` (sin `run`) es la
auditoría de vulnerabilidades de pnpm y **no** la nuestra; y los argumentos van
sin el `--` que npm exigía — `pnpm run data:fetch bushido --limit 20`.

## Estructura

```
src/app/         rutas (App Router), layout y globals.css
src/components/  componentes de React
src/lib/         lógica pura: tipos, esquemas, reglas, utilidades
scripts/         herramientas Python: bajan datos, validan, convierten imágenes
data-src/        FUENTE editable del catálogo (un JSON por edición)
images-src/      originales pesados de las cartas (git-ignorado)
public/          se sirve tal cual
  data/          cards.json      (GENERADO — no editar a mano)
  cards/         WebP + thumb/   (GENERADO — no editar a mano)
  brand/         logos e isotipos SVG
docs/            plan del proyecto y guía de marca
out/             build estático (git-ignorado)
```

Las rutas: `/` portada · `/catalogo` y `/catalogo/<edicion>` · `/constructor` arma y
edita · `/barajas` la lista · `/baraja` el detalle · `/erratas` (todavía vacía).

Dónde tocar según lo que quieras hacer:

| Quiero… | Está en |
|---|---|
| Cambiar cómo se ve algo | `src/components/` y los tokens de `src/app/globals.css` |
| Cambiar las reglas de construcción | `src/lib/deck-rules.ts` |
| Cambiar cómo se guarda o comparte una baraja | `src/lib/deck-storage.ts`, `src/lib/deck-code.ts` |
| Cambiar el resaltado de keywords | `src/lib/ability.ts` |
| Corregir el texto o los datos de una carta | `data-src/<edicion>.json` + `pnpm run data:cards` |
| Agregar una edición | `scripts/fetch_edition.py` y la receta de CLAUDE.md |

## Las reglas de la casa

Están completas en **[CLAUDE.md](CLAUDE.md)** (código, datos y seguridad) y
**[DESIGN.md](DESIGN.md)** (diseño y accesibilidad). Lo que más se usa:

- **Server Components por defecto.** `"use client"` solo cuando hay estado,
  efectos o eventos, y lo más abajo posible en el árbol.
- **Código en inglés, interfaz en español.** Los campos del dominio van en
  español porque vienen del juego: `tipo`, `raza`, `escuela`, `habilidad`.
  Los comentarios de código, sin tildes ni `ñ`; los textos de la interfaz y los
  datos, con acentuación normal y correcta.
- **TypeScript `strict`.** Nada de `any` ni `@ts-ignore` — ESLint los bloquea.
  Un `as` necesita un comentario que explique por qué es seguro.
- **Tailwind con los tokens de marca**: `bg-panel`, `text-muted`, `border-line`…
  Nada de hex sueltos en los componentes.
- **Todo lo que entra desde fuera se valida con Zod**: `cards.json`,
  `localStorage` y la query string. Nunca se asume su forma.
- **No se rompe el export estático**: nada de API routes, middleware, `cookies()`
  ni Server Actions. Tampoco `dangerouslySetInnerHTML`, que ESLint rechaza.
- **No se editan a mano** `public/data/cards.json` ni `public/cards/`: se
  regeneran desde `data-src/` y perderías el cambio.

## Los tests

```bash
pnpm run test
```

Son 78, en seis archivos de `src/lib/*.test.ts`, y corren con el corredor de
Node: **cero dependencias de testing**. Van **contra el catálogo real** y no
contra fixtures, a propósito — los bordes que duelen salen de los datos, y así
es como aparecieron cosas como las cinco cartas de ContraAtaque a las que no les
llegaba el punto de cierre.

Lo que cubren, por si tocas esa zona:

- `deck-rules.test.ts` — las reglas del formato. Es el módulo de más
  consecuencia del repo: si se equivoca, da por legal una baraja que no lo es.
- `deck-code.test.ts` — el enlace compartido y el archivo de respaldo. Son
  entrada externa: lo importante es que **nada de lo que llegue haga lanzar**.
- `deck-storage.test.ts` — lo que se lee de `localStorage`, que el usuario o una
  extensión pueden haber editado.
- `ability.test.ts` y `keywords.test.ts` — el texto de las cartas y sus
  keywords.
- `card-order.test.ts` — el orden en que se listan las cartas, que comparten el
  catálogo, el constructor y el detalle de una baraja.

Si arreglas un bug de datos o de reglas, deja un test que falle sin tu arreglo.

## Los datos de las cartas

Solo si vas a tocar el catálogo. El entorno de Python vive en el repo, sin
`sudo`:

```bash
python3 -m venv --without-pip .venv
curl -sSL https://bootstrap.pypa.io/get-pip.py | .venv/bin/python -
.venv/bin/pip install -r requirements.txt
.venv/bin/pre-commit install   # hooks de cada commit (pnpm install ya lo intenta)
```

La cadena completa:

```bash
pnpm run data:fetch bushido   # o --limit 20 para un piloto
pnpm run data:images
pnpm run data:cards
```

Tres cosas que hay que saber antes de tocar nada aquí:

1. **`data-src/` es la fuente de verdad**, y se corrige a mano. La API oficial
   entrega bastante dato malo —textos de otra carta, nombres mal escritos, coste
   y fuerza intercambiados, cartas que no aparecen— y esas correcciones se
   verifican **contra el arte de la carta**, que es lo que manda. El script no
   las pisa sin `--force`.
2. **`public/data/` y `public/cards/` son artefactos generados.** El frontend
   los lee; nunca los escribe.
3. **`src/lib/types.ts` y `scripts/schema.py` describen el mismo modelo.** Si
   cambias uno, cambia el otro en el mismo commit.

CLAUDE.md tiene la receta de cómo se revisó cada edición y qué buscar en una
nueva. Vale la pena leerla antes de cargar la undécima.

## Antes de abrir un pull request

```bash
pnpm run check
```

Tiene que pasar entero: typecheck, lint, formato y los tests. El pre-commit
(pre-commit.com) lo corre en cada `git commit`, y el CI de GitHub lo repite
junto con el build y la auditoría en cada push (ver CLAUDE.md, §3).
Además:

- **Una rama por cambio**, y que el PR haga una sola cosa.
- **Mensajes de commit en español y sin tildes**, en presente y describiendo el
  porqué y no solo el qué — "El side deck es libre entre 0 y 10", no "fix side".
  Si el cambio tiene historia, va en el cuerpo del mensaje: mira `git log` para
  el tono.
- **Si tocas datos de cartas**, di contra qué los verificaste (el arte, el
  fandom, el pie de la carta) y deja regenerado `public/data/cards.json`.
- **Si agregas una dependencia**, justifícala en el PR: cada una es superficie
  de ataque y peso de descarga, y el proyecto las mantiene al mínimo a
  propósito.
- **Si cambias algo que ya está explicado en CLAUDE.md o DESIGN.md**, actualiza
  esa explicación en el mismo commit.

Los reportes de erratas en las cartas también son bienvenidos como issue: di
qué carta, qué dice el catálogo y qué dice el arte.

## Documentación

- [CLAUDE.md](CLAUDE.md) — convenciones de código, datos y seguridad
- [DESIGN.md](DESIGN.md) — convenciones de diseño, tokens y accesibilidad
- [scripts/README.md](scripts/README.md) — las herramientas de Python en detalle
- [docs/plan.md](docs/plan.md) — plan completo por fases
- [docs/brand.html](docs/brand.html) — guía de marca (ábrela en el navegador)
