-- =====================================================================
-- ALPHA PRIME NUTRITION · Notificaciones push al teléfono
--  * Cada teléfono que acepta notificaciones guarda su "suscripción".
--  * Cada aviso nuevo (tabla notifications) se manda también como push:
--    un trigger avisa a la app (pg_net) y la app lo envía con web-push.
--  * La app solo envía avisos reales, recientes y una sola vez
--    (claim_push), así nadie puede usar la ruta para mandar spam.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  endpoint     text not null unique check (endpoint like 'https://%' and length(endpoint) < 1000),
  p256dh       text not null check (length(p256dh) < 200),
  auth         text not null check (length(auth) < 100),
  user_agent   text check (length(user_agent) < 400),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions: ver las propias" on public.push_subscriptions;
create policy "push_subscriptions: ver las propias" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.push_subscriptions from anon, authenticated;

-- Guarda (o pasa a este usuario) la suscripción del teléfono. Un teléfono = el último que inició sesión.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, last_seen_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

-- Lo usa SOLO el servidor (service role): marca el aviso como enviado y devuelve qué mandar y a dónde.
create or replace function public.claim_push(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  n public.notifications;
begin
  update public.notifications
     set delivered = array_append(delivered, 'push')
   where id = p_id
     and not ('push' = any (delivered))
     and created_at > now() - interval '15 minutes'
  returning * into n;
  if n.id is null then return null; end if;

  return jsonb_build_object(
    'id', n.id, 'title', n.title, 'body', n.body, 'link', n.link,
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subscriptions s where s.user_id = n.user_id), '[]'::jsonb));
end;
$$;

-- El servidor borra las suscripciones que el teléfono ya no acepta (app desinstalada, permiso quitado).
create or replace function public.drop_push_endpoints(p_endpoints text[])
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text) to authenticated;
revoke execute on function public.claim_push(uuid) from public, anon, authenticated;
grant execute on function public.claim_push(uuid) to service_role;
revoke execute on function public.drop_push_endpoints(text[]) from public, anon, authenticated;
grant execute on function public.drop_push_endpoints(text[]) to service_role;

-- Cada aviso nuevo: si el usuario tiene algún teléfono suscrito, se le pide a la app que lo envíe.
create or replace function public.push_on_notification()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if to_regnamespace('net') is null then return new; end if;
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then return new; end if;
  perform net.http_post(
    url := 'https://alpha-prime-nutrition.netlify.app/api/push',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  return new; -- un fallo del push nunca debe impedir guardar el aviso
end;
$$;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.push_on_notification();
