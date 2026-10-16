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

### Lighthouse para medir el rendimiento

- **Qué:** instalar Lighthouse como dependencia de desarrollo para medir
  rendimiento, accesibilidad y buenas prácticas del sitio construido, y
  mejorar lo que salga.
- **Por dónde:** `lighthouse` usa el Chromium de Playwright; un script
  `pnpm run lighthouse` sobre `out/` servido. Mirar sobre todo `/catalogo`
  (HTML grande) y el constructor.
- **Terminado cuando:** hay un informe por ruta y los arreglos que salgan,
  o anotados aquí.

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
  Alternativo. Ejemplo: **Mariamman**, de los kits raciales, tiene una.
  Quedan fuera las ediciones ya revisadas entre Bushido y Escuelas
  Elementales.
- **Por dónde:** el listado de productos del fandom y de la API
  (`/cards/edition/…`); mismo criterio que la carga de Arte Alternativo
  (CLAUDE.md): que la habilidad sea igual o casi igual, y consultar los
  casos dudosos.
- **Terminado cuando:** cada kit está revisado y sus reimpresiones cargadas
  en `data-src/arte-alternativo.json`.

## Colección

### Exportar la colección como lista

- **Qué:** en `/coleccion`, poder copiar o bajar como texto la lista de lo que
  se tiene o lo que falta («3 Akiko Yamamoto (Escuelas Elementales, Ultra
  Real)…»), para pegarla en un chat o un foro.
- **Por dónde:** junto a «Imagen» en `ColeccionAcciones.tsx`; respeta la
  pestaña, los filtros y el orden que se ven, como la imagen.
- **Terminado cuando:** la lista se copia y se baja, y la ayuda lo explica.

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
