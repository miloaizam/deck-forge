# Cuentas y Comunidad

DeckForge tiene cuentas con Google —obligatorias para armar y guardar barajas
y llevar la colección, que se sincronizan entre equipos— y una **Comunidad**
de barajas públicas con likes. Están **encendidas desde el 22-10-2026**.

Este documento tiene todo lo que hay que saber de ellas:

- [Qué hay configurado hoy](#qué-hay-configurado-hoy): los proyectos y las
  cuentas que las sostienen.
- [Cómo funciona por dentro](#cómo-funciona-por-dentro): la base, la sesión,
  la sincronización, la Comunidad, la seguridad y las pruebas.
- [Cómo se encendieron](#cómo-se-encendieron): los pasos 1 a 5, por si hay que
  repetirlos con otro proyecto.
- [Cómo moderar](#cómo-moderar), [mantener](#mantener) y
  [probar](#probar-la-sql-sin-supabase).

---

## Qué hay configurado hoy

| Qué | Dónde | Datos |
|---|---|---|
| Base de datos y Auth | Supabase, organización «Miguel Loaiza Organization», plan Free | proyecto `deck-forge-db`, región **South America (São Paulo)**, `https://bqxohtbmvxgezrsthcpu.supabase.co` |
| Inicio de sesión | Google Cloud, cuenta **`deck.forge.myl@gmail.com`** | proyecto `deck-forge`, Google Auth Platform «DeckForge», en producción, cliente web «DeckForge web» |
| Sitio | Cloudflare Pages | `https://deckforge-myl.pages.dev` |
| Lo que va al repo | [`supabase/proyecto.json`](../supabase/proyecto.json) | la Project URL y la **publishable key** (públicas por diseño) |

Lo que **no** está en el repo, y no debe estarlo: la contraseña de la base
(en el gestor de contraseñas del dueño del proyecto), la secret key de
Supabase y el Client secret de Google (pegado solo en Supabase →
Authentication → Sign In / Providers → Google).

Configuración que hay que mantener alineada entre los tres:

- **Google → Clientes → DeckForge web**: orígenes `https://deckforge-myl.pages.dev`
  y `http://localhost:3000`; redirección
  `https://bqxohtbmvxgezrsthcpu.supabase.co/auth/v1/callback`. Permisos: solo
  `openid`, `userinfo.email` y `userinfo.profile`. **Sin logo** (con logo,
  Google exige verificación). Dominios autorizados `deckforge-myl.pages.dev` y
  `bqxohtbmvxgezrsthcpu.supabase.co`; página principal y política de
  privacidad (`/privacidad/`) en «Información de la marca».
- **Supabase → Authentication → URL Configuration**: Site URL
  `https://deckforge-myl.pages.dev`; Redirect URLs `…/cuenta/` del sitio, de
  sus vistas previas (`https://*.deckforge-myl.pages.dev/cuenta/`) y de
  `localhost:3000` y `localhost:4173`. El proveedor **Email está apagado**:
  solo se entra con Google.
- **Al crear el proyecto de Supabase** se dejó «Automatically expose new
  tables» apagado y el RLS automático encendido. `esquema.sql` da los permisos
  a mano, así que no depende de esas casillas.

---

## Cómo funciona por dentro

### La idea

El sitio sigue siendo **estático**: no hay servidor nuestro. El navegador habla
directo con Supabase —su API REST (PostgREST) y su Auth— y lo que protege los
datos son las **reglas de la base**: RLS por fila y funciones `security
definer` para lo público. El código que corre en el navegador es solo
interfaz; aunque alguien lo modifique, la base no le deja leer ni escribir lo
que no es suyo.

### Qué se guarda

**Solo ids y copias; el catálogo nunca entra a la base.** Las cartas viven en
`/data/cards.json`, estático, y el navegador las resuelve por id.

| Tabla | Una fila por | Qué lleva |
|---|---|---|
| `perfiles` | usuario | el **alias** público (3–20 letras, números o `_`; único sin distinguir mayúsculas); `avatar` (bigint, ms en que se subió la foto, o null) y `avatar_oculto` (moderación) |
| `barajas` | baraja | `datos` (jsonb): la baraja tal como la guarda el navegador (`deckSchema`: nombre, nota, `principal`/`side` como `{ id, n }`, oro inicial, portada, fechas); `actualizado` (ms); `borrada` (lápida); lo público: `publica`, `publicada_en`, `public_id` (uuid, va en la URL), `afinidad`, `oculta`, `likes`, `copias`; y `nombre`/`portada` calculados del jsonb |
| `colecciones` | usuario | `datos` = `{ cartas: { id: copias }, quiero: { id: copias } }` y `actualizado` |
| `likes`, `copias`, `reportes` | usuario × baraja pública | uno por persona; los reportes con `motivo` (`nombre`, `nota`, `foto`, `spam`, `otro`) y una nota de hasta 280 |

**La foto de perfil no va en la base sino en Storage** (23-10-2026): un bucket
**público**, `avatares`, con un archivo por usuario, `avatares/<user_id>`, sin
extensión (el tipo va en el `Content-Type`). El navegador la recorta al
cuadrado del centro y la achica a **128×128** antes de subirla
(`src/components/nube/achicar-avatar.ts`): WebP, o JPEG si el navegador no sabe
codificar WebP; queda en ~5–10 KB, así que el GB gratuito de Storage da para
unas 100.000. El bucket acepta solo `image/webp` e `image/jpeg` de hasta **50
KB**, aunque alguien llame a la API a mano. Las políticas de
`storage.objects` dejan a cada usuario ver, subir, cambiar y borrar solo el
suyo (`name = auth.uid()::text`); la lectura pública la da el bucket. En
`perfiles.avatar` va cuándo se subió (ms), que la URL lleva como `?v=` para
saltar la caché al cambiarla: `<url>/storage/v1/object/public/avatares/<user_id>?v=<ms>`.
Hace falta un alias para ponerla: los dos viven en la misma fila.

Subir una foto pisa el archivo en la **misma ruta** y después cambia la
versión, así que entre los dos pasos la URL vieja sirve la foto nueva. Por eso
`subirAvatar` baja antes la foto de ahora, reintenta el cambio de versión hasta
tres veces y, si no entra, **vuelve a subir la anterior** (o borra el archivo
si no había): perfil y archivo siempre coinciden. Y el archivo se sube con una
caché de **una hora**, no de un año, para que una mezcla que se cuele en esos
segundos no dure.

Una baraja pesa 1–2 KB y una colección unos KB: el plan gratuito (500 MB) da
para cientos de miles. Todas las tablas cuelgan de `auth.users` con `on
delete cascade`: borrar la cuenta borra todo lo suyo.

### Las reglas de la base (`supabase/esquema.sql`)

- **Permisos de tabla explícitos**: `authenticated` puede leer, crear y
  actualizar sus filas de `perfiles`, `barajas` y `colecciones`, pero **no
  borrarlas** (una baraja se borra con una lápida, y el perfil se va con la
  cuenta): sin eso, borrar el perfil y volver a crearlo le quitaba la
  moderación a la foto. `anon` nada; `likes`, `copias` y `reportes` no los
  toca nadie desde la API.
- **RLS**: cada usuario solo ve y escribe sus filas (`user_id = auth.uid()`).
- **Trigger `barajas_proteger`**: desde el sitio el dueño no puede cambiar
  `oculta`, los contadores, el `public_id` ni la `publicada_en` de una que ya
  era pública (ordena «Más recientes»); topa en **50 barajas vivas** y 500
  filas por usuario, lápidas incluidas, pero al llegar a 500 purga las
  lápidas más viejas (`purgar_lapidas`, que solo alcanza las propias) en vez
  de rechazar; una baraja borrada pierde sus datos y deja de ser pública;
  para publicar hace falta alias. Distingue «el sitio» del panel por
  el **rol** (`authenticated`), no por la sesión, porque los contadores los
  suben funciones que corren como dueño de la base.
- **Funciones** (`security definer`, `search_path` vacío, permisos de
  ejecución dados a mano): `listar_publicas` (la lista, con sus cuatro
  órdenes, el orden por nombre `por_nombre` —que manda sobre ellos y ordena
  con la intercalación `es-x-icu`, para que «Águilas» no quede tras la Z—,
  filtro y búsqueda), `leer_publica` (una baraja, con `mia` y
  `me_gusta`), `dar_like` (no a la propia), `registrar_copia`, `reportar` y
  `borrar_mi_cuenta`, más `cartas_destacadas` (la cinta de la portada; la
  única que escribe sin sesión, y solo su propio ranking). Las dos primeras y
  la última las puede llamar cualquiera; el resto, solo con sesión.
- Topes de tamaño en la base: 32 KB por baraja, 256 KB por colección.
- Se puede volver a correr entero sin romper nada: así se aplica una versión
  nueva.

### El código

| Archivo | Qué hace |
|---|---|
| `src/lib/supabase-config.ts` | lee `supabase/proyecto.json` (o `NEXT_PUBLIC_SUPABASE_URL`/`_KEY` en un build de pruebas); `NUBE_ACTIVA` apaga todo si falta. Rechaza una clave que no sea publishable o anon |
| `src/lib/sync.ts` | la sincronización como lógica pura, con su test: valida las filas que llegan y decide qué escribir en cada lado |
| `src/lib/comunidad.ts` | órdenes, afinidad (`claveAfinidad`) y validación de lo que llega de la Comunidad, con su test |
| `src/components/nube/api.ts` | `fetch` a la API REST con `apikey` y, con sesión, el token; errores con un texto para el usuario |
| `src/components/nube/nube.ts` | el estado de la cuenta (store de módulo), la sesión con `@supabase/auth-js`, entrar, salir, borrar, el alias y cuándo sincronizar |
| `src/components/nube/sincronizar.ts` | una vuelta de sincronización (se carga al usarse) |
| `src/components/nube/comunidad-api.ts` | lista, baraja pública, like, copia, reporte, publicar |
| `RequiereCuenta.tsx`, `use-con-cuenta.ts` | el candado de lo personal y la navbar sin lo personal |
| `AccountButton`, `CuentaView`, `AliasForm`, `BotonGoogle`, `PortadaCuenta` | la cuenta en la navbar, `/cuenta` y la portada |
| `PublicarControl`, `PublicaAcciones`, `ReportarDialog`, `ComunidadView` | publicar, el detalle público y `/comunidad` |

**Solo `@supabase/auth-js`**, no el cliente completo `supabase-js`: el
completo trae tiempo real, archivos y funciones que el sitio no usa.

### La sesión

1. «Iniciar sesión con Google» (`entrar()`) carga `auth-js` y abre Google con **PKCE**.
   Antes guarda en `sessionStorage` (`deckforge-volver`) la página desde
   donde se pulsó.
2. Google vuelve a Supabase, y Supabase a **`/cuenta/?code=…`**: es la única
   vuelta que admiten las Redirect URLs. `auth-js` cambia el código por la
   sesión, `/cuenta` limpia la URL y, si había una página guardada, vuelve a
   ella (`tomarVuelta`, solo rutas propias). Si algo falla, `/cuenta` dice
   «No se pudo iniciar sesión con Google. Detalle: …» con el motivo que trajo
   la vuelta, y lo repite en la consola.

   **Ojo con `detectSessionInUrl`** (`nube.ts`). Que sea una función no
   significa «leer la URL en estas páginas»: `auth-js` la usa para reconocer
   una vuelta **implícita**. La primera versión decía que sí en todo `/cuenta`,
   así que el `?code=` se tomaba por implícito y, con PKCE, `auth-js` lo
   descartaba («Not a valid PKCE flow url»): Google volvía a `/cuenta` y no
   había sesión. Ahora solo reconoce los errores de la vuelta. El canje PKCE no
   pasa por esa función: lo decide `auth-js` al encontrar el verificador.
3. La sesión queda en `localStorage` bajo **`deckforge-sesion`** y `auth-js`
   renueva el token solo.
4. **Nada se descarga sin hacer falta**: `auth-js` se carga solo si existe
   `deckforge-sesion`, al volver de Google o al pulsar «Entrar». Un visitante
   sin cuenta no hace ninguna petición a Supabase fuera de la Comunidad y de
   la cinta de la portada (`rpc/cartas_destacadas`, sin nada del visitante).
5. Cerrar sesión primero sincroniza y, si lo pendiente llegó a la cuenta,
   **borra de este navegador** las barajas, la colección y el borrador del
   constructor, para que quien lo use después no los herede. Si no pudo
   subir (sin red), no borra nada y avisa: lo del navegador queda con el
   recuerdo de su cuenta (`deckforge-nube`), se sube cuando esa cuenta vuelve
   a entrar y, si entra otra, se borra antes de sincronizar. Lo que el
   navegador tenía de antes de tener cuenta (sin recuerdo) se suma a la
   primera que entre. «Borrar mi cuenta» también lo borra.

### Lo que pide cuenta

El constructor, Mis barajas, la colección y el detalle de una baraja propia
(`/baraja/?m=`) pasan por **`RequiereCuenta`**: sin sesión muestran «Inicia sesión para
…» y, si el navegador ya tenía barajas o colección, avisan que se suman a la
cuenta al entrar. La navbar no muestra esos tres enlaces sin cuenta
(`useConCuenta`). **No** piden cuenta el catálogo, los documentos, las
novedades, la Comunidad, una baraja compartida (`#d=`) o pública (`?p=`) ni
una colección compartida (`#c=`).

Es un candado **de interfaz**: el sitio es estático. Con una sesión guardada,
esas páginas se pintan de una, sin esperar a `auth-js`.

### La sincronización

Corre al entrar, unos 2 segundos después de cada guardado (escucha los stores
de barajas y colección, pero no lo que escribe otra pestaña) y al volver a la
pestaña si pasó más de un minuto. Son cuatro peticiones como mucho.

**Lo que cambia mientras viaja no se pisa.** La vuelta guarda lo que había al
empezar y, antes de escribir en el navegador, compara: si se guardó o borró
algo entretanto, no escribe y deja que la vuelta siguiente (que ese cambio ya
programó) junte todo. De las lápidas borra solo las que viajaron.

- **Por baraja gana el `actualizado` más nuevo.** Lo que está en un solo lado
  pasa al otro.
- **Un borrado deja una lápida** (`deckforge-borradas`, con su fecha): así otro
  equipo no revive una baraja borrada, y una edición posterior en otro equipo
  sí gana al borrado.
- **Nunca desplaza**: lo que llega de la nube entra solo si cabe bajo las 50;
  lo demás se queda en la nube. Al revés, lo mismo: una baraja que la cuenta
  no tiene viva sube solo si allá hay lugar bajo las 50 (contando los borrados
  de esa vuelta); las demás se quedan en el navegador, con un aviso. Sin eso,
  la base rechazaba el lote entero y no se volvía a sincronizar.
- **Nombres repetidos**: una que llega, o una cuya versión de la nube gana,
  con el nombre de otra del navegador queda como «X (copia)», y así sube.
- **La colección**: la primera vez que un navegador se une a una cuenta se
  **suman** (la cantidad mayor de cada carta); después gana la más reciente.
- `deckforge-nube` recuerda de qué cuenta es lo sincronizado, cuándo, el alias
  y lo público de cada baraja, para pintar Mis barajas sin esperar a la red.
- El borrador del constructor **no** viaja.
- Lo que llega de la nube se valida con Zod como cualquier entrada de afuera
  (`deckSchema`, `sanearColeccion`): una fila rota se ignora sin romper nada.

### La Comunidad

- **Publicar** está en el detalle de una baraja propia: «Privada / Pública».
  Solo baraja que **cumple** las reglas (`validateDeck`); la primera vez pide
  alias. Se guarda la **afinidad** (la vía más estrecha: raza, escuela o
  atributo) para listar y filtrar. Si la baraja se edita y deja de cumplir, se
  retira sola **al guardarla en el constructor**, con un aviso; si cambia de
  afinidad, se corrige. El detalle de la baraja repite la revisión por si la
  edición llegó de otro equipo (`revisarPublica` de `comunidad-api.ts`, una
  sola en curso por baraja). La sincronización no puede hacerla: no tiene el
  catálogo.
- **La portada de cada tarjeta** es la que eligió su dueño o, si no eligió,
  su Aliado con más copias (`portadaPorDefecto`, la misma regla que Mis
  barajas). Para eso `listar_publicas` devuelve también `principal`, las
  cartas de la baraja (solo ids y copias).
- **`/comunidad`**: cuatro órdenes (más likes, tendencia = likes de los
  últimos 7 días, más recientes, más copiadas), filtro por afinidad y buscador;
  todo en la URL. Se ve sin cuenta.
- **La cinta de la portada** muestra las 12 cartas más usadas en las barajas
  públicas. `cartas_destacadas()` guarda el ranking ya calculado en
  `destacadas` y `destacadas_estado` (sin permisos para nadie desde la API) y
  lo rehace como mucho una vez por hora: 80 ids, en cuántas barajas públicas
  y visibles de las últimas 8 semanas está cada una, y sobre cuántas barajas
  se contó. El sitio agrupa por carta y quita los Oros sin habilidad
  (`src/lib/destacadas.ts`); con menos de 10 barajas se queda con un grupo
  fijo. Más en CLAUDE.md, «La portada lleva una cinta de cartas».
- **El detalle público** es `/baraja/?p=<public_id>`: el alias, el like (uno
  por persona, no a la propia), «Guardar en mis barajas» (cuenta una copia por
  persona con sesión) y «Reportar».
- Lo que escribe otro jugador (alias, nombre, nota) se limpia de caracteres de
  control y se pinta siempre como texto.
- **La foto del dueño** sale junto al alias, en las tarjetas y en el detalle.
  `listar_publicas` y `leer_publica` la devuelven como ruta,
  `<user_id>?v=<ms>` (`ruta_avatar()`), o `null` si no hay o está oculta; el
  navegador la valida con una regex antes de armar la URL
  (`src/lib/avatar.ts`).

### Seguridad

- **CSP**: `connect-src` (la API) e `img-src` (las fotos de perfil) son los de
  siempre más **solo** el host de Supabase de `proyecto.json`. Lo agrega
  `scripts/csp-hashes.mjs`; `pnpm run audit` falla si cualquiera de los dos
  lleva otro, o si una clave secreta llega a `proyecto.json` o al build.
- La **publishable key** es pública por diseño; la seguridad es RLS. La secret
  key, la contraseña de la base y el Client secret de Google no entran nunca
  al repo.
- No se muestra la foto de Google (para no abrir `img-src` a sus servidores),
  ni el nombre ni el correo: solo el alias y la foto que el usuario sube.
- **Borrar la cuenta borra la foto antes**: Supabase no deja borrar archivos
  de Storage desde SQL, así que `borrarCuenta()` hace el `DELETE` del archivo
  por la API y después llama a `borrar_mi_cuenta`. Si ese `DELETE` falla, la
  cuenta se borra igual y el archivo queda **huérfano**: sin dueño, sin la
  versión en ningún perfil y sin ningún enlace que lo muestre. Se borra a mano
  desde **Storage → `avatares`** si aparece alguno.

### Pruebas

- `src/lib/sync.test.ts` y `src/lib/comunidad.test.ts` (en `pnpm run test`):
  gana el más reciente, lápidas, tope de 50 sin desplazar, choques de nombre,
  primera vez de la colección, filas rotas y texto hostil.
- `pnpm run e2e:nube`: el sitio construido contra un **Supabase simulado** en
  memoria (`e2e/supabase-simulado.ts`), en los tres dispositivos: la vuelta
  de Google de punta a punta (`/authorize` → `?code=` → canje PKCE, y la
  vuelta con error), entrar y juntar, publicar con alias, una ilegal no se publica, like, copia, reporte,
  moderación, cerrar sesión, lo que pide cuenta y lo que no, accesibilidad, la
  cinta de la portada (con ranking y con el grupo fijo), y que sin cuenta no
  salga ninguna petición fuera de la Comunidad y la cinta. Deja `out/` con ese build:
  después, `pnpm run build`.
- `pnpm run e2e` y `pnpm run a11y` entran con una cuenta de mentira
  (`entrarSimulado`), porque el constructor, Mis barajas y la colección la
  piden.
- La SQL, contra un Postgres local (abajo).
- **Desde la sesión de Claude en la nube no se llega a `supabase.co`** (el
  proxy lo bloquea): lo que toca el proyecto real se prueba en el navegador.

---

## Cómo se encendieron

Son unos 45–60 minutos. Hace falta una cuenta de Google y una de GitHub (o un
correo). **No cuesta dinero**: plan gratuito de Supabase y de Google Cloud, sin
tarjeta.

> **Datos públicos y datos secretos.** Al final hay dos datos que van al
> repo: la **Project URL** y la **publishable key** (o «anon key»). Son
> públicos por diseño: viajan dentro del sitio y cualquiera puede verlos; la
> seguridad la dan las reglas de la base de datos (RLS). **Nunca** van al
> repo, ni se pegan en un chat: la contraseña de la base de datos, la
> **secret key** (o «service_role key») de Supabase ni el **Client secret**
> de Google. `pnpm run audit` falla si una clave secreta llega al build.

---

### 1. Cuenta y proyecto de Supabase (~10 min)

1. Entrar a **supabase.com** → «Start your project» → registrarse con
   **GitHub** (lo más simple) o con correo.
2. Si pide una **organización**: nombre `DeckForge`, tipo «Personal», plan
   **Free**.
3. **New project**:
   - *Organization*: la tuya, plan **Free**.
   - *GitHub (optional)*: **no conectar**. Esa integración aplica migraciones
     con el formato de la CLI de Supabase, que este repo no usa: el esquema se
     pega a mano en el paso 2.
   - *Project name*: el que quieras (`deckforge`, `deck-forge-db`…).
   - *Database password*: «Generate a password» y **guardarla en un gestor de
     contraseñas**. El sitio no la usa; sirve para administrar la base.
   - *Region*: «Need a specific region?» y elegir **South America (São
     Paulo)**, la más cercana a Chile. «Americas» a secas puede caer en
     Estados Unidos. Si sale un aviso de incidente en la región, la creación
     puede fallar o tardar: reintentar más tarde.
   - *Security*:
     - **Enable Data API**: marcada (el sitio habla con la base por ahí).
     - **Automatically expose new tables**: **desmarcada**, como recomienda
       Supabase. `esquema.sql` da los permisos de cada tabla a mano, así que
       funciona igual con ella marcada o no.
     - **Enable automatic RLS**: marcada. El esquema ya activa RLS en cada
       tabla; esto lo asegura también para cualquier tabla futura.
   - Crear y esperar 1–2 minutos a que quede «Healthy».
4. **Los dos datos públicos**: menú lateral → **Project Settings** (el
   engranaje) → **Data API** (o «API»):
   - **Project URL**: algo como `https://abcdefghijklmn.supabase.co`.
   - En **API Keys**, la **publishable key** (`sb_publishable_…`). Si el panel
     muestra las claves antiguas, la **anon / public**. **No** la *secret* ni
     la *service_role*.

**La pausa del plan gratuito.** Si el proyecto pasa **7 días sin uso**,
Supabase lo pausa, y se reactiva con un clic en su panel. Mientras tanto el
sitio sigue funcionando con lo guardado en cada navegador: solo no sincroniza
y la Comunidad dice que no está disponible. Con jugadores entrando cada semana
no pasa.

### 2. Tablas y reglas de seguridad (~5 min)

1. Abrir [`supabase/esquema.sql`](../supabase/esquema.sql) en GitHub y
   copiarlo entero.
2. Supabase → **SQL Editor** → «New query» → pegar → **Run**. Debe decir
   «Success. No rows returned». Se puede volver a correr sin romper nada: así
   se aplica también una versión nueva del archivo.
3. **Table Editor**: tienen que aparecer `perfiles`, `barajas`,
   `colecciones`, `likes`, `copias` y `reportes`, todas con el candado «RLS
   enabled».

Qué hace ese SQL, en simple: crea las tablas; les da a mano solo los permisos
que el sitio usa; activa RLS para que **cada
usuario solo pueda leer y escribir lo suyo**, y lo público se lea solo a
través de funciones que devuelven lo que se puede ver; pone topes (tamaño,
50 barajas, un like y un reporte por persona y baraja) para que nadie llene la
base ni infle el ranking; y agrega `borrar_mi_cuenta()`, que borra al usuario
y todo lo suyo cuando él lo pide.

### 3. Google (~20 min)

1. Entrar a **console.cloud.google.com** con tu cuenta de Google y aceptar los
   términos.
2. Selector de proyectos (arriba) → **New project** → `DeckForge` → Create, y
   dejarlo seleccionado.
3. Menú → **Google Auth Platform** (en paneles antiguos: «APIs & Services →
   OAuth consent screen») → «Get started»:
   - *App name*: `DeckForge`; *User support email*: tu correo.
   - *Audience*: **External**.
   - *Contact information*: tu correo. Aceptar y **Create**.
4. **Data Access** («Scopes»): solo `openid`, `.../auth/userinfo.email` y
   `.../auth/userinfo.profile`. Con solo esos, Google no pide verificación.
5. **Audience** → **Publish app**. Queda «In production»; en «Testing» solo
   podrían entrar hasta 100 cuentas agregadas a mano. **No subas logo**: el
   logo sí obliga a una verificación de Google.
6. **Clients** → **Create client**:
   - *Application type*: **Web application**; *Name*: `DeckForge web`.
   - *Authorized JavaScript origins*: `https://deckforge-myl.pages.dev` y
     `http://localhost:3000`.
   - *Authorized redirect URIs*:
     **`https://<tu-proyecto>.supabase.co/auth/v1/callback`** (la Project URL
     más `/auth/v1/callback`; Supabase la muestra lista para copiar en el
     paso 4).
   - Create → copiar **Client ID** y **Client secret**. El secret solo se pega
     en Supabase, en el paso siguiente.

### 4. Unir Google con Supabase (~5 min)

1. Supabase → **Authentication** → **Sign In / Providers** → **Google** →
   **Enable**. Pegar Client ID y Client secret. Revisar que la **Callback URL**
   que muestra sea idéntica a la de Google. **Save**.
2. **Authentication** → **URL Configuration**:
   - *Site URL*: `https://deckforge-myl.pages.dev`
   - *Redirect URLs* (una por una):
     - `https://deckforge-myl.pages.dev/cuenta/`
     - `https://*.deckforge-myl.pages.dev/cuenta/` (las vistas previas de
       Cloudflare)
     - `http://localhost:3000/cuenta/`
     - `http://localhost:4173/cuenta/`
3. **Sign In / Providers → Email**: desactivar «Enable Email provider». Nadie
   debe crear cuentas por correo: el sitio solo ofrece Google.

### 5. Encender

Escribir los dos datos públicos en
[`supabase/proyecto.json`](../supabase/proyecto.json):

```json
{
  "url": "https://abcdefghijklmn.supabase.co",
  "key": "sb_publishable_…"
}
```

Y luego `pnpm run build && pnpm run audit`: la auditoría tiene que decir
«Cuentas encendidas: connect-src solo a https://…supabase.co». Con el push a
`main`, Cloudflare publica el sitio con la cuenta y la Comunidad a la vista.

**Antes de anunciarlo, la prueba de punta a punta** (la parte de Google solo
la puede hacer una persona):

1. Iniciar sesión con Google en el computador, elegir alias, armar y publicar una
   baraja legal.
2. En el teléfono, con la misma cuenta: aparecen las barajas y la colección.
3. Con una segunda cuenta de Google: ver la baraja en la Comunidad, darle
   like, guardarla y reportarla. El like, la copia y el reporte cuentan una
   sola vez.
4. En Supabase: ver el reporte en `reportes`, marcar `oculta` (abajo) y
   comprobar que la baraja sale de la Comunidad pero sigue en Mis barajas de
   su dueño, con «Oculta por moderación».
5. Desde una ventana sin sesión, la API no devuelve barajas privadas,
   colecciones, likes ni reportes de nadie.
6. «Borrar mi cuenta»: el usuario y sus filas desaparecen y los conteos bajan.

---

## Cómo moderar

Sin programar, desde el panel de Supabase:

- **Table Editor → `reportes`**: qué baraja se reportó (`baraja` es su
  `public_id`), el motivo (`nombre`, `nota`, `spam` u `otro`), la nota y la
  fecha.
- **Para ocultarla**: **Table Editor → `barajas`**, filtrar por `public_id` y
  marcar la casilla **`oculta`**. Sale de la Comunidad en el acto; su dueño la
  sigue viendo en Mis barajas con el aviso «Oculta por moderación» y no puede
  desmarcarla (un trigger lo impide desde el sitio). Para devolverla,
  desmarcar.
- Si un alias es ofensivo: **Table Editor → `perfiles`** y cambiarlo.
- **Si una foto es ofensiva** (llega como reporte con motivo `foto`): **Table
  Editor → `perfiles`**, la fila del dueño de la baraja (`barajas.user_id`), y
  marcar **`avatar_oculto`**. Deja de verse en la Comunidad en el acto y el
  dueño no puede desmarcarla; si sube otra, tampoco se ve. Para borrar además
  el archivo: **Storage → `avatares`**, el que se llama como su `user_id`.

## Probar la SQL sin Supabase

`supabase/esquema.sql` se probó contra un Postgres 16 local, con un esquema
`auth` mínimo que imita el de Supabase (la tabla `auth.users`, la función
`auth.uid()` leyendo `request.jwt.claim.sub` y los roles `anon` y
`authenticated`). Para repetirlo tras un cambio:

```sql
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
```

Para las fotos hace falta además un `storage` de imitación (en Supabase ya
existe):

```sql
create schema storage;
create table storage.buckets (id text primary key, name text not null,
  public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id), name text, owner uuid,
  unique (bucket_id, name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
```

Luego se corre el esquema (dos veces: tiene que aguantar volver a correrse) y
se actúa como un usuario con `set role authenticated; select
set_config('request.jwt.claim.sub', '<uuid>', false);`.

La interfaz se prueba aparte, contra un Supabase simulado:
`pnpm run e2e:nube` construye el sitio apuntando a
`https://prueba.supabase.co` y corre `e2e/nube.spec.ts`, que intercepta esas
peticiones (`e2e/supabase-simulado.ts`). Deja `out/` con ese build: después,
`pnpm run build` normal.

---

## Mantener

- **La pausa del plan gratuito.** Si el proyecto pasa 7 días sin uso,
  Supabase lo pausa: el sitio sigue funcionando con lo guardado en cada
  navegador, pero no sincroniza y la Comunidad dice que no está disponible. Se
  reactiva con «Restore project» en el panel.
- **Cambiar el esquema**: editar `supabase/esquema.sql`, probarlo contra el
  Postgres local (dos veces seguidas) y pegarlo entero en el SQL Editor. Si
  agrega una tabla, darle sus permisos a mano en la sección «Permisos de las
  tablas», como las demás. **Si cambia los parámetros de una función**, el
  esquema la borra antes (`drop function if exists` con la firma vieja):
  `create or replace` con otros parámetros crearía una segunda función al
  lado y la API no sabría a cuál llamar. Así se hizo al sumar `por_nombre`
  a `listar_publicas` (23-10-2026). Mientras el esquema nuevo no se pegue en
  Supabase, el sitio sigue listando con el orden de siempre: el parámetro
  solo se manda cuando el orden por nombre está puesto.
- **Apagar las cuentas**: `url` y `key` en `null` en `proyecto.json`. El sitio
  vuelve a funcionar sin cuenta (nada pide entrar) y la auditoría vuelve a
  exigir `connect-src 'self'`. Quitar también la sección de la cuenta de
  `faq.ts`.
- **Cambiar de dominio**: el dominio nuevo va en Google (orígenes, dominios
  autorizados y la página de la marca), en Supabase (Site URL y Redirect URLs)
  y en `SITE_URL` de `src/app/layout.tsx`.
- **Cambiar la clave pública** (si Supabase la rota): la nueva va en
  `proyecto.json`, y build y push.
- **Si alguien no puede entrar**:
  - «redirect_uri_mismatch» de Google: la URL de redirección del cliente de
    Google no es idéntica a la Callback URL de Supabase.
  - Vuelve al sitio pero sin sesión: leer el «Detalle» que muestra `/cuenta`
    (o la consola) y el registro de Supabase (Logs → Auth). «Unable to
    exchange external code» es el Client ID o el Client secret de Google mal
    copiados en Supabase. Si vuelve a la portada y no a `/cuenta`, falta su
    dirección en las Redirect URLs (cada una termina en `/cuenta/`).
  - «Esta app no está verificada» o solo entran algunas cuentas: la app de
    Google quedó en «Prueba» en vez de «En producción», o se le agregó un logo
    o un permiso sensible.
