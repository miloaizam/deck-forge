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

## Diseño

### Evaluar una mejora visual

- **Qué:** la consistencia ya se resolvió (botones, controles y contenedores
  salen de `src/lib/ui.ts` y están en DESIGN.md §6, 16-10-2026). Falta decidir
  si conviene una mejora de fondo: jerarquía de cada página, espaciados y
  densidad, y el aspecto en el tema claro, que se diseñó después del oscuro.
- **Por dónde:** el artifact «Sistema de diseño DeckForge» tiene la galería
  de componentes y capturas de cada vista; contrastarlas con la guía de marca
  (`docs/brand.html`).
- **A decidir antes:** si es un repaso puntual o una renovación, que tocaría
  DESIGN.md.
- **Terminado cuando:** hay una lista de cambios acordada y aplicada, o la
  decisión de que no hace falta.

### Revisar el sitio en pantallas medianas y pequeñas

- **Qué:** probar la navegación entera en teléfono y tableta (de 360 a 1024 px
  de ancho): navbar plegada, filtros, constructor con su hoja, colección,
  modales y documentos.
- **Por dónde:** Playwright ya emula un Pixel 7 (`pnpm run e2e`); sumar una
  tableta (`devices["iPad Mini"]`) y recorridos de las rutas que hoy solo se
  prueban en escritorio (los del constructor se saltan en el teléfono).
  Capturar cada ruta a 360, 768 y 1024 y revisarlas a ojo.
- **Terminado cuando:** cada ruta se usa sin scroll horizontal ni controles
  tapados en los tres anchos, y hay pruebas que lo vigilan.

### Imagen de la carta en «3D» en el detalle

- **Qué:** que la imagen del modal de una carta se incline un poco siguiendo
  el cursor (o el giroscopio en el teléfono), con un brillo que se mueve, como
  en tor.myl.
- **Por dónde:** `CardModal.tsx`. Se puede hacer con CSS (`perspective` y
  `rotateX`/`rotateY` desde variables que pone un `pointermove`) sin
  dependencias. Ojo: con «reducir movimiento» no se inclina, y el
  giroscopio en iOS pide permiso.
- **Terminado cuando:** la carta se inclina con suavidad, vuelve a su sitio al
  salir y respeta «reducir movimiento».

## Por evaluar

Preguntas abiertas: cada una termina en una decisión anotada (en DESIGN.md o
CLAUDE.md), se adopte o no.

### ¿Framer Motion en vez de CSS?

- **Qué:** hoy todo se anima con CSS (`@starting-style`,
  `transition-behavior: allow-discrete`, `AutoHeight`), sin dependencias.
  Evaluar si una librería como Framer Motion (`motion`) aporta lo bastante:
  animaciones de salida de listas, reordenamientos, gestos.
- **A pesar:** peso del bundle (~30–50 KB), una dependencia más (CLAUDE.md
  §6 y §7), y que ya funciona sin ella.
- **Terminado cuando:** hay una decisión con un ejemplo concreto que con CSS
  no se pueda.

### Rendimiento: el catálogo va entero en cada página

- **Medido (21-10-2026, Lighthouse 12 en móvil simulado, `out/` servido con
  gzip como Cloudflare):** portada 94 y novedades 95, pero catálogo y
  constructor 55, colección 66 y Mis barajas 72. Accesibilidad, buenas
  prácticas y SEO dan 100 en todas. El cuello no es la red (FCP ~1,8 s) sino
  el **hilo principal**: TBT de ~1,1 s en catálogo, constructor y colección.
- **Por qué:** cada página que usa el catálogo lo recibe entero como props de
  un Server Component (`getCards()`), así que las 2650 cartas van incrustadas
  en el HTML **y** en el payload RSC (~1,45 MB cada uno, ~200 KB con gzip), y
  el navegador las parsea e hidrata en cada página. Además los `Link` de la
  navbar **precargan** los payloads de catálogo, constructor, colección y Mis
  barajas: abrir `/barajas` en escritorio baja ~8,9 MB sin comprimir.
- **Por dónde:** `prefetch={false}` en la navbar (arreglo de una línea) y,
  de fondo, que las vistas de cliente lean `/data/cards.json` una sola vez
  (cacheable) en vez de recibirlo por props; ojo con el HTML prerenderizado
  de la grilla, que hoy es lo que pinta rápido el catálogo. Mirar también el
  costo de `buildSearchIndex` al montar.
- **Lighthouse como dependencia:** no hace falta para esto; se corrió sin
  instalarlo en el repo. Decidir si se agrega un `pnpm run lighthouse`.
- **Terminado cuando:** catálogo, constructor y colección pasan de 80 en
  móvil, o se decide que no vale la pena y se anota por qué.

### ¿View Transitions para las animaciones entre páginas?

- **Qué:** la API de View Transitions anima el paso de una página a otra (y
  entre estados de una misma página) sin librerías. Evaluar si mejora la
  plataforma: abrir una carta desde la grilla, pasar del constructor al
  detalle de la baraja.
- **Por dónde:** Next 16 la soporta en el App Router; ver su efecto en un
  export estático y con «reducir movimiento».
- **Terminado cuando:** hay una decisión, con una prueba si se adopta.

### ¿Container queries?

- **Qué:** que un componente se adapte al ancho de **su contenedor** y no al de
  la pantalla (`@container` en CSS, `@container` / `@sm:` en Tailwind v4).
  Serviría, por ejemplo, para que la tarjeta de una baraja o la fila de la
  colección se reacomoden igual en una grilla de tres columnas que en una.
- **Terminado cuando:** hay una decisión y, si se adopta, un primer
  componente que la use.

## Datos

### Reimpresiones en los kits entre Conjuros y Furia

- **Qué:** revisar los kits y mazos que salieron entre Conjuros y Furia
  buscando reimpresiones de cartas del catálogo que falten en Arte
  Alternativo. Quedan fuera las ediciones ya revisadas entre Bushido y
  Escuelas Elementales. **Mariamman** del Kit Eterno ya está (`aa-420`); el
  resto de los kits de **Colecciones Raciales 2021** (y los de 2020) está
  sin revisar.
- **Por dónde:** el listado de productos del fandom (la plantilla de cada
  carta trae una tabla «Otras versiones» con cada reimpresión, y
  `Lista de cartas de Colecciones Raciales 2021`); la API no tiene los kits.
  Mismo criterio que la carga de Arte Alternativo
  (CLAUDE.md): que la habilidad sea igual o casi igual, y consultar los
  casos dudosos.
- **Terminado cuando:** cada kit está revisado y sus reimpresiones cargadas
  en `data-src/arte-alternativo.json`.

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
