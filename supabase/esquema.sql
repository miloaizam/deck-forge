-- DeckForge: base de datos de las cuentas y la Comunidad.
--
-- Se corre UNA vez, entero, en el SQL Editor de Supabase (docs/cuentas.md,
-- paso A2). Se puede volver a correr: todo es "create ... if not exists" o
-- "create or replace", y las politicas se borran antes de crearse.
--
-- La base guarda solo ids y copias. Las cartas (nombre, texto, imagen) viven
-- en /data/cards.json, estatico, y el navegador las busca por id. Una baraja es
-- una fila con su `datos` en jsonb: el mismo objeto que el sitio guarda en
-- localStorage (deckSchema de src/lib/types.ts), con los ids de sus cartas.
--
-- Seguridad: RLS en todas las tablas. Cada usuario lee y escribe SOLO lo suyo.
-- Lo publico (la lista de la Comunidad, una baraja publica, dar like, guardar
-- una copia, reportar) pasa por funciones `security definer` que devuelven
-- solo las columnas que se pueden ver. likes, copias y reportes no tienen
-- ninguna politica: desde la API no se leen ni se escriben directo.

-- ---------------------------------------------------------------------------
-- Perfiles: el alias publico del jugador
-- ---------------------------------------------------------------------------

create table if not exists public.perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 3 a 20 letras, numeros o guion bajo; con tildes y enie.
  alias text not null check (alias ~ '^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,20}$'),
  creado timestamptz not null default now()
);

-- Sin distinguir mayusculas: "Milo" y "milo" son el mismo alias.
create unique index if not exists perfiles_alias_unico on public.perfiles (lower(alias));

-- La foto de perfil (22-10-2026). El archivo vive en Storage, en
-- `avatares/<user_id>`; aqui va solo cuando se subio (ms), que el sitio pone
-- en la URL como `?v=` para saltar la cache al cambiarla. null: sin foto.
alter table public.perfiles add column if not exists avatar bigint
  check (avatar is null or avatar > 0);
-- Moderacion: oculta la foto en la Comunidad. Solo se cambia desde el panel.
alter table public.perfiles add column if not exists avatar_oculto boolean
  not null default false;

-- ---------------------------------------------------------------------------
-- Barajas
-- ---------------------------------------------------------------------------

create table if not exists public.barajas (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- El id local de la baraja (10 letras y numeros), el mismo en cada equipo.
  id text not null check (id ~ '^[a-z0-9]{10}$'),
  -- La baraja como la guarda el sitio: ids de cartas y copias. null si borrada.
  datos jsonb check (datos is null or octet_length(datos::text) <= 32768),
  -- Milisegundos desde 1970, puestos por el navegador. Gana el mas nuevo.
  actualizado bigint not null check (actualizado >= 0),
  -- Lapida: una baraja borrada queda marcada para que otro equipo no la
  -- "reviva" al sincronizar.
  borrada boolean not null default false,
  -- Lo publico.
  publica boolean not null default false,
  publicada_en timestamptz,
  public_id uuid not null default gen_random_uuid() unique,
  -- Para listar y filtrar sin leer `datos`: los calcula la base del jsonb,
  -- salvo la afinidad, que necesita las cartas y la escribe el navegador.
  nombre text generated always as (left(datos ->> 'nombre', 60)) stored,
  portada text generated always as (left(datos ->> 'portada', 40)) stored,
  afinidad text check (afinidad is null or length(afinidad) <= 40),
  -- Moderacion: se marca a mano en el panel. El dueno no la puede cambiar.
  oculta boolean not null default false,
  -- Contadores que mantienen los triggers de likes y copias.
  likes integer not null default 0,
  copias integer not null default 0,
  primary key (user_id, id)
);

create index if not exists barajas_publicas_idx on public.barajas (publicada_en desc)
  where publica and not oculta and not borrada;

-- El formato de la baraja (27-10-2026): 'estandar', 'vcr' o 'infanteria'.
-- Sale del jsonb como el nombre; una baraja de antes de los formatos no lo
-- trae, y es Estandar.
alter table public.barajas add column if not exists formato text
  generated always as (left(coalesce(datos ->> 'formato', 'estandar'), 20)) stored;

-- ---------------------------------------------------------------------------
-- Coleccion: una fila por usuario
-- ---------------------------------------------------------------------------

create table if not exists public.colecciones (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- { cartas: { id: copias }, quiero: { id: copias } }
  datos jsonb not null check (octet_length(datos::text) <= 262144),
  actualizado bigint not null check (actualizado >= 0)
);

-- ---------------------------------------------------------------------------
-- Likes, copias y reportes: uno por persona y baraja
-- ---------------------------------------------------------------------------

create table if not exists public.likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  baraja uuid not null references public.barajas (public_id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (user_id, baraja)
);

create index if not exists likes_recientes_idx on public.likes (baraja, creado);

create table if not exists public.copias (
  user_id uuid not null references auth.users (id) on delete cascade,
  baraja uuid not null references public.barajas (public_id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (user_id, baraja)
);

create table if not exists public.reportes (
  user_id uuid not null references auth.users (id) on delete cascade,
  baraja uuid not null references public.barajas (public_id) on delete cascade,
  motivo text not null,
  nota text not null default '' check (length(nota) <= 280),
  creado timestamptz not null default now(),
  primary key (user_id, baraja)
);

-- Los motivos, aparte de la tabla para poder sumar uno sin recrearla: 'foto'
-- (la foto de perfil del dueno) llego con las fotos.
alter table public.reportes drop constraint if exists reportes_motivo_check;
alter table public.reportes add constraint reportes_motivo_check
  check (motivo in ('nombre', 'nota', 'foto', 'spam', 'otro'));

-- ---------------------------------------------------------------------------
-- Cartas destacadas de la portada
--
-- Las cartas que mas aparecen en las barajas publicas, ya calculadas: la
-- portada las lee en cada visita y la base no recorre las barajas cada vez.
-- Las recalcula `cartas_destacadas()` como mucho una vez por hora. Solo ids:
-- agrupar por carta y quitar los Oros lo hace el sitio, que tiene el catalogo.
-- ---------------------------------------------------------------------------

create table if not exists public.destacadas (
  carta text primary key,
  -- En cuantas barajas publicas esta.
  barajas integer not null
);

-- Una sola fila: cuando se calculo y sobre cuantas barajas.
create table if not exists public.destacadas_estado (
  unica boolean primary key default true check (unica),
  calculado timestamptz not null,
  barajas integer not null
);

-- ---------------------------------------------------------------------------
-- Permisos de las tablas
--
-- Explicitos, para no depender de la casilla «Automatically expose new
-- tables» del panel (Supabase recomienda dejarla apagada). Primero se quita
-- todo y despues se da solo lo que el sitio usa; RLS decide ademas que filas.
-- ---------------------------------------------------------------------------

revoke all on public.perfiles, public.barajas, public.colecciones,
  public.likes, public.copias, public.reportes,
  public.destacadas, public.destacadas_estado from anon, authenticated;

-- Sin `delete` en perfiles: borrar la fila y volver a crearla le quitaria la
-- moderacion de la foto (`avatar_oculto` nace en false). El sitio no lo
-- necesita; borrar la cuenta va por `borrar_mi_cuenta`, que corre como dueno.
grant select, insert, update on public.perfiles to authenticated;
grant select, insert, update on public.barajas to authenticated;
grant select, insert, update on public.colecciones to authenticated;
-- likes, copias, reportes y las destacadas: nada. Solo las funciones de abajo, que corren
-- como dueno de la base.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.perfiles enable row level security;
alter table public.barajas enable row level security;
alter table public.colecciones enable row level security;
alter table public.likes enable row level security;
alter table public.copias enable row level security;
alter table public.reportes enable row level security;
alter table public.destacadas enable row level security;
alter table public.destacadas_estado enable row level security;

drop policy if exists "perfil propio" on public.perfiles;
create policy "perfil propio" on public.perfiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "barajas propias" on public.barajas;
create policy "barajas propias" on public.barajas for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "coleccion propia" on public.colecciones;
create policy "coleccion propia" on public.colecciones for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- likes, copias y reportes: sin politicas. Solo las funciones de abajo.

-- ---------------------------------------------------------------------------
-- Triggers de barajas
-- ---------------------------------------------------------------------------

-- Lo que el dueno no puede tocar desde el sitio: la moderacion, los
-- contadores y el id publico. Se mira el ROL y no la sesion: desde la API se
-- escribe como `authenticated`; el panel de Supabase y las funciones
-- `security definer` de abajo (los contadores) corren como su dueno.
-- Borra las `cuantas` lapidas mas viejas del usuario que llama. La usa el
-- trigger de abajo, que corre como el usuario y no tiene `delete` sobre
-- barajas. Solo alcanza lo propio (`auth.uid()`) y solo lapidas: a lo sumo
-- un equipo que no se conecto en mucho tiempo revive una baraja vieja.
create or replace function public.purgar_lapidas(cuantas integer)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.barajas
  where (user_id, id) in (
    select user_id, id from public.barajas
    where user_id = (select auth.uid()) and borrada
    order by actualizado asc
    limit greatest(cuantas, 0)
  );
$$;

create or replace function public.barajas_proteger()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  vivas integer;
  filas integer;
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.oculta := false;
      new.likes := 0;
      new.copias := 0;
      new.public_id := gen_random_uuid();
      -- Un upsert tambien pasa por aqui aunque la fila exista: ese no suma.
      select count(*) filter (where not borrada), count(*) into vivas, filas
        from public.barajas where user_id = new.user_id and id <> new.id;
      if not new.borrada and vivas >= 50 then
        raise exception 'Ya hay 50 barajas guardadas, el maximo.' using errcode = 'P0001';
      end if;
      -- Las lapidas cuentan para el tope de filas (si no, se podrian crear
      -- sin fin), pero no traban: al llegar, se purgan las mas viejas.
      if filas >= 500 then
        perform public.purgar_lapidas(filas - 499);
        select count(*) into filas
          from public.barajas where user_id = new.user_id and id <> new.id;
        if filas >= 500 then
          raise exception 'Demasiadas barajas guardadas.' using errcode = 'P0001';
        end if;
      end if;
    else
      new.oculta := old.oculta;
      new.likes := old.likes;
      new.copias := old.copias;
      new.public_id := old.public_id;
      if old.borrada and not new.borrada then
        select count(*) into vivas from public.barajas
          where user_id = new.user_id and not borrada;
        if vivas >= 50 then
          raise exception 'Ya hay 50 barajas guardadas, el maximo.' using errcode = 'P0001';
        end if;
      end if;
    end if;
  end if;

  -- Una borrada no guarda nada ni sigue publica.
  if new.borrada then
    new.datos := null;
    new.publica := false;
    new.afinidad := null;
  end if;

  if new.publica then
    if new.datos is null then
      raise exception 'Una baraja sin datos no se puede publicar.' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.perfiles where user_id = new.user_id) then
      raise exception 'Elige un alias antes de publicar.' using errcode = 'P0001';
    end if;
    if tg_op = 'INSERT' or not old.publica then
      new.publicada_en := now();
    else
      -- Ya era publica: la fecha no la cambia nadie (ordena «Mas recientes»).
      new.publicada_en := old.publicada_en;
    end if;
  else
    new.publicada_en := null;
  end if;

  return new;
end;
$$;

drop trigger if exists barajas_proteger on public.barajas;
create trigger barajas_proteger before insert or update on public.barajas
  for each row execute function public.barajas_proteger();

-- Lo mismo para el perfil: el dueno no se quita la moderacion de su foto.
create or replace function public.perfiles_proteger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.avatar_oculto := false;
    else
      new.avatar_oculto := old.avatar_oculto;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists perfiles_proteger on public.perfiles;
create trigger perfiles_proteger before insert or update on public.perfiles
  for each row execute function public.perfiles_proteger();

-- Contadores de likes y copias. `security definer`: el usuario que da like no
-- puede escribir en la baraja de otro, pero el contador si tiene que subir.
create or replace function public.contar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  pid uuid := case when tg_op = 'INSERT' then new.baraja else old.baraja end;
begin
  if tg_table_name = 'likes' then
    update public.barajas set likes = greatest(0, likes + delta) where public_id = pid;
  else
    update public.barajas set copias = greatest(0, copias + delta) where public_id = pid;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_contar on public.likes;
create trigger likes_contar after insert or delete on public.likes
  for each row execute function public.contar();

drop trigger if exists copias_contar on public.copias;
create trigger copias_contar after insert or delete on public.copias
  for each row execute function public.contar();

-- ---------------------------------------------------------------------------
-- Funciones que llama el sitio
-- ---------------------------------------------------------------------------

-- Una baraja que se puede ver en la Comunidad.
create or replace function public.es_visible(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.barajas
    where public_id = pid and publica and not oculta and not borrada
  );
$$;

-- La ruta de la foto de un perfil dentro del bucket `avatares`, con la version
-- para la cache; null si no tiene o esta oculta. La usan las dos de abajo.
create or replace function public.ruta_avatar(uid uuid, avatar bigint, oculta boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when avatar is not null and not oculta
    then uid::text || '?v=' || avatar::text end;
$$;

-- La lista de la Comunidad. `orden`: likes, tendencia, recientes o copias.
-- `afinidad` exacta ('raza:Dragón') o null; `formato` exacto ('vcr') o null;
-- `q` busca en el nombre.
-- Las versiones anteriores se borran antes de crear la de hoy: sin
-- `por_nombre` convivirian dos funciones y la API no sabria cual llamar, y sin
-- `avatar` (o `principal`) cambia el tipo que devuelve, que `create or
-- replace` no acepta.
drop function if exists public.listar_publicas(text, text, text, integer, integer);
drop function if exists public.listar_publicas(text, text, text, integer, integer, text);
drop function if exists public.listar_publicas(text, text, text, integer, integer, text, text);

create or replace function public.listar_publicas(
  orden text default 'likes',
  afinidad text default null,
  q text default null,
  desde integer default 0,
  cuantos integer default 24,
  -- 'asc' o 'desc': el boton A-Z del buscador. Manda sobre `orden`, que
  -- queda de desempate, igual que en el catalogo.
  por_nombre text default null,
  formato text default null
)
returns table (
  public_id uuid,
  nombre text,
  afinidad text,
  formato text,
  portada text,
  -- Las cartas del principal (`[{ id, n }]`), para que el sitio elija una
  -- portada cuando no hay: su Aliado con mas copias. Solo ids y copias.
  principal jsonb,
  alias text,
  -- `<user_id>?v=<avatar>`, la ruta de la foto en el bucket `avatares`; null
  -- sin foto o con la foto oculta por moderacion.
  avatar text,
  likes integer,
  copias integer,
  likes_semana integer,
  publicada_en timestamptz,
  total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with visibles as (
    select b.public_id, b.nombre, b.afinidad, b.formato, b.portada, b.datos -> 'principal', p.alias,
      public.ruta_avatar(p.user_id, p.avatar, p.avatar_oculto) as avatar,
      b.likes, b.copias,
      (select count(*)::integer from public.likes l
        where l.baraja = b.public_id and l.creado > now() - interval '7 days') as likes_semana,
      b.publicada_en
    from public.barajas b
    join public.perfiles p on p.user_id = b.user_id
    where b.publica and not b.oculta and not b.borrada
      and (listar_publicas.afinidad is null or b.afinidad = listar_publicas.afinidad)
      and (listar_publicas.formato is null or b.formato = listar_publicas.formato)
      and (listar_publicas.q is null or b.nombre ilike
        '%' || replace(replace(replace(left(listar_publicas.q, 60), '\', '\\'), '%', '\%'), '_', '\_') || '%')
  )
  select v.*, count(*) over () as total
  from visibles v
  order by
    -- Con la intercalacion de Postgres para el espanol (ICU), no la de la base:
    -- con "C", «Águilas» quedaba detras de la Z.
    case when listar_publicas.por_nombre = 'asc' then v.nombre end collate "es-x-icu" asc,
    case when listar_publicas.por_nombre = 'desc' then v.nombre end collate "es-x-icu" desc,
    case listar_publicas.orden
      when 'tendencia' then v.likes_semana
      when 'copias' then v.copias
      when 'recientes' then 0
      else v.likes
    end desc,
    v.publicada_en desc,
    v.public_id
  offset greatest(0, desde)
  limit least(greatest(1, cuantos), 48);
$$;

-- Que barajas cuentan para las destacadas: publicas, visibles y publicadas o
-- editadas en las ultimas 8 semanas.
create or replace function public.cuenta_para_destacadas(
  publica boolean, oculta boolean, borrada boolean,
  publicada_en timestamptz, actualizado bigint)
returns boolean
language sql
stable
set search_path = ''
as $$
  select publica and not oculta and not borrada
    -- `actualizado` lo pone el navegador: se acota para que una fecha absurda
    -- no haga fallar el calculo de todos (to_timestamp tiene un rango).
    and greatest(publicada_en,
      to_timestamp(least(actualizado, 32503680000000) / 1000.0))
      > now() - interval '8 weeks';
$$;

-- Las cartas destacadas de la portada: las 80 que estan en mas barajas
-- publicas de las ultimas 8 semanas (publicadas o editadas), y sobre cuantas
-- barajas se conto (`total`), para que el sitio no muestre un ranking de tres
-- barajas. Si el calculo tiene mas de una hora lo rehace antes de responder;
-- con dos visitas a la vez, una recalcula y la otra lee el anterior.
--
-- Escribe, asi que no es `stable`: se llama con POST.
create or replace function public.cartas_destacadas()
returns table (carta text, barajas integer, total integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if coalesce((select e.calculado < now() - interval '1 hour'
               from public.destacadas_estado e), true)
     and pg_try_advisory_xact_lock(hashtext('deckforge.cartas_destacadas')) then
    delete from public.destacadas where true;
    insert into public.destacadas (carta, barajas)
      select x.id, count(distinct b.public_id)::integer
      from public.barajas b
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(b.datos -> 'principal') = 'array'
          then b.datos -> 'principal' else '[]'::jsonb end) as e (v)
      cross join lateral (select e.v ->> 'id' as id) x
      where public.cuenta_para_destacadas(b.publica, b.oculta, b.borrada,
          b.publicada_en, b.actualizado)
        and jsonb_typeof(e.v) = 'object' and x.id ~ '^[a-z]{2}-[0-9]{3}$'
      group by x.id
      order by 2 desc, 1
      limit 80;

    insert into public.destacadas_estado (unica, calculado, barajas)
      values (true, now(), (
        select count(*)::integer from public.barajas b
        where public.cuenta_para_destacadas(b.publica, b.oculta, b.borrada,
          b.publicada_en, b.actualizado)))
    on conflict (unica) do update
      set calculado = excluded.calculado, barajas = excluded.barajas;
  end if;

  return query
    select d.carta, d.barajas, e.barajas
    from public.destacadas d cross join public.destacadas_estado e
    order by d.barajas desc, d.carta;
end;
$$;

-- Una baraja publica, con su contenido. `mia` y `me_gusta` dicen si es del
-- que pregunta y si ya le dio like (falso sin sesion).
drop function if exists public.leer_publica(uuid);
create or replace function public.leer_publica(pid uuid)
returns table (
  public_id uuid,
  datos jsonb,
  afinidad text,
  alias text,
  avatar text,
  likes integer,
  copias integer,
  publicada_en timestamptz,
  mia boolean,
  me_gusta boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.public_id, b.datos, b.afinidad, p.alias,
    public.ruta_avatar(p.user_id, p.avatar, p.avatar_oculto),
    b.likes, b.copias, b.publicada_en,
    coalesce(b.user_id = (select auth.uid()), false),
    exists (select 1 from public.likes l
      where l.baraja = b.public_id and l.user_id = (select auth.uid()))
  from public.barajas b
  join public.perfiles p on p.user_id = b.user_id
  where b.public_id = pid and b.publica and not b.oculta and not b.borrada;
$$;

-- Dar o quitar like. Devuelve el conteo nuevo. No a una baraja propia.
create or replace function public.dar_like(pid uuid, si boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
  total integer;
begin
  if yo is null then
    raise exception 'Hace falta iniciar sesion.' using errcode = 'P0001';
  end if;
  if not public.es_visible(pid) then
    raise exception 'Esa baraja no esta publicada.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.barajas where public_id = pid and user_id = yo) then
    raise exception 'No puedes dar like a tu propia baraja.' using errcode = 'P0001';
  end if;
  if si then
    insert into public.likes (user_id, baraja) values (yo, pid) on conflict do nothing;
  else
    delete from public.likes where user_id = yo and baraja = pid;
  end if;
  select likes into total from public.barajas where public_id = pid;
  return total;
end;
$$;

-- Guardar una copia en mis barajas: cuenta una vez por persona.
create or replace function public.registrar_copia(pid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
begin
  if yo is null or not public.es_visible(pid) then
    return;
  end if;
  if exists (select 1 from public.barajas where public_id = pid and user_id = yo) then
    return;
  end if;
  insert into public.copias (user_id, baraja) values (yo, pid) on conflict do nothing;
end;
$$;

-- Reportar una baraja publica. Reportar otra vez reemplaza el motivo.
create or replace function public.reportar(pid uuid, motivo text, nota text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
begin
  if yo is null then
    raise exception 'Hace falta iniciar sesion.' using errcode = 'P0001';
  end if;
  if not public.es_visible(pid) then
    raise exception 'Esa baraja no esta publicada.' using errcode = 'P0001';
  end if;
  insert into public.reportes (user_id, baraja, motivo, nota)
    values (yo, pid, reportar.motivo, left(coalesce(reportar.nota, ''), 280))
    on conflict (user_id, baraja) do update
      set motivo = excluded.motivo, nota = excluded.nota, creado = now();
end;
$$;

-- Borra al usuario y, en cascada, todo lo suyo: perfil, barajas (y sus likes,
-- copias y reportes), coleccion, y los likes que dio (los conteos bajan).
create or replace function public.borrar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Hace falta iniciar sesion.' using errcode = 'P0001';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de las funciones
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.listar_publicas(text, text, text, integer, integer, text, text) to anon, authenticated;
grant execute on function public.leer_publica(uuid) to anon, authenticated;
grant execute on function public.cartas_destacadas() to anon, authenticated;
grant execute on function public.dar_like(uuid, boolean) to authenticated;
grant execute on function public.registrar_copia(uuid) to authenticated;
grant execute on function public.reportar(uuid, text, text) to authenticated;
grant execute on function public.borrar_mi_cuenta() to authenticated;
-- La llama el trigger de barajas, que corre como el usuario.
grant execute on function public.purgar_lapidas(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Fotos de perfil (Storage)
-- ---------------------------------------------------------------------------

-- Un bucket publico: cualquiera ve las fotos, que es lo que pide la
-- Comunidad. El tope de 50 KB y los dos tipos los hace cumplir Storage aunque
-- alguien llame a la API a mano; el sitio las sube de 128x128, en ~5-10 KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 51200, array['image/webp', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario sube, cambia y borra SOLO `avatares/<su user_id>`. La lectura
-- publica la da el bucket; esta de `select` hace falta para el upsert.
drop policy if exists "avatar propio: ver" on storage.objects;
create policy "avatar propio: ver" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and name = (select auth.uid())::text);

drop policy if exists "avatar propio: subir" on storage.objects;
create policy "avatar propio: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and name = (select auth.uid())::text);

drop policy if exists "avatar propio: cambiar" on storage.objects;
create policy "avatar propio: cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and name = (select auth.uid())::text)
  with check (bucket_id = 'avatares' and name = (select auth.uid())::text);

drop policy if exists "avatar propio: borrar" on storage.objects;
create policy "avatar propio: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and name = (select auth.uid())::text);
