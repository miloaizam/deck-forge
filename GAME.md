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

**Base** (`supabase/esquema.sql`, mismas reglas que lo ya existente: RLS y
funciones `security definer`, ver `docs/cuentas.md`):

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
- **Tareas:**
  - elegir una baraja guardada y preparar el juego;
  - dibujar las nueve zonas y escalar la mesa a la ventana;
  - arrastrar y soltar, apilar, voltear;
  - la mano abajo; el Castillo con robar y barajar;
  - menú contextual, y `CardModal` para ver una carta en grande;
  - el aviso de «solo escritorio» bajo `lg`.
- **Terminado cuando:** se puede jugar un turno completo moviendo cartas, y un
  e2e lo recorre.

### Sesión 3: acciones con visibilidad y ayudas

- **Objetivo:** todo lo del DAR que depende de quién ve qué, todavía en local.
- **Tareas:**
  - mirar N y mostrar N, y devolverlas arriba en el orden elegido;
  - «Buscar» y «Buscar y mostrar», con barajado al final;
  - barajar desde el Cementerio, mostrando las cartas;
  - contadores, modificador de Fuerza, nota y borrar las marcas temporales;
  - marcador de turno y fase, y botón «Agrupar»;
  - registro de acciones;
  - sorteo de quién comienza;
  - aviso de Castillo vacío y de más de 8 cartas en la mano.
- **Terminado cuando:** cada acción deja su línea en el registro y sus tests
  dicen qué es público y qué no.

### Sesión 4: base y sala

- **Objetivo:** dos cuentas pueden encontrarse en una sala.
- **Tareas:**
  - las tablas `mesas`, `mesas_publico` y `mesas_privado`, con RLS y
    funciones, probadas contra Postgres local como el resto del esquema
    (`docs/cuentas.md`);
  - `/mesa`: crear una sala (formato y mejor de 3 o 5) y compartir su código
    o enlace; unirse; elegir una baraja, que tiene que cumplir en el formato
    de la sala (`validateDeck`; la base guarda el formato y la mesa lo
    revisa al entrar);
  - todo lo que responde la base, validado con Zod (CLAUDE.md, seguridad #4).
- **Terminado cuando:** dos cuentas entran a la misma sala y el rival **no**
  puede leer la fila privada del otro (probado por SQL).

### Sesión 5: tiempo real

- **Objetivo:** los dos ven la misma mesa al instante.
- **Tareas:**
  - el canal por mesa, con broadcast y presencia;
  - mandar y aplicar acciones, con versiones y la vuelta a la foto si hay
    conflicto;
  - separar lo público de lo privado en lo que viaja; los pedidos sobre el
    Castillo ajeno;
  - la CSP con `wss://`, `csp-hashes.mjs` y la auditoría;
  - el simulador de Supabase de e2e (`e2e/supabase-simulado.ts`) con un canal
    de mentira.
- **Terminado cuando:** un e2e con dos contextos de navegador mueve cartas en
  uno y las ve en el otro, y **ningún mensaje lleva una carta oculta**.

### Sesión 6: guardar y reconectar

- **Objetivo:** recargar o perder la red no rompe la partida.
- **Tareas:**
  - guardar la foto pública y la privada de cada uno, cada cierta cantidad
    de acciones y al quedar quieta la mesa;
  - el latido y la cuenta regresiva a la vista;
  - reclamar por abandono: pasados los 2 minutos de gracia, la serie para quien
    siguió conectado;
  - volver a la mesa tal como estaba al recargar.
- **Terminado cuando:** un e2e recarga a un jugador en medio de un juego y
  sigue, y otro lo desconecta del todo y la serie se cierra a favor del
  conectado.

### Sesión 7: la serie

- **Objetivo:** jugar una serie completa.
- **Tareas:**
  - declarar y confirmar el resultado de cada juego, y rendirse; si no hay
    acuerdo, el juego se anula y se repite sin sumar al marcador;
  - el marcador y el fin de la serie;
  - entre juegos, el cambio con el side (0 a 10, siempre 50 en el
    Castillo), con su cuenta de 2 minutos si se quiere y el conteo que
    puede pedir el rival;
  - preparar el juego siguiente: barajar, oro inicial, mano nueva y sorteo.
  - La baraja guardada no cambia.
- **Terminado cuando:** dos cuentas juegan un mejor de 3 de principio a fin.

### Sesión 8: pulido y publicación

- **Objetivo:** dejarla lista para encender.
- **Tareas:**
  - a11y: alternativas de teclado al arrastre (el menú contextual alcanza
    para todo), y `pnpm run a11y` en la mesa;
  - e2e de los recorridos principales;
  - `faq.ts` con su sección de la mesa; `/privacidad` con lo que se guarda
    de las partidas, en el mismo commit; Novedad; CLAUDE.md y
    `docs/cuentas.md`;
  - encender `MESA_ACTIVA` si la editorial está de acuerdo.
- **Terminado cuando:** dos cuentas, en dos navegadores de escritorio, juegan
  una serie completa al mejor de 3 moviendo cartas:
  - ninguna ve la mano del otro;
  - una búsqueda oculta no revela la carta;
  - recargar la página devuelve a la mesa;
  - quien se desconecta y no vuelve a tiempo pierde la serie.
