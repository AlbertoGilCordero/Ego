-- =====================================================================
-- Ágoge — esquema de Supabase
-- =====================================================================
-- Este archivo tiene DOS bloques:
--   BLOQUE 1: tablas + seguridad (RLS). Ejecutar primero, tal cual.
--   BLOQUE 2: tarea programada (pg_cron + pg_net) que llama a la función
--             `notify` cada 10 minutos. Ejecutar al final, DESPUÉS de
--             sustituir los tres marcadores <...>.
-- Ambos bloques se pueden volver a ejecutar sin romper nada.
-- =====================================================================


-- =====================================================================
-- BLOQUE 1 — TABLAS Y POLÍTICAS (ejecutar tal cual)
-- =====================================================================

-- Estado completo de la app: una fila por usuario, todo en un JSON.
create table if not exists public.agoge_state (
  user_id    uuid primary key default auth.uid()
             references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Suscripciones Web Push: una fila por navegador/dispositivo.
create table if not exists public.agoge_push (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  tz         text not null default 'Europe/Paris',
  am         text not null default '07:15',   -- aviso de mañana (HH:MM local)
  pm         text not null default '21:15',   -- aviso de cierre (HH:MM local)
  guard      boolean not null default true,   -- aviso "racha en peligro" 18:30
  last_am    date,                            -- último día local en que se envió cada aviso
  last_pm    date,
  last_guard date,
  created_at timestamptz default now()
);

create index if not exists agoge_push_user_idx on public.agoge_push (user_id);

-- Seguridad a nivel de fila: cada usuario solo ve y modifica lo suyo.
alter table public.agoge_state enable row level security;
alter table public.agoge_push  enable row level security;

-- Permisos de tabla para usuarios con sesión iniciada (el rol anónimo no tiene ninguno).
grant select, insert, update, delete on public.agoge_state to authenticated;
grant select, insert, update, delete on public.agoge_push  to authenticated;
revoke all on public.agoge_state from anon;
revoke all on public.agoge_push  from anon;

-- Políticas de agoge_state
drop policy if exists agoge_state_select on public.agoge_state;
drop policy if exists agoge_state_insert on public.agoge_state;
drop policy if exists agoge_state_update on public.agoge_state;
drop policy if exists agoge_state_delete on public.agoge_state;

create policy agoge_state_select on public.agoge_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy agoge_state_insert on public.agoge_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy agoge_state_update on public.agoge_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy agoge_state_delete on public.agoge_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Políticas de agoge_push
drop policy if exists agoge_push_select on public.agoge_push;
drop policy if exists agoge_push_insert on public.agoge_push;
drop policy if exists agoge_push_update on public.agoge_push;
drop policy if exists agoge_push_delete on public.agoge_push;

create policy agoge_push_select on public.agoge_push
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy agoge_push_insert on public.agoge_push
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy agoge_push_update on public.agoge_push
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy agoge_push_delete on public.agoge_push
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Configuración privada de la función notify (alternativa a los secretos de Edge Functions).
-- Sin políticas: solo la lee la clave service_role, desde dentro de la función.
-- Filas esperadas: CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
-- Los valores NO se guardan en este repositorio.
create table if not exists public.agoge_secrets (
  name  text primary key,
  value text not null
);
alter table public.agoge_secrets enable row level security;
revoke all on public.agoge_secrets from anon, authenticated;

-- ======================= FIN DEL BLOQUE 1 ============================


-- =====================================================================
-- BLOQUE 2 — TAREA PROGRAMADA (ejecutar al final, con los marcadores sustituidos)
-- =====================================================================
-- Antes de ejecutar, sustituye en el texto de abajo:
--   <PROJECT-REF>  -> la referencia del proyecto (lo que va antes de .supabase.co)
--   <ANON-KEY>     -> la clave "anon public" del proyecto (la misma de config.js)
--   <CRON_SECRET>  -> exactamente el mismo valor guardado como secreto CRON_SECRET
-- Selecciona solo este bloque en el SQL Editor y pulsa Run.
--
-- Nota: el valor de CRON_SECRET queda guardado en la tabla cron.job de tu
-- base de datos (solo accesible para ti como administrador del proyecto).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

-- Si ya existía una versión anterior de la tarea, se elimina antes de recrearla.
select cron.unschedule(jobid) from cron.job where jobname = 'agoge-notify';

select cron.schedule(
  'agoge-notify',
  '*/10 * * * *',          -- cada 10 minutos
  $$
  select net.http_post(
    url     := 'https://<PROJECT-REF>.supabase.co/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <ANON-KEY>',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);

-- Comprobaciones útiles:
--   select jobid, jobname, schedule, active from cron.job;
--   select status, return_message, start_time
--     from cron.job_run_details order by start_time desc limit 10;
--   select id, status_code, content, error_msg, created
--     from net._http_response order by created desc limit 10;
--
-- Para DETENER los avisos (desprogramar la tarea):
--   select cron.unschedule('agoge-notify');

-- ======================= FIN DEL BLOQUE 2 ============================
