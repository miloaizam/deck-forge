-- =====================================================================
-- Prueba de mesa.sql contra un Postgres local (docs/cuentas.md, «Probar la
-- SQL sin Supabase»): sobre el esquema `auth` de imitacion, esquema.sql y
-- mesa.sql ya corridos. Se corre con psql como superusuario:
--
--   psql -v ON_ERROR_STOP=1 -f supabase/mesa.prueba.sql
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

-- Empezada, no se sale con salir_mesa (se rinde, sesion 7).
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

reset role;
\echo 'mesa.sql: todas las comprobaciones pasan'
