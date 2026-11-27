# GAME.md: la mesa de juego 1v1

El plan de la **mesa de juego**: una mesa al estilo Tabletop Simulator para
que dos cuentas de DeckForge jueguen una partida moviendo cartas. Aquí vive
**todo** lo de la mesa: qué es, qué está decidido, qué falta decidir, lo que
pide el DAR, la arquitectura y el plan por sesiones. Lo demás pendiente del
sitio sigue en [TODO.md](TODO.md).

**Cómo se trabaja este archivo.** Igual que `TODO.md`: al terminar una sesión
se marca **hecha**, con la fecha y el commit, y lo que se descubra en el camino
se anota en la sesión que corresponda en vez de perderse. Una decisión abierta
que se cierra pasa a «Decisiones tomadas».

---

## 1. Qué es y qué no

- **Qué es:** una sala para **dos usuarios con sesión iniciada**, cada uno
  con una de sus barajas guardadas, sobre una mesa compartida. Se ponen,
  mueven, apilan y voltean cartas, se baraja y se roba: **solo manipular
  cartas**, como en la vida real.
- **Qué no es:** un juego automatizado. No hay reglas, ni turnos, ni efectos
  que se resuelvan solos. Los jugadores **conversan** los efectos por fuera
  (Discord, por ejemplo) y cada uno los aplica a mano.
- **Solo escritorio**, al menos al principio. Bajo `lg` la mesa dice que es
  para escritorio y no se carga.
- **Derechos:** es un uso del arte distinto de consultar y armar barajas
  (CLAUDE.md §8). La mesa se construye **apagada** (`MESA_ACTIVA`, §5) y se
  enciende recién cuando se haya consultado a la editorial.

## 2. Decisiones tomadas

- **Serie al mejor de 3 o al mejor de 5**, que se elige al crear la sala. La
  mesa lleva el marcador. Cada juego termina con un **estado de mesa**:
  ganador o empate.
- **El resultado se declara y se confirma** (21-11-2026). Un jugador declara
  (gané, perdí o empate) y el otro confirma. **Si no se ponen de acuerdo,
  el juego se anula y se juega de nuevo**, sin sumar al marcador.
  **Rendirse** es inmediato y no pide confirmación.
- **Desconexión: 2 minutos** (21-11-2026). Si pasan sin que el jugador
  vuelva, **la serie entera es para el que siguió conectado** y la mesa se
  cierra. Recargar la página devuelve a la mesa tal como estaba.
- **La sala tiene formato** (Estándar, VCR o Infantería), que se elige al
  crearla, y **solo entran barajas que cumplen en él** (`validateDeck`, con
  el índice de ese formato) (21-11-2026).
- **Lo que un efecto le da al rival sobre tu Castillo** (botar, mirar las de
  arriba) **se ejecuta solo**: tu navegador lo hace al instante, sin pedirte
  permiso, y queda en el registro (21-11-2026).
- **Barajar lo hace el navegador del dueño** (21-11-2026). En teoría el dueño
  podría hacer trampa; para jugar entre amigos alcanza.
- **Sin historial** (21-11-2026): la mesa se borra al terminar la serie.
  Mientras dura, la partida vive en la base (para poder reconectar), y eso es
  lo único que suma `/privacidad`.
- **La consulta a la editorial la hace el proyecto en paralelo**
  (21-11-2026). La mesa se construye apagada (`MESA_ACTIVA`) y se enciende
  con la respuesta.
- **La mesa se encendió el 24-11-2026**, con el acuerdo de la editorial
  (`src/lib/mesa/activa.json`). Lo que suma al resto del sitio (la navbar,
  la ayuda, `/privacidad` y su Novedad) sale solo con ella encendida:
  apagarla deja el sitio como antes.
- **El tiempo real va con `@supabase/realtime-js`** (22-11-2026), y no con
  un websocket propio. Ya resuelve el protocolo de canales, los latidos, la
  reconexión, la presencia y la renovación del token. Es de la misma familia
  que `auth-js` y no es el cliente completo que CLAUDE.md §7 prohíbe. Trae
  dos dependencias (`tslib` y `@supabase/phoenix`) y ningún script de
  instalación.
  - Va con versión exacta, como las demás, y se carga diferido y solo en
    `/mesa`.
  - **Canales privados**, con políticas RLS sobre `realtime.messages`, para
    que solo los dos jugadores de la mesa puedan entrar. Por defecto,
    cualquiera con la clave pública que conozca el nombre de un canal podría
    escucharlo.
- **Qué mueve cada uno:**
  - **todo lo que está sobre la mesa lo mueven los dos**, como en la vida
    real;
  - **la mano es la excepción:** siempre oculta para el rival, que ve solo
    los dorsos y la cantidad. Su dueño la ve con un clic, y **solo él la
    toca**: roba él mismo y, si se pasa de cartas, él mismo arrastra al
    Cementerio la que descarta.
- **Buscar en el Castillo** tiene dos formas:
  - **«Buscar»** (una carta cualquiera): va a la mano **sin revelarse**. El
    rival solo ve en el registro «X buscó una carta en su Castillo» y que el
    Castillo tiene una menos.
  - **«Buscar y mostrar»** (una carta específica o de un tipo): la elegida
    **se muestra a los dos** antes de ir a la mano, para que el rival
    compruebe que cumple.
  - En las dos, al terminar **se baraja el Castillo** (DAR §10.8).
- **Side deck de 0 a 10 cartas**, como en el constructor, aunque el DAR pida
  0 o 10 (decisión del proyecto, CLAUDE.md «Constructor de barajas»).
- **Un registro de acciones** a un costado («X robó una carta», «Y mandó Z
  al Cementerio») para que ninguno se pierda.

## 3. Decisiones abiertas

Ninguna: todas se cerraron entre el 21 y el 22-11-2026 y están en §2. Lo que
se descubra en el camino y haya que decidir se anota aquí.

## 4. Lo que pide el DAR

Revisado contra `documentos/fuente/dar.json`. La mesa no aplica ninguna de
estas reglas: las **hace posibles** a mano.

- **Zonas (§3), las nueve por jugador:**
  - Castillo y Mano son privadas.
  - Reserva de Oro, Zona de Oro Pagado y las Líneas de Defensa, Ataque y
    Apoyo son públicas, dentro del juego.
  - Cementerio y Destierro son públicas, fuera del juego: cualquiera de los
    dos puede abrirlas y revisarlas.
  - El conteo del Castillo y de la mano se ve siempre, para los dos.
- **Preparar cada juego:**
  - el oro inicial empieza en la Reserva (§3.2);
  - mano de 8, con mulligan (devolver, barajar y robar una menos);
  - un sorteo (moneda o dado) para ver quién comienza;
  - en el primer turno del juego no se roba (§9, Fase de Robar).
- **Atajos manuales, no automatismos.** Nada ocurre solo: todo lo pulsa el
  jugador.
  - **«Agrupar»** hace en un clic lo de la Fase de Agrupación (§9): los
    Aliados de Ataque vuelven a Defensa y los Oros pagados, a la Reserva.
  - Pagar es mover Oros de la Reserva a Oro Pagado.
  - Un **marcador de turno y fase** a la vista, que mueve el jugador activo:
    Agrupación, Vigilia, Batalla Mitológica (ataque, bloqueo, Guerra de
    Talismanes, daño), Final y Robar. En la Guerra de Talismanes, también de
    quién es la prioridad. No obliga a nada, pero ordena la conversación.
  - Al robar con más de 8 en la mano, la mesa avisa y el dueño descarta a
    mano.
- **Acciones sobre el Castillo, cada una con su visibilidad:**
  - **Robar** (§10.45): del tope a la mano, una a una.
  - **Botar N** (§10.7): del tope al Cementerio. Es el daño, y lo puede
    hacer el rival sobre tu Castillo: se ejecuta solo y queda en el
    registro.
  - **Mirar N** (§10.34): solo las ve quien controla el efecto, que las
    devuelve arriba en el orden que quiera. Hay efectos que miran el
    Castillo **o la mano del rival**: la mano se muestra solo a quien mira,
    por pedido del efecto y con el consentimiento del dueño.
  - **Mostrar N** (§10.35): las ven los dos, y quien controla el efecto las
    devuelve arriba en el orden que elija.
  - **Buscar** (§10.8): en el Castillo, el Cementerio o el Mazo de Soporte.
    - Si la carta tiene características específicas, se muestra.
    - Se puede fallar a propósito.
    - **El Castillo se baraja siempre al terminar**, se haya encontrado o no.
  - **Barajar desde el Cementerio** (§10.5): esas cartas se muestran al rival
    antes de entrar al Castillo.
  - **Poner debajo** del Castillo, y **desterrar** desde cualquier zona.
- **Dueño y controlador (§5):** una carta puede pasar al lado del rival
  («tomar el control») y sigue siendo de su dueño.
  - Al salir del juego vuelve a las zonas **de su dueño** (§10.5, §10.47).
  - Cada carta guarda su dueño y lo muestra con un borde o una marca.
- **Cartas unidas:**
  - **Portar** (§10.39): el Arma va anexada al Aliado y se mueve con él.
    Se puede cambiar de portador.
  - **Poner debajo** (§10.38): cartas detrás de otra, que se note que están.
    Si la de encima sale del juego, las de abajo van al Cementerio de su
    dueño.
- **Marcas sobre las cartas:**
  - contadores (§10.12) de **Honor**, **Conquista** y **Alimento**, más uno
    genérico; se van cuando la carta sale del juego;
  - un modificador de Fuerza temporal («+2 hasta la Fase Final»);
  - una nota libre para lo que cambia la carta: Convertir (§2.6, §10.15),
    Copia (§10.13), el atributo;
  - un botón que borra las marcas temporales al final del turno.
- **Entre juegos de la serie: Mazo de Soporte (anexo 1).**
  - El primer juego va con la baraja tal como está guardada.
  - Después de cada juego, cada uno puede cambiar de 0 a 10 cartas con el
    side, una por una y siempre con 50 en el Castillo. El rival puede pedir
    el conteo del side para comprobarlo.
  - En torneos competitivos hay 2 minutos para hacerlo: la mesa puede
    mostrar ese tiempo.
  - Al terminar la serie, la baraja guardada no cambia.
- **Fin de un juego:** pierde quien se queda sin cartas en el Castillo
  (§3.1). La mesa lo **avisa**, pero no lo declara sola: el resultado se
  confirma como en «La sala y la serie».

## 5. Arquitectura propuesta

**Modelo puro** (`src/lib/mesa/`, código en inglés, con sus tests):

- Cada carta en la mesa tiene un `uid` propio (dos copias de la misma carta
  son dos fichas) y lleva:
  - el id de la carta;
  - el dueño y el controlador;
  - la zona y su posición;
  - si está boca abajo;
  - a qué está anexada o debajo de qué;
  - sus contadores, el modificador de Fuerza y la nota.
- Las **acciones** son una unión de tipos, y un reductor `aplicar(estado,
  accion)` las ejecuta sin efectos secundarios: mover, voltear, apilar,
  anexar, poner debajo, robar, botar, barajar, mulligan, agrupar, poner y
  quitar contadores…
- **Lo público y lo privado van separados:**
  - el estado público es lo que ven los dos (mesa, conteos, Cementerio,
    Destierro);
  - el privado de cada jugador es su mano y el orden de su Castillo.
- Barajar usa Fisher-Yates con el azar inyectado, como `src/lib/hand-test.ts`.

**Base** (`supabase/mesa.sql`, **aparte** de `esquema.sql`, que no se toca;
mismas reglas que lo ya existente: RLS y funciones `security definer`, ver
`docs/cuentas.md`):

- `mesas`: los dos jugadores, el código para unirse, mejor de 3 o 5, el
  marcador, el estado (esperando, jugando, entre juegos, terminada), el
  ganador y la **última señal de vida** de cada uno.
- `mesas_publico`: la foto del estado público, con su versión.
- `mesas_privado`: una fila por jugador, que **solo su dueño puede leer**
  por RLS. Así lo oculto sobrevive a una recarga y el rival no lo puede leer
  ni con las herramientas del navegador.
- Funciones: crear mesa, unirse por código, latido, declarar y confirmar
  resultado, rendirse y **reclamar por abandono**. Esta última solo
  prospera si la última señal del otro es más vieja que el tiempo de gracia;
  lo comprueba la base, no el navegador.

**Tiempo real:**

- Un canal **privado** de Supabase Realtime por mesa, con
  `@supabase/realtime-js` (§2): **broadcast** para las acciones y
  **presencia** para saber quién está conectado (y mostrar la cuenta
  regresiva de la reconexión). Las políticas RLS sobre `realtime.messages`
  dejan entrar solo a los dos jugadores de esa mesa.
- Cada acción lleva la versión de la carta que toca. Si llega una acción
  sobre una versión vieja (los dos movieron la misma carta a la vez), se
  descarta y se vuelve a pedir la foto pública.
- Lo que el rival hace sobre zonas privadas ajenas (botar o mirar del
  Castillo) viaja como **pedido**: el navegador del dueño lo resuelve **al
  instante y sin preguntar** (§2) y publica lo que se revela.
- Requiere:
  - `wss://` al host de Supabase en `connect-src`, en `csp-hashes.mjs` y en
    la auditoría (`audit_build.py`): el `https://` que ya está no lo cubre
    (comprobado en la sesión 0);
  - que el cliente se cargue **diferido y solo en `/mesa`**, como `auth-js`,
    para no sumar peso al resto del sitio.

**Interfaz:**

- Una mesa de **tamaño lógico fijo**, escalada a la ventana con
  transformaciones de CSS. Es DOM, no canvas: así se reutilizan las imágenes,
  el `CardModal` y la accesibilidad.
- Arrastrar con **eventos de puntero**, sin librería nueva (CLAUDE.md §7).
- **Menú contextual** por carta (voltear, contadores, anexar, mandar a…) y por
  zona (barajar, robar, botar N, mirar N, mostrar N, buscar).
- Las cartas del rival, giradas 180°, en la mitad de arriba.
- Tokens de marca y constantes de `src/lib/ui.ts`, como el resto del sitio.

**Rutas** (todas estáticas, dentro de `RequiereCuenta`):

- `/mesa`: crear una sala (formato y mejor de 3 o 5) o unirse por código, y
  elegir una baraja que cumpla en el formato de la sala.
- `/mesa/?s=<id>`: la sala.
- `/mesa/practica`: la mesa en solitario, sin red.

**Interruptor `MESA_ACTIVA`**, como `NUBE_ACTIVA` (`src/lib/supabase-config.ts`):
mientras esté apagado, la mesa no aparece en la navbar y sus rutas dicen que
todavía no está disponible.

## 6. Sesiones

Cada sesión termina con algo que funciona y se puede probar, y con
`pnpm run check`, el build y la auditoría pasando. La mesa de práctica
(sesiones 1–3) ya sirve sola, aunque el 1v1 se complique.

### Sesión 0: decisiones y prueba técnica

- **Objetivo:** cerrar lo abierto (§3) y comprobar que el tiempo real cabe
  en el sitio.
- **Hecho (21 y 22-11-2026):** las ocho decisiones, pasadas a §2.
- **Hecho (23-11-2026): la prueba técnica**, en la consola del navegador y
  contra el proyecto real, con dos políticas temporales sobre
  `realtime.messages` que ya se borraron. Resultados:
  - **La CSP publicada bloquea `wss://`.** `connect-src` lleva
    `https://<host>.supabase.co` y Chrome no lo da por bueno para el
    websocket: hay que agregar `wss://<host>.supabase.co` (sesión 4). Con la
    CSP fuera, la conexión abre.
  - **El canal privado funciona como se quiere.** Dos cuentas con política
    entran, se ven en la presencia y se mandan broadcast en los dos sentidos.
    Una tercera cuenta es **rechazada** al unirse.
  - **Un broadcast no se guarda**: quien entra después no recibe lo que se
    mandó antes. La mesa tiene que pedir la foto pública al (re)conectarse,
    que es lo que ya dice §5.
  - **Las particiones diarias de `realtime.messages` las crea Realtime solo**,
    pero no antes del primer uso. El primer intento falló con
    `MissingPartition` y, minutos después, ya estaban las de cinco días. No
    hay que crearlas a mano, pero sí reintentar la unión si falla.
  - **Peso:** `@supabase/realtime-js` 2.119.2 con broadcast y presencia son
    **60 KB minificados y 17,5 KB con gzip** (34 KB del cliente y 26 KB de
    `@supabase/phoenix`). Solo en `/mesa`.

### Sesión 1: modelo y reductor

- **Objetivo:** la mesa entera como datos, sin interfaz.
- **Hecha (23-11-2026)**, en `src/lib/mesa/`:
  - `table.ts`: la ficha (uid, carta, dueño, controlador, boca abajo, a qué
    va anexada o debajo de qué, contadores, Fuerza temporal y nota), las
    diez zonas (las nueve del DAR y el Mazo de Soporte) y ayudas para
    ubicar fichas;
  - `setup.ts`: `newTable()` prepara el juego desde barajas guardadas, con
    el oro inicial en la Reserva (una sola copia), el Castillo barajado, la
    mano de 8 y el side en el Soporte;
  - `apply.ts`: la unión `Accion` y `apply(mesa, accion, azar)`: mover,
    voltear, robar, botar, barajar, mulligan, agrupar, portar, poner
    debajo, contadores, Fuerza, nota y limpiar temporales;
  - `mesa.test.ts`: cada acción y una partida de ejemplo. `pnpm run test`
    corre ahora también `src/lib/mesa/*.test.ts`.
- **Decisiones del modelo:**
  - las zonas son listas de uids en orden; en el Castillo el índice 0 es el
    tope, y en las demás lo último que llega va al final;
  - una ficha anexada o puesta debajo **no está en ninguna lista**: cuelga
    de su anfitriona y se mueve con ella, controlador incluido;
  - `apply` es puro (trabaja sobre una copia) y recibe el azar, como
    `hand-test.ts`. Una acción imposible devuelve la misma mesa sin lanzar;
  - lo único que la mesa hace sola es lo que el DAR fija: lo que sale del
    juego va a las zonas de su dueño y pierde sus marcas, y lo que llevaba
    anexado o debajo va al Cementerio de su dueño.
- **Pasa a la sesión 3:** separar lo público de lo privado (qué ve cada uno)
  y quién puede tocar la mano. El modelo ya guarda lo necesario, pero
  todavía no tiene la función que arme la vista de cada jugador.

### Sesión 2: mesa de práctica en solitario

- **Objetivo:** jugar solo contra la mesa, en `/mesa/practica`.
- **Hecha (23-11-2026):**
  - `MESA_ACTIVA` (`src/lib/mesa/activa.ts`): apagada, la ruta solo dice
    que todavía no está disponible. `NEXT_PUBLIC_MESA_ACTIVA=1` la enciende
    en un build, y `pnpm run e2e:mesa` construye así y corre
    `e2e/mesa.spec.ts`;
  - `/mesa/practica` (`MesaPracticaView.tsx`): pide cuenta, espera el
    catálogo, dice «La mesa es para escritorio» bajo `lg` sin cargarla, y
    deja elegir una baraja guardada con cartas;
  - la mesa (`MesaPractica.tsx`): un lienzo lógico de 1600 × 790 escalado a
    la ventana, con las zonas en tres columnas por tres filas (orden del
    proyecto, 24-11-2026): a la izquierda Soporte, Cementerio y Destierro,
    en pila; al medio Oro Pagado, Castillo (en pila) y Reserva de Oro; a la
    derecha, anchas, las Líneas de Ataque, Defensa y Apoyo. La mano va
    abajo, a lo ancho;
  - arrastrar con eventos de puntero, sin librería. Soltar sobre una carta
    en juego pregunta «Portar», «Poner debajo» o «Dejar al lado»; lo
    anexado asoma detrás de su anfitriona;
  - el menú de cada carta (clic, Enter o clic derecho, en `MenuMesa.tsx`):
    ver en grande con `CardModal`, voltear, soltar, mandar a cualquier zona
    (arriba o debajo del Castillo) y abrir lo que lleva anexado. El del
    Castillo roba, bota y baraja. Cementerio, Destierro y Soporte se abren
    en una ventana con todas sus cartas;
  - la barra de arriba: Robar, Barajar, Mulligan, Empezar de nuevo y
    Cambiar de baraja;
  - el e2e juega un turno: robar, pagar con el oro inicial, jugar un Aliado
    arrastrando, atacar desde el menú, voltear, mandar al Cementerio,
    devolver el oro y barajar.
- **Decisiones de la sesión:**
  - dentro de una fila **no hay posición libre**: la carta cae en el lugar
    de la fila que le toca según dónde se suelta (las zonas son listas
    ordenadas, como en el modelo). Basta para ordenar la mesa y es lo que
    después viaja por la red sin coordenadas;
  - la práctica **no se guarda**: recargar vuelve a elegir baraja.
- **Pasa a la sesión 8:** la revisión de accesibilidad de la mesa con
  `pnpm run a11y` (hoy la ruta está apagada en el build de siempre).

### Sesión 3: acciones con visibilidad y ayudas

- **Objetivo:** todo lo del DAR que depende de quién ve qué, todavía en local.
- **Hecha (24-11-2026).** El modelo, en `src/lib/mesa/`:
  - la mesa guarda el **turno** (número, jugador activo, fase y prioridad en
    la Guerra de Talismanes), lo **revelado** (lo que alguien mira, muestra
    o recorre para buscar, sin sacarlo de su zona) y el **registro** (las
    últimas 200 líneas);
  - `apply(mesa, accion, azar, por)` sabe **quién** hace cada acción y la
    rechaza si no le toca (`puede`): la mano y el Soporte son de su dueño, y
    también robar, hacer mulligan, barajar su Castillo y buscar. Lo que está
    en juego, botar del Castillo ajeno y mirarlo lo puede hacer cualquiera;
  - acciones nuevas: mirar, mostrar, devolverlas arriba en el orden elegido,
    abrir una búsqueda y tomar una carta o ninguna (en el Castillo **se
    baraja siempre**, también al fallar o al abandonar), barajar desde el
    Cementerio, fases, pasar turno, prioridad y moneda;
  - `vista.ts`: `vista(mesa, jugador)` deja sin carta lo que ese jugador no
    ve, y `esPublica` dice si lo ven los dos;
  - `registro.ts` arma la frase de cada línea; `avisos.ts`, el Castillo
    vacío y la mano de más de 8;
  - `vista.test.ts`: permisos, vista, que **el registro nunca nombra una
    carta oculta**, cada acción nueva, los avisos y el texto de cada línea.
- **La interfaz:**
  - el marcador de turno con las ocho fases en fila, «Siguiente fase» y
    «Pasar turno»;
  - la barra con Robar una, Barajar, Mulligan, Agrupar, Limpiar Fuerza y
    Lanzar moneda;
  - la franja ámbar de los avisos;
  - el menú del Castillo con Botar…, Mirar…, Mostrar…, Buscar y Buscar y
    mostrar (los «…» preguntan cuántas);
  - la ventana de mirar y mostrar, con flechas para reordenar, y la de
    buscar;
  - en el Cementerio y el Soporte, Buscar, y en el Cementerio, elegir cartas
    para barajarlas en el Castillo;
  - «Marcas…» en el menú de cada carta: contadores, Fuerza temporal y nota;
  - el **registro a un costado**, con la última línea anunciada para
    lectores de pantalla.
- **Decisiones de la sesión:**
  - los **uids se reparten después de barajar**: en el orden de la baraja,
    las copias de una carta tenían números seguidos, y en el 1v1 ver una
    dejaba adivinar las otras;
  - el registro guarda datos y no frases, y una carta va con su id **solo si
    los dos la ven**: esa es la regla que tiene que respetar lo que viaja;
  - un revelado deja de valer solo si sus cartas cambian de sitio (robar
    mientras se mira, por ejemplo);
  - el botón de la barra se llama «Robar una», porque la fase «Robar» del
    marcador también es un botón.

### Sesión 4: base y sala

- **Objetivo:** dos cuentas pueden encontrarse en una sala.
- **Hecha (24-11-2026).**
- **La base va en un archivo propio, `supabase/mesa.sql`** (decisión del
  proyecto): no toca ninguna tabla, política ni función de las cuentas y la
  Comunidad, y solo lee `perfiles` para mostrar el alias del rival. Se pega
  en el SQL Editor **después** de `esquema.sql` y aguanta volver a correrse.
  - Tablas `mesas` (jugadores, código, formato, mejor de 3 o 5, estado,
    listos, marcador, ganador y la señal de vida de cada uno),
    `mesas_publico` (la foto pública con su versión, para las sesiones 5 y
    6) y `mesas_privado` (una fila por jugador con su baraja elegida, que
    **solo su dueño lee**).
  - A `anon` y `authenticated` se les quitan los permisos que Supabase da
    por defecto a toda tabla nueva y se devuelve solo lo justo: las salas se
    leen, la fila privada propia se lee, se crea y se cambia.
  - Funciones: `crear_mesa`, `unirse_mesa`, `ver_mesa` (con el alias de los
    dos), `mis_mesas`, `marcar_lista` (pide la baraja guardada; con los dos
    listos la sala pasa a jugarse), `latido_mesa` y `salir_mesa` (el
    anfitrión la borra; el invitado deja su lugar).
  - Errores propios `MS001`…`MS006`, que el sitio traduce
    (`MENSAJE_ERROR_SALA`).
  - Tope de tres salas abiertas por persona; las abandonadas de más de un
    día se barren al crear otra. Desde el 27-11-2026, las que pasan **15
    minutos sin nadie conectado** (ver «Ajustes del 27-11-2026»).
- **`supabase/mesa.prueba.sql`** la prueba contra Postgres local con tres
  cuentas: B entra con el código, C no; **B no lee ni escribe la fila
  privada de A**; nadie cambia una sala a mano; tope de salas, salir y
  cerrar. Pasa dos veces seguidas sobre una base nueva.
- **El sitio:**
  - `src/lib/mesa/sala.ts`, con su test: el código (seis caracteres sin
    0, 1, I, L ni O) y la validación con Zod de todo lo que responde la
    base, alias del rival incluido;
  - `src/components/mesa/sala-api.ts`, que usa `api()` y `token()` de la
    nube **sin cambiarlos**;
  - `/mesa`: crear una sala (formato y serie), unirse con el código (o con
    el enlace `/mesa/?c=CÓDIGO`, que lo trae escrito) y las salas abiertas;
  - `/mesa/?s=<id>`: la sala, con «Copiar enlace», los dos jugadores, y la
    baraja de cada uno, que **tiene que cumplir en el formato de la sala**
    (`validateDeck`, con el índice de ese formato) y va a su fila privada.
    Por ahora pregunta por la sala cada 3 s y da la señal de vida cada
    20 s: el tiempo real llega en la sesión 5.
- **`e2e/sala.spec.ts`** (en `pnpm run e2e:mesa`): dos navegadores se
  encuentran en una sala, eligen baraja y quedan listos, y un tercero no
  entra. Las funciones de la sala se imitan dentro de la prueba, sin tocar
  `e2e/supabase-simulado.ts`.
- **Para encenderla falta pegar `supabase/mesa.sql` en Supabase.** Mientras
  `MESA_ACTIVA` esté apagada, nadie llega a esas tablas.
- **Pasa a la sesión 8:** `/privacidad` y la ayuda dirán lo que se guarda de
  las partidas cuando la mesa se encienda.

### Sesión 5: tiempo real

- **Objetivo:** los dos ven la misma mesa al instante.
- **Hecha (24-11-2026).**
- **Cómo viaja la mesa** (`src/lib/mesa/red.ts` y `sincronia.ts`, lógica
  pura con su test):
  - cada navegador prepara **su mitad** con la baraja de su fila privada y
    le manda al otro solo lo que se ve de ella; "a" junta las dos y publica
    la primera versión;
  - cada navegador sabe lo público y **las cartas de su baraja**, nada más:
    las del rival que no ve quedan con `cartaId: ""`;
  - lo que se publica sale de `publicar()`: una carta va con su id solo si
    la ven los dos. **Nunca viaja una carta oculta**;
  - lo que necesita una carta que este navegador no conoce (botar, mirar o
    mostrar el Castillo ajeno, mover una oculta del rival) va como
    **pedido**: lo hace el navegador del dueño, al instante, y publica el
    resultado. Lo que el rival mira se le manda **solo a él**
    (`privado`), y lo olvida al cerrar;
  - cada cambio sube la versión; si los dos publican la misma a la vez, gana
    la de "a" y "b" rehace su última acción encima;
  - todo lo que llega se valida con Zod y se revisa que la mesa sea
    coherente (cada carta en un solo lugar) antes de usarla.
- **El canal** es privado, `mesa:<id>`, con `@supabase/realtime-js`
  (2.119.2, cargado diferido solo en la mesa) y el protocolo JSON (`vsn
  1.0.0`, el probado en la sesión 0). La presencia dice si el rival está
  conectado.
- **`supabase/mesa.sql` suma las políticas del canal** sobre
  `realtime.messages` (solo los dos jugadores leen y escriben en
  `mesa:<id>`). **Hay que volver a pegarlo entero en el SQL Editor.** La
  prueba local las comprueba sobre una imitación de `realtime`.
- **La CSP:** `wss://` al host de Supabase **solo en las páginas de `/mesa`
  y solo en un build con la mesa encendida** (decisión del proyecto,
  24-11-2026). Con la mesa apagada, la CSP de todo el sitio sale igual que
  antes (comprobado: solo cambian los hashes de los scripts, como en cada
  publicación). `csp-hashes.mjs` lo escribe y `audit_build.py` lo exige.
- **El tablero es uno** (`TableroMesa.tsx`): lo usan la práctica y el 1v1.
  Con rival, su mitad va arriba en espejo (su Línea de Ataque frente a la
  propia), sus cartas giradas 180° y su mano en una franja de dorsos; la
  mesa llena el ancho y se recorre con el scroll. Su Castillo ofrece Botar,
  Mirar y Mostrar; su Cementerio y su Destierro se abren; su Soporte no. El
  registro nombra a cada jugador y dice «tu Castillo» al que lo sufre.
- **La sala, con los dos listos, es la mesa** (`MesaEnLinea.tsx`).
- **`e2e/sala.spec.ts`** imita Supabase Realtime (unirse, latidos,
  broadcast, presencia, y solo los dos jugadores entran al canal) sin tocar
  el simulador de siempre: dos navegadores ven la misma mesa, una carta
  jugada llega con su nombre, el rival bota y mira el Castillo ajeno, y
  **ningún estado que viajó lleva una carta oculta**.
- **Pasa a la sesión 6:** recargar ya arma la misma mitad (la semilla del
  barajado queda en `sessionStorage`) y recibe la mesa del rival si está
  conectado; falta guardarla en la base para que sobreviva aunque los dos
  se vayan.
- **Sabido, como el barajado:** un navegador modificado podría guardarse lo
  que miró del Castillo ajeno en vez de olvidarlo. Para jugar entre amigos
  alcanza (GAME.md §2).

### Sesión 6: guardar y reconectar

- **Objetivo:** recargar o perder la red no rompe la partida.
- **Hecha (24-11-2026).**
- **La foto pública se guarda en la base** (`mesas_publico`, con
  `guardar_mesa_publico`): 2 s después del último cambio y enseguida cada 10
  versiones. La guarda quien publicó el cambio, y **la base solo acepta una
  versión más alta** que la guardada, así que dos guardados cruzados no
  retroceden.
- **Lo privado de cada uno es su baraja y la semilla de su barajado**
  (`mesas_privado`, `{ baraja, semilla }`), y no la mesa entera: con la
  misma semilla se rearma la misma mitad, con las mismas cartas en los
  mismos uids, en cualquier pestaña o equipo. Antes la semilla vivía en
  `sessionStorage`.
- **Volver:** al entrar se lee la foto (validada y revisada como lo que
  llega por el canal) y se arranca desde ella; se saluda, y cada uno se
  queda con la versión más alta. Al volver la conexión (Realtime reintenta
  solo) se saluda y **se manda la mesa propia**, por si se jugó algo
  mientras no llegaba nada: el desempate de siempre deja a los dos iguales
  (`reconectar()` de `sincronia.ts`).
- **La cuenta regresiva:** con el rival fuera de la presencia, la mesa dice
  «Invitado se desconectó. Si no vuelve en 1:43, la serie es tuya». Cuenta
  desde la última señal del rival en la base y con la **hora de la base**
  (`ver_mesa` devuelve `ahora`), corrida por lo que pasó en el navegador
  desde la respuesta, para que un reloj desfasado no cambie nada
  (`restanteDeGracia` de `sala.ts`).
- **Reclamar por abandono** (`reclamar_abandono`): al llegar a cero, el
  navegador lo pide y **la base decide** con su hora; antes de tiempo
  responde `MS007` y se reintenta. Deja la sala `terminada`, con ganador y
  `motivo: abandono` (columna nueva de `mesas`), y **borra la partida** en el
  acto: la foto queda vacía y las filas privadas, borradas (sin historial,
  §2). `latido_mesa` no revive una sala terminada.
- **La sala terminada** dice «Ganaste la serie: Invitado abandonó» o
  «Perdiste la serie por abandono», con la vuelta a `/mesa`.
- **Hay que volver a pegar `supabase/mesa.sql` entero en el SQL Editor**
  (columna `motivo` y dos funciones nuevas). `mesa.prueba.sql` lo comprueba
  en local: guardar sube y nunca baja, una tercera cuenta no guarda,
  reclamar antes de tiempo falla, después se gana y se borra la partida.
- **`e2e/sala.spec.ts`** suma a su imitación la foto pública, las dos
  funciones y la salida de la presencia al cerrar un navegador, y dos
  pruebas: **recargar** a mitad de juego (la mesa vuelve igual y se sigue
  jugando) y **abandono** (A recarga sin rival y la mesa sale de la foto;
  con la señal de B envejecida a mano, A gana la serie, la partida se borra
  y B, al volver, ve que perdió).
- **Sabido:** si los dos se van a menos de 2 s de una jugada, esa jugada
  no llegó a guardarse y se pierde.
- **Pasa a la sesión 7:** declarar, confirmar y rendirse, que usan
  `motivo` (`rendicion`, `partidas`).

### Sesión 7: la serie

- **Objetivo:** jugar una serie completa.
- **Hecha (24-11-2026).**
- **Terminar un juego** («Terminar juego», en la cabecera de la mesa,
  `DialogoResultado.tsx`): **Gané, Perdí o Empate** declaran el resultado
  (`declarar_resultado`, que guarda el lado ganador o `empate`), y quien
  declaró puede corregirse mientras el otro no responde. El otro ve «Anfitrión
  declara que ganó este juego. ¿Estás de acuerdo?» y responde
  (`responder_resultado`): **de acuerdo** suma al marcador; **no** anula el
  juego (con una confirmación ámbar), que se juega de nuevo sin sumar.
  **Rendirse** (`rendirse`) da el juego al rival en el acto.
- **Lo decide la base:** `cerrar_juego` (que no se llama desde la API) suma,
  y si alguien llegó a las victorias de la serie (2 al mejor de 3, 3 al
  mejor de 5) la termina con `motivo` `partidas` o, si el juego que decidía
  terminó en rendición, `rendicion`, y borra la partida. Si no, la sala
  queda **entre juegos**. Un empate no suma, pero cuenta como juego jugado
  (columna `empates`); un anulado no cuenta.
- **El marcador** va en la cabecera de la mesa («Juego 2 · Tú 1 – 0
  Invitado») y entre juegos, en grande.
- **Entre juegos** (`EntreJuegos.tsx`): cómo terminó el último, y el
  **cambio con el Mazo de Soporte**, una carta por otra
  (`cambiarConSide` de `src/lib/mesa/serie.ts`): siempre 50 en el
  Castillo, sin tocar el oro inicial, y la baraja tiene que seguir
  cumpliendo en el formato de la sala para marcarse listo. Los cambios se
  guardan en la fila privada (`actual`, junto a `baraja` y `semilla`) y
  **siguen para los juegos siguientes**, con un botón para volver a la
  baraja guardada; **la baraja guardada no cambia**. «Contar 2 minutos»
  muestra el tiempo de torneo solo a quien lo pide.
- **El conteo del side** lo ve el rival en la mesa: la zona Mazo de Soporte
  muestra siempre su cuenta, y el cambio es uno por uno.
- **El juego siguiente:** con los dos listos, la base empieza una **ronda**
  nueva (`ronda`, que cuenta también los anulados) y deja la foto en
  blanco. Cada navegador arma su mitad con la baraja del side y una semilla
  de esa ronda (`semillaDeRonda`): baraja nuevo, oro inicial en la Reserva y
  mano de 8; el mulligan y el sorteo son los de siempre. La ronda va en cada
  mensaje del canal y en cada guardado (`guardar_mesa_publico` ahora la
  pide), así que nada del juego anterior se cuela en el siguiente.
- **Entre juegos no hay canal**: si la señal del rival tiene más de 45 s,
  corre la misma cuenta regresiva de 2 minutos y se reclama igual
  (`use-abandono.ts`, compartido con la mesa).
- **Hay que volver a pegar `supabase/mesa.sql` entero en el SQL Editor**
  (seis columnas nuevas en `mesas`, cuatro funciones, y `guardar_mesa_publico`
  cambia de argumentos). `mesa.prueba.sql` recorre dos series: empate,
  juego anulado, rendición y victoria por partidas, y que un guardado de una
  ronda no entre en la siguiente.
- **`e2e/sala.spec.ts`:** una serie al mejor de 3 de principio a fin: A
  declara que ganó y B confirma; B cambia una carta con su side; el juego 2
  sale con la baraja cambiada y el Soporte contado; A declara, B no está de
  acuerdo y el juego se anula; en la repetición B se rinde y A gana la serie
  2 – 0. La partida queda borrada.
- **De paso:** el selector de baraja de la sala (sesión 4) decía «Todos» en
  su opción vacía; ahora dice «Elige una baraja».
- **Pasa a la sesión 8:** probar en el navegador la cuenta regresiva entre
  juegos (la lógica es la de la mesa, ya probada).

### Sesión 8: pulido y publicación

- **Objetivo:** dejarla lista para encender.
- **Hecha (24-11-2026), y encendida.**
- **El interruptor está en el repo:** `src/lib/mesa/activa.json`, que leen
  `activa.ts`, `csp-hashes.mjs`, `audit_build.py` y las pruebas
  (`e2e/mesa-activa.ts`). `NEXT_PUBLIC_MESA_ACTIVA` lo pisa en un build de
  pruebas. `pnpm run e2e` corre ahora las pruebas de la mesa;
  `pnpm run e2e:mesa-apagada` construye y prueba con ella apagada.
- **Lo que suma al sitio, solo con la mesa encendida:**
  - el enlace **Mesa** en la navbar (pide cuenta). Con ocho enlaces no
    cabían a 1024 px (la cuenta se salía 25 px de la pantalla): se pliegan
    hasta `xl` y van sin icono hasta `2xl`;
  - la sección **«La mesa de juego»** de la ayuda;
  - lo que guarda y quién ve qué en `/privacidad`;
  - la Novedad 7.0.0.
- **Accesibilidad:** axe sin violaciones en los dos temas en `/mesa/`, la
  práctica con un menú abierto, la sala abierta, la mesa en línea,
  «Terminar el juego», el resultado declarado, entre juegos y la serie
  terminada (`@a11y` en `mesa.spec.ts` y `sala.spec.ts`; `/mesa/` y
  `/mesa/practica/` también en `accesibilidad.spec.ts`). No hubo nada que
  corregir.
- **Teclado:** una prueba juega la práctica sin ratón: Tab hasta una carta,
  Enter, flechas y Enter para mandarla a la Línea de Defensa; robar desde el
  menú del Castillo; mandar una carta al Cementerio y abrirlo; pasar de
  fase. Todo lo del arrastre está en los menús.
- **Las pruebas de lo que pedía el «terminado cuando»:**
  - la mano oculta (sesión 5);
  - **la búsqueda oculta en el 1v1**: el rival solo ve «Buscó una carta en
    su Castillo», y la entrada del registro tampoco viaja con la carta;
  - recargar (sesión 6);
  - el abandono, en juego (sesión 6) y **entre juegos**;
  - la serie completa al mejor de 3 (sesión 7).
- **Base:** `crear_mesa` borra también las series que se dejaron a medias,
  con las dos señales de hace más de un día (y su foto y sus filas
  privadas), para que «sin historial» valga aunque los dos se vayan para
  siempre. **Hay que volver a pegar `supabase/mesa.sql`.**
- **Documentación:** CLAUDE.md («La mesa de juego» en §9, la CSP, la
  auditoría, las rutas y la navbar) y `docs/cuentas.md` (las tablas, las
  funciones, cómo pegarlo, cómo moderar y cómo probarlo).

### Arreglos tras encender (25-11-2026)

- **«No se pudo conectar a la mesa», a veces y a los dos.** Era una carrera
  dentro de `@supabase/realtime-js`: `subscribe()` pide el token de la
  sesión en paralelo y arma el mensaje de unión sin esperarlo. Si el
  websocket abría antes, la unión salía **sin token**, Realtime la trataba
  como anónima y la política del canal privado la rechazaba.
  - **El arreglo:** `await rc.setAuth()` antes de crear el canal.
  - **Ahora la conexión se reintenta:** antes de tener mesa, hasta tres
    veces y después «Reintentar»; con la mesa en pantalla, sin límite y sin
    taparla («Reconectando…»).
  - **Las pruebas lo vigilan:** la imitación de Realtime de
    `e2e/sala.spec.ts` rechaza la unión sin token y cuenta las anónimas.
    Sin el arreglo contaba 2; con él, 0. Otra prueba hace fallar las dos
    primeras uniones y la mesa igual se conecta.
- **Y cada uno veía al otro desconectado, sin ningún error.** Era la CSP:
  solo las páginas de `/mesa` permiten el `wss://` del tiempo real
  (sesión 5), y la CSP la fija el documento que se **cargó**, no la ruta
  que se ve. Al llegar por el enlace «Mesa» de la navbar, o volviendo de
  Google a una sala, el router de Next cambia la URL sin cambiar de
  documento: la página seguía con la CSP del catálogo y el navegador
  bloqueaba el websocket en silencio. Quien abría el enlace de la sala
  directo sí conectaba; por eso «funcionaba a veces».
  - **El arreglo:** una sala abierta en un documento cargado fuera de
    `/mesa` se recarga sola una vez (`documento-de-la-mesa.ts`,
    `src/lib/mesa/documento.ts`, con su test). Se mantiene `wss://` solo
    en `/mesa`.
  - **Por qué las pruebas no lo vieron:** `pnpm run preview` no aplica
    `_headers`. Ahora `e2e/csp.ts` le pone a cada documento la CSP que le
    daría Cloudflare, con sus mismas reglas.
  - **La prueba nueva** entra a la sala por la navbar con esa CSP y exige
    que, al jugar, el documento sea de `/mesa` y su CSP traiga el
    `wss://`. Con el código anterior fallaba (documento `/catalogo/`).
    Como la imitación de Realtime reemplaza el WebSocket de la página y la
    CSP no la ve, se comprobó además a mano con un websocket de verdad:
    bloqueado por `connect-src` al llegar por la navbar, y permitido tras
    la recarga.
- **«Salir de la mesa» no cerraba la sala.** Era solo un enlace: la sala
  seguía abierta y contaba para el tope de tres. **Decisión del proyecto:
  dos botones.**
  - **«Salir por ahora»**: el enlace de siempre. La sala queda para
    volver, con los 2 minutos de gracia.
  - **«Abandonar la serie»**, en la mesa y entre juegos, con confirmación:
    `abandonar_mesa` le da la serie al rival, cierra la sala con el motivo
    nuevo `retiro` y borra la partida.
- **Hay que volver a pegar `supabase/mesa.sql`** (la función nueva y la
  restricción de `motivo`, que se reemplaza).

### Ajustes del 27-11-2026

- **Las salas sin nadie se cierran solas a los 15 minutos** (decisión del
  proyecto: 15 y no 30 ni 60). Antes duraban un día y solo se barrían al
  crear otra, así que las muertas seguían en «Tus salas abiertas» y
  ocupaban el tope de tres.
  - **Qué es «sin nadie»:** las dos señales de la sala (`senal_a`,
    `senal_b`) con más de 15 minutos. Mientras alguien tiene la sala
    abierta, `SalaDetalle` da un latido cada 20 s en todas sus etapas; con
    la pestaña en segundo plano Chrome lo espacia a uno por minuto, muy por
    debajo de 15.
  - **Quién barre:** `barrer_mesas()`, que no se llama desde la API. Corre
    al principio de `mis_mesas` (que pasa a ser `volatile`; el sitio ya la
    llamaba por POST), de `crear_mesa` y de `unirse_mesa`. Sin `pg_cron`: una
    sala muerta que nadie mira no se ve en ninguna parte.
  - Las **terminadas** siguen durando un día desde que se crearon, para que
    la pantalla de cierre se lea con calma.
  - No cambian los 2 minutos para reclamar un abandono: quien se queda
    mantiene viva la sala con su propio latido.
  - `mesa.prueba.sql` lo cubre: esperando y en juego sin nadie se borran;
    con uno adentro, o con señales de hace 10 minutos, se quedan. Contra el
    `mesa.sql` anterior falla.
- **La Mesa usa el ancho de las demás páginas** y su cabecera (eyebrow,
  título grande y párrafo gris). El título de la entrada es «Salas de
  juego», para no repetir «Mesa» bajo la palabra morada.
- **«Solitario»** comparte la fila con «Crear sala», mitad y mitad, al pie
  de la tarjeta «Crear una sala» (decisión del proyecto); reemplaza
  al enlace «O practica en solitario».
- **La sala y entre juegos tienen la cabecera del detalle de una baraja**
  (`CabeceraSala.tsx`): el eyebrow «Mesa» es el enlace de vuelta, el título
  lleva la pastilla del formato y las acciones van a su altura (copiar
  enlace y cerrar o salir; entre juegos, «Salir por ahora» y «Abandonar la
  serie»). Los jugadores son dos tarjetas y **la baraja se elige con las
  tarjetas de Mis barajas** (`TarjetaBaraja`, con `elegida` y
  `noDisponible` para las que no cumplen en el formato de la sala), como en
  la práctica; antes era un desplegable.
- **Hay que volver a pegar `supabase/mesa.sql`.**
