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

## Hook de pre-commit

- **Qué:** que `git commit` corra las comprobaciones antes de aceptar el
  commit, para no depender de acordarse de `pnpm run check`.
- **Por dónde:** sin dependencias nuevas si se puede (CLAUDE.md, §7): un
  script en el repo (por ejemplo `.githooks/pre-commit`) activado con
  `git config core.hooksPath`. Decidir si corre el `check` completo o solo lo
  rápido (formato y lint), porque los tests van contra el catálogo real.
- **Terminado cuando:** un commit con errores de formato, lint o tipos se
  rechaza, y CLAUDE.md explica cómo activarlo.

## Exportar la baraja como imagen

Del roadmap, Fase 3 (`docs/plan.md`).

- **Por qué:** para compartir la baraja en redes sociales, donde un enlace dice
  menos que una imagen.
- **Ojo:** sin servidor y sin dependencias nuevas si se puede (canvas del
  navegador), y respetando la CSP: nada de recursos externos.
- **Terminado cuando:** desde `/baraja` se puede descargar una imagen de la
  baraja.
