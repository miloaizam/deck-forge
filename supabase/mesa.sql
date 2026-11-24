-- =====================================================================
-- La mesa de juego 1v1 (GAME.md, sesion 4): salas, su estado y lo privado
-- de cada jugador.
--
-- Va APARTE de esquema.sql a proposito (decision del proyecto,
-- 24-11-2026): no toca ninguna tabla, politica ni funcion de las cuentas y
-- la Comunidad. Solo LEE `perfiles` para mostrar el alias del rival. Se
-- pega en el SQL Editor de Supabase despues de esquema.sql, y se puede
-- volver a correr entero sin romper nada.
--
-- Las reglas son las mismas que en esquema.sql: cada jugador lee lo suyo
-- por RLS, y todo lo que cambia una sala pasa por funciones security
-- definer, que revisan quien llama. `mesas` y `mesas_publico` no tienen
-- ninguna politica de escritura: desde la API no se tocan directo.
--
-- Errores propios (el campo `code` de la respuesta):
--   MS001  la sala no existe, ya esta completa o ya empezo
--   MS002  sin sesion
--   MS003  demasiadas salas abiertas
--   MS004  no eres jugador de esa sala
--   MS005  la sala ya empezo: no se puede salir asi
--   MS006  falta elegir la baraja
-- =====================================================================

create table if not exists public.mesas (
  id uuid primary key default gen_random_uuid(),
  -- Seis letras y numeros sin los que se confunden (0/O, 1/I/L).
  codigo text not null unique check (codigo ~ '^[A-HJ-KM-NP-Z2-9]{6}$'),
  formato text not null check (formato in ('estandar', 'vcr', 'infanteria')),
  mejor_de smallint not null check (mejor_de in (3, 5)),
  jugador_a uuid not null references auth.users (id) on delete cascade,
  jugador_b uuid references auth.users (id) on delete cascade,
  estado text not null default 'esperando'
    check (estado in ('esperando', 'jugando', 'entre_juegos', 'terminada')),
  -- Eligio una baraja que cumple en el formato de la sala.
  listo_a boolean not null default false,
  listo_b boolean not null default false,
  victorias_a smallint not null default 0,
  victorias_b smallint not null default 0,
  -- El ganador de la serie, cuando termina.
  ganador uuid,
  -- La ultima senal de vida de cada uno (el latido).
  senal_a timestamptz not null default now(),
  senal_b timestamptz,
  creada timestamptz not null default now(),
  check (jugador_b is null or jugador_b <> jugador_a)
);

create index if not exists mesas_jugador_a on public.mesas (jugador_a);
create index if not exists mesas_jugador_b on public.mesas (jugador_b);

-- La foto de lo que ven los dos, con su version (sesiones 5 y 6).
create table if not exists public.mesas_publico (
  mesa uuid primary key references public.mesas (id) on delete cascade,
  version bigint not null default 0,
  estado jsonb not null default '{}'::jsonb,
  actualizada timestamptz not null default now()
);

-- Lo que solo ve cada jugador: la baraja elegida, y despues su mano y el
-- orden de su Castillo. Una fila por jugador, que SOLO su dueno lee.
create table if not exists public.mesas_privado (
  mesa uuid not null references public.mesas (id) on delete cascade,
  jugador uuid not null references auth.users (id) on delete cascade,
  estado jsonb not null default '{}'::jsonb,
  actualizada timestamptz not null default now(),
  primary key (mesa, jugador),
  -- Una baraja y una mano caben de sobra; esto solo frena un abuso.
  check (octet_length(estado::text) <= 262144)
);

alter table public.mesas enable row level security;
alter table public.mesas_publico enable row level security;
alter table public.mesas_privado enable row level security;

-- Supabase da todos los permisos sobre una tabla nueva a `anon` y a
-- `authenticated`: se quitan y se devuelve solo lo justo. Nada para quien
-- no tiene sesion; las salas, solo leerlas (las cambian las funciones); la
-- fila privada, leerla, crearla y cambiarla, nunca borrarla a mano.
revoke all on public.mesas, public.mesas_publico, public.mesas_privado
  from anon, authenticated;
grant select on public.mesas, public.mesas_publico to authenticated;
grant select, insert, update on public.mesas_privado to authenticated;

drop policy if exists mesas_leer on public.mesas;
create policy mesas_leer on public.mesas for select to authenticated
  using ((select auth.uid()) in (jugador_a, jugador_b));

drop policy if exists mesas_publico_leer on public.mesas_publico;
create policy mesas_publico_leer on public.mesas_publico for select to authenticated
  using (exists (
    select 1 from public.mesas m
    where m.id = mesa and (select auth.uid()) in (m.jugador_a, m.jugador_b)
  ));

drop policy if exists mesas_privado_leer on public.mesas_privado;
create policy mesas_privado_leer on public.mesas_privado for select to authenticated
  using (jugador = (select auth.uid()));

drop policy if exists mesas_privado_crear on public.mesas_privado;
create policy mesas_privado_crear on public.mesas_privado for insert to authenticated
  with check (
    jugador = (select auth.uid())
    and exists (
      select 1 from public.mesas m
      where m.id = mesa and (select auth.uid()) in (m.jugador_a, m.jugador_b)
    )
  );

drop policy if exists mesas_privado_cambiar on public.mesas_privado;
create policy mesas_privado_cambiar on public.mesas_privado for update to authenticated
  using (jugador = (select auth.uid()))
  with check (jugador = (select auth.uid()));

-- ---------------------------------------------------------------------
-- La sala, como la ve uno de sus jugadores: con el alias de los dos.
-- `null` si no existe o si quien pregunta no juega en ella.
-- ---------------------------------------------------------------------
create or replace function public.ver_mesa(p_mesa uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', m.id,
    'codigo', m.codigo,
    'formato', m.formato,
    'mejor_de', m.mejor_de,
    'estado', m.estado,
    'jugador_a', m.jugador_a,
    'jugador_b', m.jugador_b,
    'alias_a', pa.alias,
    'alias_b', pb.alias,
    'listo_a', m.listo_a,
    'listo_b', m.listo_b,
    'victorias_a', m.victorias_a,
    'victorias_b', m.victorias_b,
    'ganador', m.ganador,
    'senal_a', m.senal_a,
    'senal_b', m.senal_b,
    'creada', m.creada
  )
  from public.mesas m
  left join public.perfiles pa on pa.user_id = m.jugador_a
  left join public.perfiles pb on pb.user_id = m.jugador_b
  where m.id = p_mesa and auth.uid() in (m.jugador_a, m.jugador_b);
$$;

-- Las salas abiertas de quien pregunta, la mas nueva primero.
create or replace function public.mis_mesas()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(public.ver_mesa(m.id) order by m.creada desc), '[]'::json)
  from public.mesas m
  where auth.uid() in (m.jugador_a, m.jugador_b) and m.estado <> 'terminada';
$$;

-- ---------------------------------------------------------------------
-- Crear una sala: devuelve su id y su codigo. Antes barre las salas
-- abandonadas (esperando o terminadas hace mas de un dia) y topa en tres
-- salas abiertas por persona.
-- ---------------------------------------------------------------------
create or replace function public.crear_mesa(p_formato text, p_mejor_de int)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  yo uuid := auth.uid();
  letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  nuevo text;
  sala uuid;
begin
  if yo is null then
    raise exception 'sin sesion' using errcode = 'MS002';
  end if;
  if p_formato not in ('estandar', 'vcr', 'infanteria') or p_mejor_de not in (3, 5) then
    raise exception 'sala invalida' using errcode = '22023';
  end if;

  delete from public.mesas
  where (estado = 'esperando' or estado = 'terminada')
    and creada < now() - interval '1 day';

  if (select count(*) from public.mesas
      where yo in (jugador_a, jugador_b) and estado <> 'terminada') >= 3 then
    raise exception 'demasiadas salas' using errcode = 'MS003';
  end if;

  loop
    nuevo := '';
    for i in 1..6 loop
      nuevo := nuevo || substr(letras, 1 + floor(random() * length(letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.mesas where codigo = nuevo);
  end loop;

  insert into public.mesas (codigo, formato, mejor_de, jugador_a)
  values (nuevo, p_formato, p_mejor_de, yo)
  returning id into sala;
  insert into public.mesas_publico (mesa) values (sala);

  return json_build_object('id', sala, 'codigo', nuevo);
end;
$$;

-- ---------------------------------------------------------------------
-- Unirse con el codigo. Volver a entrar a una sala propia devuelve su id.
-- ---------------------------------------------------------------------
create or replace function public.unirse_mesa(p_codigo text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  yo uuid := auth.uid();
  m public.mesas;
begin
  if yo is null then
    raise exception 'sin sesion' using errcode = 'MS002';
  end if;
  select * into m from public.mesas where codigo = upper(trim(p_codigo)) for update;
  if not found then
    raise exception 'no disponible' using errcode = 'MS001';
  end if;
  if yo in (m.jugador_a, m.jugador_b) then
    return m.id;
  end if;
  if m.jugador_b is not null or m.estado <> 'esperando' then
    raise exception 'no disponible' using errcode = 'MS001';
  end if;
  if (select count(*) from public.mesas
      where yo in (jugador_a, jugador_b) and estado <> 'terminada') >= 3 then
    raise exception 'demasiadas salas' using errcode = 'MS003';
  end if;
  update public.mesas set jugador_b = yo, senal_b = now() where id = m.id;
  return m.id;
end;
$$;

-- ---------------------------------------------------------------------
-- Listo o no. Para estar listo hay que haber guardado la baraja en la fila
-- privada (que cumpla lo revisa el sitio: la base no tiene el catalogo).
-- Con los dos listos, la sala pasa a jugarse.
-- ---------------------------------------------------------------------
create or replace function public.marcar_lista(p_mesa uuid, p_lista boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  yo uuid := auth.uid();
  m public.mesas;
begin
  select * into m from public.mesas where id = p_mesa for update;
  if not found or yo is null or yo not in (m.jugador_a, coalesce(m.jugador_b, m.jugador_a)) then
    raise exception 'no eres jugador' using errcode = 'MS004';
  end if;
  if m.estado <> 'esperando' then
    raise exception 'ya empezo' using errcode = 'MS005';
  end if;
  if p_lista and not exists (
    select 1 from public.mesas_privado
    where mesa = p_mesa and jugador = yo and estado ? 'baraja'
  ) then
    raise exception 'sin baraja' using errcode = 'MS006';
  end if;

  if yo = m.jugador_a then
    update public.mesas set listo_a = p_lista where id = p_mesa;
  else
    update public.mesas set listo_b = p_lista where id = p_mesa;
  end if;

  update public.mesas set estado = 'jugando'
  where id = p_mesa and listo_a and listo_b and jugador_b is not null;
end;
$$;

-- La senal de vida de quien llama (GAME.md §2: dos minutos de gracia).
create or replace function public.latido_mesa(p_mesa uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.mesas
  set senal_a = case when jugador_a = auth.uid() then now() else senal_a end,
      senal_b = case when jugador_b = auth.uid() then now() else senal_b end
  where id = p_mesa and auth.uid() in (jugador_a, jugador_b);
$$;

-- ---------------------------------------------------------------------
-- Salir mientras se espera: quien la creo la borra; el invitado deja su
-- lugar libre (y su fila privada). Una vez empezada se sale rindiendose
-- (sesion 7).
-- ---------------------------------------------------------------------
create or replace function public.salir_mesa(p_mesa uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  yo uuid := auth.uid();
  m public.mesas;
begin
  select * into m from public.mesas where id = p_mesa for update;
  if not found or yo is null or yo not in (m.jugador_a, coalesce(m.jugador_b, m.jugador_a)) then
    raise exception 'no eres jugador' using errcode = 'MS004';
  end if;
  if m.estado <> 'esperando' then
    raise exception 'ya empezo' using errcode = 'MS005';
  end if;
  if yo = m.jugador_a then
    delete from public.mesas where id = p_mesa;
  else
    delete from public.mesas_privado where mesa = p_mesa and jugador = yo;
    update public.mesas
    set jugador_b = null, listo_b = false, senal_b = null
    where id = p_mesa;
  end if;
end;
$$;

revoke all on function public.ver_mesa(uuid), public.mis_mesas(),
  public.crear_mesa(text, int), public.unirse_mesa(text),
  public.marcar_lista(uuid, boolean), public.latido_mesa(uuid),
  public.salir_mesa(uuid)
  from public, anon;
grant execute on function public.ver_mesa(uuid), public.mis_mesas(),
  public.crear_mesa(text, int), public.unirse_mesa(text),
  public.marcar_lista(uuid, boolean), public.latido_mesa(uuid),
  public.salir_mesa(uuid)
  to authenticated;
