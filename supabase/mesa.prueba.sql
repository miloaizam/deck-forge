-- =====================================================================
-- Prueba de mesa.sql contra un Postgres local (docs/cuentas.md, «Probar la
-- SQL sin Supabase»): sobre el esquema `auth` de imitacion, esquema.sql y
-- mesa.sql ya corridos. Se corre con psql como superusuario:
--
--   psql -v ON_ERROR_STOP=1 -f supabase/mesa.prueba.sql
--
-- Para probar tambien el canal de Realtime, antes de correr mesa.sql:
--
--   create schema realtime;
--   create table realtime.messages (id bigserial primary key, topic text,
--     extension text, payload jsonb);
--   alter table realtime.messages enable row level security;
--   create function realtime.topic() returns text language sql stable as
--     $$ select current_setting('realtime.topic', true) $$;
--   grant usage on schema realtime to authenticated;
--   grant select, insert, delete on realtime.messages to authenticated;
--   grant usage, select on sequence realtime.messages_id_seq to authenticated;
--
-- Cada comprobacion falla con un error si no se cumple. Lo que tiene que
-- quedar claro: dos cuentas entran a la misma sala, una tercera no, y el
-- rival NO puede leer la fila privada del otro.
-- =====================================================================

\set ON_ERROR_STOP on
\set A '00000000-0000-4000-8000-00000000000a'
\set B '00000000-0000-4000-8000-00000000000b'
\set C '00000000-0000-4000-8000-00000000000c'

-- Como superusuario: las tres cuentas, y alias para dos.
reset role;
delete from public.mesas;
delete from auth.users where id in (:'A', :'B', :'C');
insert into auth.users (id, email) values (:'A', 'a@x'), (:'B', 'b@x'), (:'C', 'c@x');
insert into public.perfiles (user_id, alias) values (:'A', 'Anfitrion'), (:'B', 'Invitado');

-- Sin sesion no se ve nada.
set role anon;
do $$ begin
  perform count(*) from public.mesas;
  raise exception 'anon pudo leer mesas';
exception when insufficient_privilege then null; end $$;

-- A crea una sala.
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
select (r->>'id') as sala, (r->>'codigo') as codigo from (select crear_mesa('vcr', 3) as r) x \gset
do $$ begin
  if (select count(*) from public.mesas) <> 1 then raise exception 'A no ve su sala'; end if;
end $$;

-- C no la ve.
select set_config('request.jwt.claim.sub', :'C', false);
select (ver_mesa(:'sala') is null) as oculta \gset
\if :oculta
\else
  \echo 'FALLA: C ve la sala de A'
  select 1/0;
\endif
do $$ begin
  if (select count(*) from public.mesas) <> 0 then raise exception 'C lee mesas ajenas'; end if;
end $$;

-- B entra con el codigo (en minusculas y con espacios: se normaliza).
select set_config('request.jwt.claim.sub', :'B', false);
select (unirse_mesa(lower(' ' || :'codigo' || ' ')) = :'sala'::uuid) as entro \gset
\if :entro
\else
  \echo 'FALLA: B no entro a la sala'
  select 1/0;
\endif
select (ver_mesa(:'sala')->>'alias_a') = 'Anfitrion' as ve_alias \gset
\if :ve_alias
\else
  \echo 'FALLA: B no ve el alias de A'
  select 1/0;
\endif

-- C ya no puede entrar: la sala esta completa.
select set_config('request.jwt.claim.sub', :'C', false);
select set_config('prueba.codigo', :'codigo', false);
do $$ begin
  perform unirse_mesa(current_setting('prueba.codigo'));
  raise exception 'C entro a una sala completa';
exception when sqlstate 'MS001' then null; end $$;

-- A guarda su baraja en su fila privada.
select set_config('request.jwt.claim.sub', :'A', false);
insert into public.mesas_privado (mesa, jugador, estado)
values (:'sala', :'A', '{"baraja": {"nombre": "secreta"}}');

-- B NO la puede leer, ni escribir a nombre de A.
select set_config('request.jwt.claim.sub', :'B', false);
select set_config('prueba.sala', :'sala', false);
select set_config('prueba.a', :'A', false);
do $$ begin
  if (select count(*) from public.mesas_privado) <> 0 then
    raise exception 'B lee la fila privada de A';
  end if;
  begin
    insert into public.mesas_privado (mesa, jugador, estado)
    values (current_setting('prueba.sala')::uuid, current_setting('prueba.a')::uuid, '{}');
    raise exception 'B escribio en la fila privada de A';
  exception when insufficient_privilege then null; end;
  -- Y cambiar la de A no toca nada: la politica no la deja ver.
  update public.mesas_privado set estado = '{}' where jugador = current_setting('prueba.a')::uuid;
end $$;

-- Ni tocar la sala a mano: solo por las funciones.
do $$ begin
  update public.mesas set victorias_b = 3;
  raise exception 'B cambio la sala a mano';
exception when insufficient_privilege then null; end $$;

-- C tampoco escribe en la sala ajena.
select set_config('request.jwt.claim.sub', :'C', false);
do $$ begin
  insert into public.mesas_privado (mesa, jugador, estado)
  values (current_setting('prueba.sala')::uuid, auth.uid(), '{}');
  raise exception 'C escribio en una sala ajena';
exception when insufficient_privilege then null; end $$;

-- Listo sin baraja: no.
select set_config('request.jwt.claim.sub', :'B', false);
do $$ begin
  perform marcar_lista(current_setting('prueba.sala')::uuid, true);
  raise exception 'B quedo listo sin baraja';
exception when sqlstate 'MS006' then null; end $$;

-- Con baraja, los dos listos: la sala pasa a jugarse.
insert into public.mesas_privado (mesa, jugador, estado)
values (:'sala', :'B', '{"baraja": {"nombre": "otra"}}');
select marcar_lista(:'sala', true);
select latido_mesa(:'sala');
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'sala', true);
do $$ begin
  if (select estado from public.mesas) <> 'jugando' then raise exception 'no paso a jugarse'; end if;
  if (select senal_b from public.mesas) is null then raise exception 'el latido de B no quedo'; end if;
  -- A sigue leyendo solo su fila.
  if (select count(*) from public.mesas_privado) <> 1 then raise exception 'A ve filas ajenas'; end if;
end $$;

-- Empezada, no se sale con salir_mesa.
do $$ begin
  perform salir_mesa(current_setting('prueba.sala')::uuid);
  raise exception 'A salio de una sala empezada';
exception when sqlstate 'MS005' then null; end $$;

-- Tope de tres salas abiertas por persona.
select crear_mesa('estandar', 5);
select crear_mesa('infanteria', 3);
do $$ begin
  perform crear_mesa('estandar', 3);
  raise exception 'A abrio una cuarta sala';
exception when sqlstate 'MS003' then null; end $$;
do $$ begin
  if json_array_length(mis_mesas()) <> 3 then raise exception 'mis_mesas no da 3'; end if;
end $$;

-- Salir mientras se espera: el invitado deja el lugar, el anfitrion la borra.
select set_config('request.jwt.claim.sub', :'C', false);
select (r->>'id') as sala_c, (r->>'codigo') as codigo_c from (select crear_mesa('estandar', 3) as r) x \gset
select set_config('request.jwt.claim.sub', :'B', false);
select unirse_mesa(:'codigo_c');
select salir_mesa(:'sala_c');
select set_config('request.jwt.claim.sub', :'C', false);
do $$ begin
  if (select jugador_b from public.mesas where estado = 'esperando') is not null then
    raise exception 'el invitado no dejo su lugar';
  end if;
end $$;
select salir_mesa(:'sala_c');
do $$ begin
  if (select count(*) from public.mesas) <> 0 then raise exception 'el anfitrion no la borro'; end if;
end $$;

-- Guardar la foto publica (sesion 6): solo sube de version, y solo un jugador.
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
do $$ begin
  if not guardar_mesa_publico(current_setting('prueba.sala')::uuid, 1, 5, '{"v": 5}') then
    raise exception 'A no pudo guardar la foto';
  end if;
  if guardar_mesa_publico(current_setting('prueba.sala')::uuid, 1, 3, '{"v": 3}') then
    raise exception 'la foto retrocedio de version';
  end if;
  if (select version from public.mesas_publico where mesa = current_setting('prueba.sala')::uuid) <> 5 then raise exception 'version mal guardada'; end if;
end $$;
select set_config('request.jwt.claim.sub', :'C', false);
do $$ begin
  perform guardar_mesa_publico(current_setting('prueba.sala')::uuid, 1, 9, '{}');
  raise exception 'C guardo la foto de una sala ajena';
exception when sqlstate 'MS004' then null; end $$;

-- Reclamar por abandono: antes de los dos minutos, no.
select set_config('request.jwt.claim.sub', :'A', false);
do $$ begin
  perform reclamar_abandono(current_setting('prueba.sala')::uuid);
  raise exception 'A reclamo antes de tiempo';
exception when sqlstate 'MS007' then null; end $$;

-- B lleva tres minutos sin senales (se envejece a mano): A gana la serie.
reset role;
update public.mesas set senal_b = now() - interval '3 minutes' where id = :'sala';
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
select reclamar_abandono(:'sala');
do $$ begin
  if (select estado || ' ' || motivo from public.mesas where id = current_setting('prueba.sala')::uuid)
     <> 'terminada abandono' then
    raise exception 'la sala no termino por abandono';
  end if;
  if (select ganador from public.mesas where id = current_setting('prueba.sala')::uuid) <> auth.uid() then
    raise exception 'el ganador no es quien reclamo';
  end if;
  if (select estado from public.mesas_publico where mesa = current_setting('prueba.sala')::uuid) <> '{}'::jsonb then
    raise exception 'la foto publica no se borro';
  end if;
  if (select count(*) from public.mesas_privado where mesa = current_setting('prueba.sala')::uuid) <> 0 then
    raise exception 'quedo la fila privada';
  end if;
  if (select ver_mesa(current_setting('prueba.sala')::uuid) ->> 'ahora') is null then
    raise exception 'ver_mesa no trae la hora de la base';
  end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.mesas_privado where mesa = current_setting('prueba.sala')::uuid) <> 0 then
    raise exception 'quedaron filas privadas de la partida';
  end if;
end $$;

-- B vuelve tarde: ni reclama ni su latido cambia nada.
set role authenticated;
select set_config('request.jwt.claim.sub', :'B', false);
do $$ begin
  perform reclamar_abandono(current_setting('prueba.sala')::uuid);
  raise exception 'B reclamo una sala terminada';
exception when sqlstate 'MS005' then null; end $$;
select latido_mesa(:'sala');
do $$ begin
  if (select senal_b from public.mesas where id = current_setting('prueba.sala')::uuid)
     > now() - interval '2 minutes' then
    raise exception 'el latido revivio una sala terminada';
  end if;
end $$;

-- La serie (sesion 7): una sala nueva al mejor de 3 entre A y B.
reset role;
delete from public.mesas where estado = 'esperando';
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
select (r->>'id') as serie, (r->>'codigo') as codigo_s from (select crear_mesa('estandar', 3) as r) x \gset
select set_config('prueba.serie', :'serie', false);
insert into public.mesas_privado (mesa, jugador, estado) values (:'serie', :'A', '{"baraja": {}}');
select set_config('request.jwt.claim.sub', :'B', false);
select unirse_mesa(:'codigo_s');
insert into public.mesas_privado (mesa, jugador, estado) values (:'serie', :'B', '{"baraja": {}}');
select marcar_lista(:'serie', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'serie', true);

-- Nada que responder, y cerrar_juego no se llama desde la API.
do $$ begin
  perform responder_resultado(current_setting('prueba.serie')::uuid, true);
  raise exception 'A respondio sin resultado declarado';
exception when sqlstate 'MS010' then null; end $$;
do $$ begin
  perform cerrar_juego(current_setting('prueba.serie')::uuid, 'a', false);
  raise exception 'A llamo a cerrar_juego';
exception when insufficient_privilege then null; end $$;

-- A declara que gano y se corrige a empate; no responde lo suyo.
select declarar_resultado(:'serie', 'a');
select declarar_resultado(:'serie', 'empate');
do $$ begin
  perform responder_resultado(current_setting('prueba.serie')::uuid, true);
  raise exception 'A confirmo su propio resultado';
exception when sqlstate 'MS010' then null; end $$;
do $$ begin
  perform declarar_resultado(current_setting('prueba.serie')::uuid, 'nadie');
  raise exception 'se declaro un resultado invalido';
exception when sqlstate '22023' then null; end $$;
-- B no declara encima: primero responde.
select set_config('request.jwt.claim.sub', :'B', false);
do $$ begin
  perform declarar_resultado(current_setting('prueba.serie')::uuid, 'b');
  raise exception 'B declaro encima del resultado de A';
exception when sqlstate 'MS009' then null; end $$;
do $$ begin
  if (select ver_mesa(current_setting('prueba.serie')::uuid) ->> 'declarado') <> 'empate' then
    raise exception 'ver_mesa no trae lo declarado';
  end if;
end $$;
select set_config('request.jwt.claim.sub', :'C', false);
do $$ begin
  perform declarar_resultado(current_setting('prueba.serie')::uuid, 'a');
  raise exception 'C declaro en una sala ajena';
exception when sqlstate 'MS004' then null; end $$;

-- B confirma el empate: no suma, y la sala queda entre juegos.
select set_config('request.jwt.claim.sub', :'B', false);
select responder_resultado(:'serie', true);
do $$
declare m public.mesas;
begin
  select * into m from public.mesas where id = current_setting('prueba.serie')::uuid;
  if m.estado <> 'entre_juegos' or m.empates <> 1 or m.victorias_a + m.victorias_b <> 0
     or m.ultimo <> 'empate' or m.listo_a or m.listo_b or m.declara is not null then
    raise exception 'el empate no quedo bien: %', row_to_json(m);
  end if;
  if guardar_mesa_publico(m.id, 1, 9, '{}') then
    raise exception 'se guardo la foto entre juegos';
  end if;
  perform declarar_resultado(m.id, 'a');
  raise exception 'se declaro entre juegos';
exception when sqlstate 'MS008' then null; end $$;

-- Listos otra vez: ronda 2, con la foto en blanco y la de la ronda 1 rechazada.
select marcar_lista(:'serie', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'serie', true);
do $$ begin
  if (select estado || ' ' || ronda from public.mesas where id = current_setting('prueba.serie')::uuid)
     <> 'jugando 2' then
    raise exception 'no empezo la ronda 2';
  end if;
  if guardar_mesa_publico(current_setting('prueba.serie')::uuid, 1, 50, '{}') then
    raise exception 'un guardado de la ronda 1 entro en la 2';
  end if;
  if not guardar_mesa_publico(current_setting('prueba.serie')::uuid, 2, 1, '{"v": 1}') then
    raise exception 'la ronda 2 no guardo desde la version 1';
  end if;
end $$;

-- A dice que gano, B no esta de acuerdo: el juego se anula, sin sumar.
select declarar_resultado(:'serie', 'a');
select set_config('request.jwt.claim.sub', :'B', false);
select responder_resultado(:'serie', false);
do $$
declare m public.mesas;
begin
  select * into m from public.mesas where id = current_setting('prueba.serie')::uuid;
  if m.estado <> 'entre_juegos' or m.ultimo <> 'anulado' or m.victorias_a <> 0 then
    raise exception 'la anulacion no quedo bien: %', row_to_json(m);
  end if;
  if (select version from public.mesas_publico where mesa = m.id) <> 0 then
    raise exception 'la foto del juego anulado quedo';
  end if;
end $$;

-- Ronda 3: B se rinde. Gana A, en el acto.
select marcar_lista(:'serie', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'serie', true);
select set_config('request.jwt.claim.sub', :'B', false);
select rendirse(:'serie');
do $$
declare m public.mesas;
begin
  select * into m from public.mesas where id = current_setting('prueba.serie')::uuid;
  if m.estado <> 'entre_juegos' or m.victorias_a <> 1 or m.ultimo <> 'a' or not m.rendido then
    raise exception 'la rendicion no quedo bien: %', row_to_json(m);
  end if;
end $$;

-- Ronda 4: B declara que gano A y A confirma. Dos victorias: serie terminada.
select marcar_lista(:'serie', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'serie', true);
select set_config('request.jwt.claim.sub', :'B', false);
select declarar_resultado(:'serie', 'a');
select set_config('request.jwt.claim.sub', :'A', false);
select responder_resultado(:'serie', true);
do $$
declare m public.mesas;
begin
  select * into m from public.mesas where id = current_setting('prueba.serie')::uuid;
  if m.estado <> 'terminada' or m.ganador <> auth.uid() or m.motivo <> 'partidas'
     or m.victorias_a <> 2 or m.ronda <> 4 then
    raise exception 'la serie no termino bien: %', row_to_json(m);
  end if;
  perform rendirse(m.id);
  raise exception 'alguien se rindio en una serie terminada';
exception when sqlstate 'MS008' then null; end $$;
reset role;
do $$ begin
  if (select count(*) from public.mesas_privado where mesa = current_setting('prueba.serie')::uuid) <> 0 then
    raise exception 'quedaron filas privadas de la serie';
  end if;
end $$;

-- Rendirse en el juego que decide: la serie termina por rendicion.
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
select (r->>'id') as serie2, (r->>'codigo') as codigo_s2 from (select crear_mesa('vcr', 3) as r) x \gset
insert into public.mesas_privado (mesa, jugador, estado) values (:'serie2', :'A', '{"baraja": {}}');
select set_config('request.jwt.claim.sub', :'B', false);
select unirse_mesa(:'codigo_s2');
insert into public.mesas_privado (mesa, jugador, estado) values (:'serie2', :'B', '{"baraja": {}}');
select marcar_lista(:'serie2', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'serie2', true);
select rendirse(:'serie2');
select set_config('request.jwt.claim.sub', :'B', false);
select marcar_lista(:'serie2', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'serie2', true);
select rendirse(:'serie2');
select set_config('prueba.serie2', :'serie2', false);
do $$
declare m public.mesas;
begin
  select * into m from public.mesas where id = current_setting('prueba.serie2')::uuid;
  if m.estado <> 'terminada' or m.motivo <> 'rendicion' or m.victorias_b <> 2
     or m.ganador = auth.uid() then
    raise exception 'la serie por rendicion no quedo bien: %', row_to_json(m);
  end if;
end $$;

-- Una serie que se dejo a medias (sesion 8): con las dos senales de hace mas
-- de un dia, crear otra sala la borra, con su foto y sus filas privadas.
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
select (r->>'id') as vieja, (r->>'codigo') as codigo_v from (select crear_mesa('estandar', 3) as r) x \gset
insert into public.mesas_privado (mesa, jugador, estado) values (:'vieja', :'A', '{"baraja": {}}');
select set_config('request.jwt.claim.sub', :'B', false);
select unirse_mesa(:'codigo_v');
insert into public.mesas_privado (mesa, jugador, estado) values (:'vieja', :'B', '{"baraja": {}}');
select marcar_lista(:'vieja', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'vieja', true);
-- Otra en juego, con senales recientes: esa se queda.
select (r->>'id') as viva, (r->>'codigo') as codigo_viva from (select crear_mesa('vcr', 3) as r) x \gset
insert into public.mesas_privado (mesa, jugador, estado) values (:'viva', :'A', '{"baraja": {}}');
select set_config('request.jwt.claim.sub', :'B', false);
select unirse_mesa(:'codigo_viva');
insert into public.mesas_privado (mesa, jugador, estado) values (:'viva', :'B', '{"baraja": {}}');
select marcar_lista(:'viva', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'viva', true);
reset role;
select set_config('prueba.vieja', :'vieja', false);
select set_config('prueba.viva', :'viva', false);
update public.mesas
set senal_a = now() - interval '25 hours', senal_b = now() - interval '26 hours'
where id = :'vieja';
set role authenticated;
select set_config('request.jwt.claim.sub', :'C', false);
select crear_mesa('estandar', 3);
reset role;
do $$ begin
  if exists (select 1 from public.mesas where id = current_setting('prueba.vieja')::uuid) then
    raise exception 'la serie abandonada no se borro';
  end if;
  if exists (select 1 from public.mesas_privado where mesa = current_setting('prueba.vieja')::uuid)
     or exists (select 1 from public.mesas_publico where mesa = current_setting('prueba.vieja')::uuid) then
    raise exception 'quedaron la foto o las filas privadas de la serie abandonada';
  end if;
  if (select estado from public.mesas where id = current_setting('prueba.viva')::uuid)
     is distinct from 'jugando' then
    raise exception 'se borro una serie que se esta jugando';
  end if;
end $$;

-- Salas sin nadie (27-11-2026): sin terminar y con las dos senales de mas de
-- 15 minutos, abrir la Mesa (mis_mesas) las borra. Una con alguien adentro,
-- o con senales de hace 10 minutos, se queda.
reset role;
delete from public.mesas;
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
select (r->>'id') as espera, (r->>'codigo') as codigo_e from (select crear_mesa('estandar', 3) as r) x \gset
select (r->>'id') as sola, (r->>'codigo') as codigo_so from (select crear_mesa('vcr', 3) as r) x \gset
insert into public.mesas_privado (mesa, jugador, estado) values (:'sola', :'A', '{"baraja": {}}');
select (r->>'id') as media, (r->>'codigo') as codigo_m from (select crear_mesa('infanteria', 5) as r) x \gset
select set_config('request.jwt.claim.sub', :'B', false);
select unirse_mesa(:'codigo_so');
select unirse_mesa(:'codigo_m');
select (r->>'id') as reciente, (r->>'codigo') as codigo_r from (select crear_mesa('estandar', 5) as r) x \gset
reset role;
select set_config('prueba.espera', :'espera', false);
select set_config('prueba.sola', :'sola', false);
select set_config('prueba.media', :'media', false);
select set_config('prueba.reciente', :'reciente', false);
update public.mesas set senal_a = now() - interval '16 minutes' where id = :'espera';
update public.mesas set estado = 'jugando',
  senal_a = now() - interval '16 minutes', senal_b = now() - interval '17 minutes'
where id = :'sola';
-- Uno se fue hace 16 minutos y el otro sigue: se queda.
update public.mesas set estado = 'entre_juegos',
  senal_a = now() - interval '16 minutes', senal_b = now()
where id = :'media';
update public.mesas set senal_a = now() - interval '10 minutes' where id = :'reciente';
set role authenticated;
select set_config('request.jwt.claim.sub', :'C', false);
select mis_mesas();
reset role;
do $$ begin
  if exists (select 1 from public.mesas where id = current_setting('prueba.espera')::uuid) then
    raise exception 'la sala esperando sin nadie no se borro';
  end if;
  if exists (select 1 from public.mesas where id = current_setting('prueba.sola')::uuid)
     or exists (select 1 from public.mesas_privado where mesa = current_setting('prueba.sola')::uuid)
     or exists (select 1 from public.mesas_publico where mesa = current_setting('prueba.sola')::uuid) then
    raise exception 'la sala en juego sin nadie no se borro entera';
  end if;
  if not exists (select 1 from public.mesas where id = current_setting('prueba.media')::uuid) then
    raise exception 'se borro una sala con un jugador adentro';
  end if;
  if not exists (select 1 from public.mesas where id = current_setting('prueba.reciente')::uuid) then
    raise exception 'se borro una sala con senales de hace 10 minutos';
  end if;
end $$;
-- La foto de cada jugador (27-11-2026): ver_mesa la trae con su version, y
-- una oculta por moderacion sale null.
update public.perfiles set avatar = 1700000000000, avatar_oculto = false where user_id = :'A';
update public.perfiles set avatar = 1700000000001, avatar_oculto = true where user_id = :'B';
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
do $$
declare
  v jsonb := public.ver_mesa(current_setting('prueba.media')::uuid)::jsonb;
begin
  if not (v ?& array['avatar_a', 'avatar_b']) then
    raise exception 'ver_mesa no trae las fotos';
  end if;
  if v->>'avatar_a' is distinct from '00000000-0000-4000-8000-00000000000a?v=1700000000000' then
    raise exception 'la foto de A no es la ruta con su version: %', v->>'avatar_a';
  end if;
  if v->>'avatar_b' is not null then
    raise exception 'la foto oculta de B se ve';
  end if;
end $$;
reset role;

-- Y desde la API no se llama.
set role authenticated;
do $$ begin
  perform public.barrer_mesas();
  raise exception 'barrer_mesas se pudo llamar desde la API';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Abandonar la serie a proposito (25-11-2026).
reset role;
delete from public.mesas where estado <> 'terminada';
set role authenticated;
select set_config('request.jwt.claim.sub', :'A', false);
select (r->>'id') as deja, (r->>'codigo') as codigo_d from (select crear_mesa('estandar', 3) as r) x \gset
select set_config('prueba.deja', :'deja', false);
-- Esperando todavia, no: para eso esta salir_mesa.
do $$ begin
  perform abandonar_mesa(current_setting('prueba.deja')::uuid);
  raise exception 'se abandono una sala que esperaba';
exception when sqlstate 'MS004' then null; end $$;
insert into public.mesas_privado (mesa, jugador, estado) values (:'deja', :'A', '{"baraja": {}}');
select set_config('request.jwt.claim.sub', :'B', false);
select unirse_mesa(:'codigo_d');
do $$ begin
  perform abandonar_mesa(current_setting('prueba.deja')::uuid);
  raise exception 'se abandono una sala que esperaba';
exception when sqlstate 'MS005' then null; end $$;
insert into public.mesas_privado (mesa, jugador, estado) values (:'deja', :'B', '{"baraja": {}}');
select marcar_lista(:'deja', true);
select set_config('request.jwt.claim.sub', :'A', false);
select marcar_lista(:'deja', true);
select set_config('request.jwt.claim.sub', :'C', false);
do $$ begin
  perform abandonar_mesa(current_setting('prueba.deja')::uuid);
  raise exception 'C abandono una sala ajena';
exception when sqlstate 'MS004' then null; end $$;
-- B abandona a mitad de serie: gana A, motivo retiro, sin nada guardado.
select set_config('request.jwt.claim.sub', :'B', false);
select abandonar_mesa(:'deja');
select set_config('request.jwt.claim.sub', :'A', false);
do $$
declare m public.mesas;
begin
  select * into m from public.mesas where id = current_setting('prueba.deja')::uuid;
  if m.estado <> 'terminada' or m.motivo <> 'retiro' or m.ganador <> auth.uid() then
    raise exception 'abandonar no quedo bien: %', row_to_json(m);
  end if;
  if (select estado from public.mesas_publico where mesa = m.id) <> '{}'::jsonb then
    raise exception 'quedo la foto de la sala abandonada';
  end if;
  if exists (select 1 from json_array_elements(mis_mesas()) x where x->>'id' = m.id::text) then
    raise exception 'mis_mesas sigue listando la sala abandonada';
  end if;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.mesas_privado where mesa = current_setting('prueba.deja')::uuid) then
    raise exception 'quedaron filas privadas de la sala abandonada';
  end if;
end $$;

-- El canal privado de la sala (sesion 5), si la base tiene Realtime (o su
-- imitacion: ver el comienzo de este archivo).
reset role;
select to_regclass('realtime.messages') is not null as hay_realtime \gset
\if :hay_realtime
  set role authenticated;
  select set_config('request.jwt.claim.sub', :'A', false);
  select set_config('realtime.topic', 'mesa:' || :'sala', false);
  insert into realtime.messages (topic, extension) values ('mesa:' || :'sala', 'broadcast');
  do $$ begin
    if (select count(*) from realtime.messages) <> 1 then raise exception 'A no lee su canal'; end if;
  end $$;
  select set_config('request.jwt.claim.sub', :'C', false);
  do $$ begin
    if (select count(*) from realtime.messages) <> 0 then raise exception 'C lee el canal ajeno'; end if;
    insert into realtime.messages (topic, extension)
    values (current_setting('realtime.topic'), 'broadcast');
    raise exception 'C escribio en el canal ajeno';
  exception when insufficient_privilege then null; end $$;
  reset role;
  delete from realtime.messages;
\else
  \echo 'sin Realtime: el canal se prueba en Supabase'
\endif

reset role;
\echo 'mesa.sql: todas las comprobaciones pasan'
