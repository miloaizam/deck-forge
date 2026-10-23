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
  motivo text not null check (motivo in ('nombre', 'nota', 'spam', 'otro')),
  nota text not null default '' check (length(nota) <= 280),
  creado timestamptz not null default now(),
  primary key (user_id, baraja)
);

-- ---------------------------------------------------------------------------
-- Permisos de las tablas
--
-- Explicitos, para no depender de la casilla «Automatically expose new
-- tables» del panel (Supabase recomienda dejarla apagada). Primero se quita
-- todo y despues se da solo lo que el sitio usa; RLS decide ademas que filas.
-- ---------------------------------------------------------------------------

revoke all on public.perfiles, public.barajas, public.colecciones,
  public.likes, public.copias, public.reportes from anon, authenticated;

grant select, insert, update, delete on public.perfiles to authenticated;
grant select, insert, update on public.barajas to authenticated;
grant select, insert, update on public.colecciones to authenticated;
-- likes, copias y reportes: nada. Solo las funciones de abajo, que corren
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
      if filas >= 500 then
        raise exception 'Demasiadas barajas guardadas.' using errcode = 'P0001';
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

-- La lista de la Comunidad. `orden`: likes, tendencia, recientes o copias.
-- `afinidad` exacta ('raza:Dragón') o null; `q` busca en el nombre.
-- La version anterior no tenia `por_nombre`: se borra, porque con los dos
-- parametros nuevos convivirian dos funciones y la API no sabria cual llamar.
drop function if exists public.listar_publicas(text, text, text, integer, integer);

create or replace function public.listar_publicas(
  orden text default 'likes',
  afinidad text default null,
  q text default null,
  desde integer default 0,
  cuantos integer default 24,
  -- 'asc' o 'desc': el boton A-Z del buscador. Manda sobre `orden`, que
  -- queda de desempate, igual que en el catalogo.
  por_nombre text default null
)
returns table (
  public_id uuid,
  nombre text,
  afinidad text,
  portada text,
  alias text,
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
    select b.public_id, b.nombre, b.afinidad, b.portada, p.alias, b.likes, b.copias,
      (select count(*)::integer from public.likes l
        where l.baraja = b.public_id and l.creado > now() - interval '7 days') as likes_semana,
      b.publicada_en
    from public.barajas b
    join public.perfiles p on p.user_id = b.user_id
    where b.publica and not b.oculta and not b.borrada
      and (listar_publicas.afinidad is null or b.afinidad = listar_publicas.afinidad)
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

-- Una baraja publica, con su contenido. `mia` y `me_gusta` dicen si es del
-- que pregunta y si ya le dio like (falso sin sesion).
create or replace function public.leer_publica(pid uuid)
returns table (
  public_id uuid,
  datos jsonb,
  afinidad text,
  alias text,
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
  select b.public_id, b.datos, b.afinidad, p.alias, b.likes, b.copias, b.publicada_en,
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

grant execute on function public.listar_publicas(text, text, text, integer, integer, text) to anon, authenticated;
grant execute on function public.leer_publica(uuid) to anon, authenticated;
grant execute on function public.dar_like(uuid, boolean) to authenticated;
grant execute on function public.registrar_copia(uuid) to authenticated;
grant execute on function public.reportar(uuid, text, text) to authenticated;
grant execute on function public.borrar_mi_cuenta() to authenticated;
