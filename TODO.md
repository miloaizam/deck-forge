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

### Rendimiento: catálogo y Mis barajas bajo 80 en móvil

- **Dónde está (21-10-2026):** Lighthouse en móvil, mediana de tres corridas
  con gzip: catálogo 77 (73–89), constructor 85, colección 89, Mis barajas 78.
  Lo hecho está en CLAUDE.md («El catálogo no va dentro del HTML»).
- **Qué falta:** lo que queda es sobre todo el arranque de React y Next (las
  mismas tareas largas salen en `/novedades`) y evaluar el chunk de la página.
  En Mis barajas vacía, el LCP es el texto de «Todavía no tienes barajas», que
  solo se pinta tras hidratar porque depende de `localStorage`.
- **Por dónde:** medir con el perfil de CPU a 4x (CLAUDE.md lo describe) antes
  de tocar nada; las corridas de Lighthouse varían ±10 puntos en este
  contenedor. Ideas sin probar: cargar `faq.ts` (14 KB, en todas las páginas)
  solo al abrir la ayuda.
- **Terminado cuando:** catálogo y Mis barajas pasan de 80 en la mediana, o
  se decide que no vale la pena y se anota por qué.

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
