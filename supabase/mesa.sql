-- =====================================================================
-- La mesa de juego 1v1 (GAME.md, sesion 4): salas, su estado y lo privado
-- de cada jugador.
--
-- Va APARTE de esquema.sql a proposito (decision del proyecto,
-- 24-11-2026): no toca ninguna tabla, politica ni funcion de las cuentas y
-- la Comunidad. Solo LEE `perfiles` para mostrar el alias del rival. Se
-- pega en el SQL Editor de Supabase despues de esquema.sql, y se puede
-- volver a correr entero sin romper nada (con cada sesion que lo cambie,
-- se vuelve a pegar entero).
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
--   MS007  todavia no pasan los dos minutos de gracia
--   MS008  no se esta jugando un juego
--   MS009  hay un resultado del rival esperando respuesta
--   MS010  no hay un resultado del rival que responder
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

-- Por que termino la serie (sesiones 6 y 7). Se agrega aparte para que
-- volver a pegar el archivo sobre una base que ya tiene la tabla la sume.
alter table public.mesas add column if not exists motivo text
  check (motivo in ('abandono', 'rendicion', 'partidas'));
-- 'retiro' (25-11-2026) es abandonar la serie a proposito; 'abandono', no
-- volver en dos minutos. La restriccion nacio con la columna: se reemplaza.
alter table public.mesas drop constraint if exists mesas_motivo_check;
alter table public.mesas add constraint mesas_motivo_check
  check (motivo in ('abandono', 'retiro', 'rendicion', 'partidas'));

-- La serie (sesion 7), tambien sumada aparte:
--   ronda      cuantos juegos se han empezado, anulados incluidos: separa la
--              foto y los mensajes de un juego de los del anterior;
--   empates    los juegos empatados, que no suman al marcador;
--   declara    quien declaro el resultado del juego en curso, y
--   declarado  lo que declaro: el lado que gano ('a' o 'b') o 'empate';
--   ultimo     como termino el ultimo juego ('a', 'b', 'empate' o 'anulado'),
--   rendido    y si fue porque alguien se rindio.
alter table public.mesas add column if not exists ronda smallint not null default 1;
alter table public.mesas add column if not exists empates smallint not null default 0;
alter table public.mesas add column if not exists declara uuid;
alter table public.mesas add column if not exists declarado text
  check (declarado in ('a', 'b', 'empate'));
alter table public.mesas add column if not exists ultimo text
  check (ultimo in ('a', 'b', 'empate', 'anulado'));
alter table public.mesas add column if not exists rendido boolean not null default false;

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
    'creada', m.creada,
    'motivo', m.motivo,
    'ronda', m.ronda,
    'empates', m.empates,
    'declara', m.declara,
    'declarado', m.declarado,
    'ultimo', m.ultimo,
    'rendido', m.rendido,
    -- La hora de la base: la cuenta regresiva no depende del reloj de cada uno.
    'ahora', now()
  )
  from public.mesas m
  left join public.perfiles pa on pa.user_id = m.jugador_a
  left join public.perfiles pb on pb.user_id = m.jugador_b
  where m.id = p_mesa and auth.uid() in (m.jugador_a, m.jugador_b);
$$;

-- ---------------------------------------------------------------------
-- Barrer las salas sin nadie (27-11-2026). Mientras alguien tiene la sala
-- abierta, el sitio da un latido cada 20 s; una sala sin terminar cuyas dos
-- senales tienen mas de 15 minutos se quedo sin jugadores y se borra, con su
-- foto y sus filas privadas (on delete cascade; sin historial, GAME.md §2).
-- Las terminadas duran un dia desde que se crearon, para leer el cierre.
-- No hay pg_cron: corre al abrir la Mesa (mis_mesas), al crear y al unirse.
-- Nadie la llama desde la API.
-- ---------------------------------------------------------------------
create or replace function public.barrer_mesas()
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.mesas
  where (estado <> 'terminada'
         and greatest(senal_a, coalesce(senal_b, senal_a)) < now() - interval '15 minutes')
     or (estado = 'terminada' and creada < now() - interval '1 day');
$$;

-- Las salas abiertas de quien pregunta, la mas nueva primero. Antes barre
-- las que se quedaron sin nadie: una sala muerta no se lista.
-- Escribe, asi que es volatile: el sitio la llama por POST.
create or replace function public.mis_mesas()
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  perform public.barrer_mesas();
  return (
    select coalesce(json_agg(public.ver_mesa(m.id) order by m.creada desc), '[]'::json)
    from public.mesas m
    where auth.uid() in (m.jugador_a, m.jugador_b) and m.estado <> 'terminada'
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Crear una sala: devuelve su id y su codigo. Antes barre las salas sin
-- nadie (barrer_mesas) y topa en tres salas abiertas por persona.
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

  perform public.barrer_mesas();

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
-- Antes barre: el codigo de una sala sin nadie ya no sirve.
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
  perform public.barrer_mesas();
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
-- Listo o no, antes del primer juego y entre juegos (sesion 7). Para estar
-- listo hay que haber guardado la baraja en la fila privada (que cumpla lo
-- revisa el sitio: la base no tiene el catalogo). Con los dos listos se
-- juega; desde el segundo juego, con una ronda nueva y la foto en blanco.
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
  if m.estado not in ('esperando', 'entre_juegos') then
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

  update public.mesas
  set estado = 'jugando',
      ronda = case when estado = 'entre_juegos' then ronda + 1 else ronda end,
      declara = null, declarado = null
  where id = p_mesa and listo_a and listo_b and jugador_b is not null
  returning * into m;
  if found and m.ronda > 1 then
    update public.mesas_publico set version = 0, estado = '{}'::jsonb, actualizada = now()
    where mesa = p_mesa;
  end if;
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
  where id = p_mesa and auth.uid() in (jugador_a, jugador_b) and estado <> 'terminada';
$$;

-- ---------------------------------------------------------------------
-- Salir mientras se espera: quien la creo la borra; el invitado deja su
-- lugar libre (y su fila privada). Una vez empezada, la serie termina
-- jugando, rindiendose en cada juego o por abandono.
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

-- ---------------------------------------------------------------------
-- Tiempo real (sesion 5): cada sala tiene su canal privado de Supabase
-- Realtime, `mesa:<id>`, y solo entran sus dos jugadores (GAME.md §2). Sin
-- estas politicas, cualquiera con la clave publica que supiera el nombre
-- del canal podria escucharlo. Van sobre `realtime.messages`, que existe en
-- Supabase; en un Postgres sin Realtime (la prueba local) se saltan.
-- ---------------------------------------------------------------------
create or replace function public.es_canal_de_mi_mesa(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mesas m
    where p_topic = 'mesa:' || m.id::text
      and auth.uid() in (m.jugador_a, m.jugador_b)
  );
$$;

do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists mesa_canal_leer on realtime.messages';
    execute 'create policy mesa_canal_leer on realtime.messages
      for select to authenticated
      using (public.es_canal_de_mi_mesa(realtime.topic()))';
    execute 'drop policy if exists mesa_canal_escribir on realtime.messages';
    execute 'create policy mesa_canal_escribir on realtime.messages
      for insert to authenticated
      with check (public.es_canal_de_mi_mesa(realtime.topic()))';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Guardar la foto publica (sesion 6), para volver a la mesa al recargar o
-- si se van los dos. Solo sube de version: dos guardados que se cruzan no
-- la hacen retroceder. Lo privado de cada uno (su baraja y la semilla de su
-- barajado) ya esta en su fila de mesas_privado.
-- ---------------------------------------------------------------------
-- La sesion 7 le sumo la ronda: se borra la version de tres argumentos.
drop function if exists public.guardar_mesa_publico(uuid, bigint, jsonb);
create or replace function public.guardar_mesa_publico(
  p_mesa uuid,
  p_ronda int,
  p_version bigint,
  p_estado jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  m public.mesas;
begin
  select * into m from public.mesas where id = p_mesa;
  if not found or auth.uid() is null or auth.uid() not in (m.jugador_a, coalesce(m.jugador_b, m.jugador_a)) then
    raise exception 'no eres jugador' using errcode = 'MS004';
  end if;
  -- Un guardado que llega tarde, de un juego que ya termino, no pisa nada.
  if m.estado <> 'jugando' or m.ronda <> p_ronda then
    return false;
  end if;
  if octet_length(p_estado::text) > 524288 then
    raise exception 'demasiado grande' using errcode = '22023';
  end if;
  update public.mesas_publico
  set version = p_version, estado = p_estado, actualizada = now()
  where mesa = p_mesa and version < p_version;
  return found;
end;
$$;

-- ---------------------------------------------------------------------
-- Reclamar por abandono (GAME.md §2): si el otro no da senales hace mas de
-- dos minutos, la serie entera es para quien reclama y la mesa se cierra.
-- Lo comprueba la base con su hora, no el navegador. Y como no hay
-- historial, lo de la partida se borra en el acto.
-- ---------------------------------------------------------------------
create or replace function public.reclamar_abandono(p_mesa uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  yo uuid := auth.uid();
  m public.mesas;
  senal_otro timestamptz;
begin
  select * into m from public.mesas where id = p_mesa for update;
  if not found or yo is null or m.jugador_b is null or yo not in (m.jugador_a, m.jugador_b) then
    raise exception 'no eres jugador' using errcode = 'MS004';
  end if;
  if m.estado not in ('jugando', 'entre_juegos') then
    raise exception 'no se esta jugando' using errcode = 'MS005';
  end if;
  senal_otro := case when yo = m.jugador_a then m.senal_b else m.senal_a end;
  if senal_otro is not null and senal_otro > now() - interval '2 minutes' then
    raise exception 'todavia no' using errcode = 'MS007';
  end if;
  update public.mesas
  set estado = 'terminada', ganador = yo, motivo = 'abandono'
  where id = p_mesa;
  update public.mesas_publico set estado = '{}'::jsonb, actualizada = now()
  where mesa = p_mesa;
  delete from public.mesas_privado where mesa = p_mesa;
end;
$$;

-- ---------------------------------------------------------------------
-- La serie (sesion 7, GAME.md §2): cada juego termina cuando uno declara el
-- resultado y el otro lo confirma, o cuando alguien se rinde. Si no hay
-- acuerdo, el juego se anula y se repite sin sumar.
--
-- `cerrar_juego` no se expone: la llaman las funciones de abajo, que ya
-- revisaron quien llama. Suma al marcador y, si alguien llego a las
-- victorias que pide la serie, la termina y borra la partida (sin
-- historial); si no, la sala queda entre juegos, con los dos sin listo.
-- ---------------------------------------------------------------------
create or replace function public.cerrar_juego(p_mesa uuid, p_ganador text, p_rendido boolean)
returns void
language plpgsql
volatile
set search_path = public
as $$
declare
  m public.mesas;
  necesarias int;
begin
  update public.mesas
  set victorias_a = victorias_a + case when p_ganador = 'a' then 1 else 0 end,
      victorias_b = victorias_b + case when p_ganador = 'b' then 1 else 0 end,
      empates = empates + case when p_ganador = 'empate' then 1 else 0 end,
      ultimo = p_ganador, rendido = p_rendido,
      declara = null, declarado = null,
      listo_a = false, listo_b = false,
      estado = 'entre_juegos'
  where id = p_mesa
  returning * into m;

  update public.mesas_publico set version = 0, estado = '{}'::jsonb, actualizada = now()
  where mesa = p_mesa;

  necesarias := m.mejor_de / 2 + 1;
  if m.victorias_a >= necesarias or m.victorias_b >= necesarias then
    update public.mesas
    set estado = 'terminada',
        ganador = case when m.victorias_a >= necesarias then m.jugador_a else m.jugador_b end,
        motivo = case when p_rendido then 'rendicion' else 'partidas' end
    where id = p_mesa;
    delete from public.mesas_privado where mesa = p_mesa;
  end if;
end;
$$;

-- Declarar el resultado del juego en curso: el lado que gano o 'empate'.
-- Quien declaro puede corregirse mientras el otro no responde.
create or replace function public.declarar_resultado(p_mesa uuid, p_ganador text)
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
  if not found or yo is null or m.jugador_b is null or yo not in (m.jugador_a, m.jugador_b) then
    raise exception 'no eres jugador' using errcode = 'MS004';
  end if;
  if p_ganador not in ('a', 'b', 'empate') then
    raise exception 'resultado invalido' using errcode = '22023';
  end if;
  if m.estado <> 'jugando' then
    raise exception 'no se esta jugando' using errcode = 'MS008';
  end if;
  if m.declara is not null and m.declara <> yo then
    raise exception 'responde primero' using errcode = 'MS009';
  end if;
  update public.mesas set declara = yo, declarado = p_ganador where id = p_mesa;
end;
$$;

-- Responder al resultado que declaro el otro: de acuerdo, o se anula.
create or replace function public.responder_resultado(p_mesa uuid, p_acepta boolean)
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
  if not found or yo is null or m.jugador_b is null or yo not in (m.jugador_a, m.jugador_b) then
    raise exception 'no eres jugador' using errcode = 'MS004';
  end if;
  if m.estado <> 'jugando' then
    raise exception 'no se esta jugando' using errcode = 'MS008';
  end if;
  if m.declara is null or m.declara = yo then
    raise exception 'nada que responder' using errcode = 'MS010';
  end if;
  if p_acepta then
    perform public.cerrar_juego(p_mesa, m.declarado, false);
  else
    update public.mesas
    set ultimo = 'anulado', rendido = false,
        declara = null, declarado = null,
        listo_a = false, listo_b = false,
        estado = 'entre_juegos'
    where id = p_mesa;
    update public.mesas_publico set version = 0, estado = '{}'::jsonb, actualizada = now()
    where mesa = p_mesa;
  end if;
end;
$$;

-- Rendirse: el juego en curso es del otro, en el acto y sin confirmar.
create or replace function public.rendirse(p_mesa uuid)
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
  if not found or yo is null or m.jugador_b is null or yo not in (m.jugador_a, m.jugador_b) then
    raise exception 'no eres jugador' using errcode = 'MS004';
  end if;
  if m.estado <> 'jugando' then
    raise exception 'no se esta jugando' using errcode = 'MS008';
  end if;
  perform public.cerrar_juego(p_mesa, case when yo = m.jugador_a then 'b' else 'a' end, true);
end;
$$;

-- ---------------------------------------------------------------------
-- Abandonar la serie a proposito (25-11-2026): la serie es del otro en el
-- acto y la sala se cierra para los dos, sin esperar los dos minutos. Como
-- en el abandono, lo de la partida se borra (sin historial).
-- ---------------------------------------------------------------------
create or replace function public.abandonar_mesa(p_mesa uuid)
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
  if not found or yo is null or m.jugador_b is null or yo not in (m.jugador_a, m.jugador_b) then
    raise exception 'no eres jugador' using errcode = 'MS004';
  end if;
  if m.estado not in ('jugando', 'entre_juegos') then
    raise exception 'no se esta jugando' using errcode = 'MS005';
  end if;
  update public.mesas
  set estado = 'terminada',
      ganador = case when yo = m.jugador_a then m.jugador_b else m.jugador_a end,
      motivo = 'retiro',
      declara = null, declarado = null
  where id = p_mesa;
  update public.mesas_publico set version = 0, estado = '{}'::jsonb, actualizada = now()
  where mesa = p_mesa;
  delete from public.mesas_privado where mesa = p_mesa;
end;
$$;

-- Nadie llama a cerrar_juego ni a barrer_mesas desde la API.
revoke all on function public.cerrar_juego(uuid, text, boolean), public.barrer_mesas()
  from public, anon, authenticated;

revoke all on function public.ver_mesa(uuid), public.mis_mesas(),
  public.crear_mesa(text, int), public.unirse_mesa(text),
  public.marcar_lista(uuid, boolean), public.latido_mesa(uuid),
  public.salir_mesa(uuid), public.es_canal_de_mi_mesa(text),
  public.guardar_mesa_publico(uuid, int, bigint, jsonb), public.reclamar_abandono(uuid),
  public.declarar_resultado(uuid, text), public.responder_resultado(uuid, boolean),
  public.rendirse(uuid), public.abandonar_mesa(uuid)
  from public, anon;
grant execute on function public.ver_mesa(uuid), public.mis_mesas(),
  public.crear_mesa(text, int), public.unirse_mesa(text),
  public.marcar_lista(uuid, boolean), public.latido_mesa(uuid),
  public.salir_mesa(uuid), public.es_canal_de_mi_mesa(text),
  public.guardar_mesa_publico(uuid, int, bigint, jsonb), public.reclamar_abandono(uuid),
  public.declarar_resultado(uuid, text), public.responder_resultado(uuid, boolean),
  public.rendirse(uuid), public.abandonar_mesa(uuid)
  to authenticated;
