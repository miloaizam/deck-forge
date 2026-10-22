# Cuentas y Comunidad: cómo encenderlas

DeckForge tiene cuentas opcionales (entrar con Google, sincronizar barajas y
colección entre equipos) y una **Comunidad** de barajas públicas con likes. El
código ya está en el repo y queda **apagado** mientras
[`supabase/proyecto.json`](../supabase/proyecto.json) lleve `url` y `key` en
`null`. Esta guía es lo que hay que hacer, una sola vez, para encenderlo.

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

## 1. Cuenta y proyecto de Supabase (~10 min)

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

## 2. Tablas y reglas de seguridad (~5 min)

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

## 3. Google (~20 min)

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

## 4. Unir Google con Supabase (~5 min)

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

## 5. Encender

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

1. Entrar con Google en el computador, elegir alias, armar y publicar una
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

Luego se corre el esquema (dos veces: tiene que aguantar volver a correrse) y
se actúa como un usuario con `set role authenticated; select
set_config('request.jwt.claim.sub', '<uuid>', false);`.

La interfaz se prueba aparte, contra un Supabase simulado:
`pnpm run e2e:nube` construye el sitio apuntando a
`https://prueba.supabase.co` y corre `e2e/nube.spec.ts`, que intercepta esas
peticiones (`e2e/supabase-simulado.ts`). Deja `out/` con ese build: después,
`pnpm run build` normal.
