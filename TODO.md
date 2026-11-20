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

## Constructor y barajas

### Probabilidades de la mano inicial

En el detalle de una baraja, «Probar una mano» (`HandTester.tsx`) solo roba
al azar. Falta decir cuánto se puede esperar: la chance de tener al menos un
Aliado, Tótem, Talismán, Arma u Oro con 8 cartas y con 7 tras un mulligan
(y, para el Oro, de tener 2 o 3), más un `Select` para elegir una carta y ver
la suya.

- **Por dónde empezar:** `alMenos(N, K, n, k)` (hipergeométrica) en
  `src/lib/hand-test.ts`, sobre `mazoParaRobar` (sin el oro inicial, como la
  mano de prueba); una tarjeta `ProbabilidadesMano.tsx` en la grilla de
  análisis de `DeckDetailView.tsx`, a todo el ancho bajo la mano y la curva.
- **Terminado cuando:** la tarjeta sale en el detalle, con test de la
  fórmula y e2e.

### Deshacer en el constructor

Un «−» de más, una carta agregada por error, un cambio de formato o «Vaciar
la baraja» no tienen vuelta atrás.

- **Por dónde empezar:** una pila de barajas anteriores (tope de 50) en
  `BuilderView.tsx`, alimentada por una función `editar()` por la que pasen
  agregar, quitar, copias, oro inicial, arte, formato y vaciar. El nombre y
  la nota no: ya tienen el deshacer nativo del campo. Ctrl+Z / ⌘Z, salvo con
  el foco en un campo de texto; un botón con icono junto a «Guardar», también
  en el pie de la hoja del teléfono. La pila se vacía al cargar otra baraja,
  al recuperar o descartar el borrador y al guardar.
- **Terminado cuando:** botón y atajo funcionan, con test de la pila y e2e
  (y Ctrl+Z dentro del nombre no deshace la baraja).

### Copiar la baraja como texto e importarla desde texto

El detalle ofrece imagen y enlace, pero no una lista en texto para WhatsApp o
para inscribirse en un torneo. La colección ya lo hace («Lista»,
`coleccionComoTexto()` en `coleccion.ts`).

- **Por dónde empezar:** `src/lib/deck-text.ts` con su test: exportar
  «3x Akiko Yamamoto…» por tipo, con el oro inicial marcado; importar
  pegando la lista en el constructor. Los nombres no son únicos (Shuri,
  Jacques de Molay): elegir una impresión y avisar las líneas que no se
  reconozcan.
- **Terminado cuando:** lo exportado se vuelve a importar y da la misma
  baraja.

### Instalar como app

El sitio no tiene manifest, así que no se puede añadir a la pantalla de
inicio del teléfono como una app.

- **Por dónde empezar:** un `manifest.webmanifest` con íconos (los SVG de
  `public/brand/`). El modo sin conexión (service worker que guarde catálogo
  e imágenes) va aparte: toca la caché, la CSP y la auditoría.
- **Terminado cuando:** Chrome del teléfono ofrece instalarlo y la auditoría
  pasa.

## Técnico

### Los enlaces viejos `/mazo/?d=…` dan 404

Desde que `/mazo` pasó a `/baraja`, los enlaces compartidos antes no abren
(CLAUDE.md, «Constructor de barajas»).

- **Por dónde empezar:** un `public/_redirects` de Cloudflare Pages hacia
  `/baraja/` que conserve la query (la página ya lee `?d=`). Revisar que
  `audit_build.py` acepte el archivo.
- **Terminado cuando:** un enlace `/mazo/?d=…` abre la baraja.

### Sin `robots.txt` ni `sitemap.xml`

- **Por dónde empezar:** Route Handlers estáticos, como
  `src/app/data/portada.json/route.ts`. El sitemap lleva las rutas públicas
  y una por edición; `/baraja` y la 404 ya van con `noindex`.
- **Terminado cuando:** los dos salen en `out/` y la auditoría pasa.

## Lo grande

### Mesa de juego 1v1 (idea en borrador)

Una mesa al estilo Tabletop Simulator para jugar entre dos cuentas, **sin
nada automatizado**: ni reglas, ni turnos, ni efectos. Solo manipular cartas
sobre una mesa compartida. Los efectos se conversan por fuera (Discord, por
ejemplo) y cada jugador los aplica a mano. Por ahora es una lluvia de ideas.

- **Qué es:** una sala 1v1 entre dos usuarios con sesión iniciada. Cada uno
  entra con una de sus barajas guardadas. En la mesa se puede:
  - arrastrar a cualquier sitio;
  - apilar;
  - voltear boca abajo y boca arriba;
  - barajar el Castillo y robar;
  - mandar a Cementerio o Destierro;
  - ver una carta en grande (el `CardModal`).
- **Piezas:**
  - una ruta `/mesa` con sala por código o enlace, estática como
    `/baraja?p=`;
  - zonas dibujadas como guía, pero libres;
  - la mano propia abajo, y la del rival solo como dorsos y su cantidad;
  - un registro de acciones a un costado («X robó una carta», «Y mandó Z al
    Cementerio») para que ninguno se pierda.
- **Sincronización:** Supabase Realtime (broadcast y presencia por
  websocket). Hoy el sitio usa solo `auth-js` y `fetch` (CLAUDE.md §7), así
  que esto pide dos decisiones:
  - el cliente: `@supabase/realtime-js` o un websocket propio;
  - la CSP: `wss://` al host de Supabase en `connect-src`, con su línea en
    la auditoría.
- **Información oculta sin servidor propio:** la mano y el orden del
  Castillo viven **solo en el navegador de su dueño**. Al rival le llegan la
  cantidad y las cartas que se revelan, así que no puede espiarlas.
  - El límite: barajar lo hace el dueño, que podría hacer trampa. Para
    jugar entre amigos alcanza; para torneos, habría que barajar en la base.
- **Derechos:** es un uso del arte distinto de consultar y armar barajas.
  Conviene preguntarle a la editorial antes de publicarlo.
- **Terminado cuando:** dos cuentas, en dos navegadores, juegan una partida
  completa moviendo cartas, y ninguna ve la mano del otro.
