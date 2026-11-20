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
- **Desconexión:** hay un tiempo para volver a la mesa. Si se cumple sin que
  el jugador vuelva, **la serie entera es para el que siguió conectado** y la
  mesa se cierra. Recargar la página devuelve a la mesa tal como estaba.
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

## 3. Decisiones abiertas (se cierran en la sesión 0)

1. **Cuánto dura el tiempo de reconexión.** Algunos minutos; falta la cifra.
2. **Cómo se declara el resultado de un juego.** Propuesta: un jugador
   declara (gané, perdí o empate), el otro confirma, y rendirse es
   inmediato. ¿Qué pasa si no se ponen de acuerdo?
3. **Qué puede hacer el rival con el Castillo ajeno.** Por ejemplo, botar
   las cartas de arriba porque un efecto lo dice. Propuesta: lo pide, y el
   navegador del dueño lo resuelve (§5).
4. **El cliente de Realtime**: `@supabase/realtime-js` o un websocket propio
   sobre su protocolo. CLAUDE.md §7 pide no sumar el cliente completo de
   Supabase.
5. **Si las dos barajas tienen que ser del mismo formato** (Estándar, VCR o
   Infantería), y si tienen que ser legales para entrar.
6. **Si se guarda un historial de partidas** (quién jugó con quién, resultado
   y fecha) o la mesa se borra al terminar. Cambia lo que cuenta
   `/privacidad`.
7. **La consulta a la editorial**, antes de encender la mesa.
8. **Si barajar en el navegador del dueño basta.** El dueño podría hacer
   trampa: para jugar entre amigos alcanza; para torneos habría que barajar
   en la base.

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
    pedir el rival.
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

- Un canal de Supabase Realtime por mesa: **broadcast** para las acciones y
  **presencia** para saber quién está conectado (y mostrar la cuenta
  regresiva de la reconexión).
- Cada acción lleva la versión de la carta que toca. Si llega una acción
  sobre una versión vieja (los dos movieron la misma carta a la vez), se
  descarta y se vuelve a pedir la foto pública.
- Lo que el rival hace sobre zonas privadas ajenas (botar del Castillo) viaja
  como **pedido**: el navegador del dueño lo resuelve y publica lo que se
  revela.
- Requiere:
  - `wss://` al host de Supabase en `connect-src`, en `csp-hashes.mjs` y en
    la auditoría (`audit_build.py`);
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

- `/mesa`: crear una sala o unirse por código, y elegir baraja.
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
- **Tareas:**
  - cerrar las ocho decisiones abiertas y pasarlas a §2;
  - una prueba descartable: el cliente de Realtime en el build estático, con
    la CSP de `_headers`, dos pestañas mandándose mensajes por un canal;
  - medir el peso del cliente con gzip y decidir entre `realtime-js` y un
    websocket propio.
- **Terminado cuando:** §3 está vacía y la prueba confirma el cliente, la CSP
  y el peso. La prueba no se commitea.

### Sesión 1: modelo y reductor

- **Objetivo:** la mesa entera como datos, sin interfaz.
- **Tareas:**
  - tipos de la carta en mesa, las zonas y el estado público y privado;
  - la unión de acciones y `aplicar()`;
  - preparar un juego desde una baraja guardada: oro inicial a la Reserva,
    Castillo barajado, mano de 8;
  - mulligan, robar, botar, barajar, agrupar;
  - anexar (Portar), poner debajo, y contadores;
  - devolver a las zonas **del dueño** lo que sale del juego.
- **Archivos:** `src/lib/mesa/*.ts` y sus `*.test.ts`.
- **Terminado cuando:** los tests cubren cada acción, y una partida de
  ejemplo (preparar, robar, mover, agrupar, mandar al Cementerio) da el
  estado esperado.

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
  - `/mesa`: crear una sala (mejor de 3 o 5) y compartir su código o enlace;
    unirse; elegir baraja;
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
  - reclamar por abandono: pasado el tiempo de gracia, la serie para quien
    siguió conectado;
  - volver a la mesa tal como estaba al recargar.
- **Terminado cuando:** un e2e recarga a un jugador en medio de un juego y
  sigue, y otro lo desconecta del todo y la serie se cierra a favor del
  conectado.

### Sesión 7: la serie

- **Objetivo:** jugar una serie completa.
- **Tareas:**
  - declarar y confirmar el resultado de cada juego, y rendirse;
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
