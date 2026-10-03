-- =====================================================================
-- ALPHA PRIME NUTRITION · Chat coach ↔ cliente
--  * Una conversación por cliente. Solo el coach del cliente y el propio
--    cliente pueden leer y escribir.
--  * Cada mensaje avisa por notificación push al otro (sin llenar la
--    campanita: el chat tiene su propio contador).
--  * Fotos en un bucket privado: {client_id}/{archivo}.
-- =====================================================================

alter type public.notification_type add value if not exists 'message_new';

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  sender_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text check (length(body) between 1 and 4000),
  image_path  text check (length(image_path) <= 300),
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  check (body is not null or image_path is not null)
);
create index if not exists messages_client_idx on public.messages (client_id, created_at desc);
create index if not exists messages_unread_idx on public.messages (client_id) where read_at is null;

create or replace function public.is_chat_member(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_coach_of(p_client) or public.is_self_client(p_client) $$;

alter table public.messages enable row level security;
drop policy if exists "messages: leer" on public.messages;
create policy "messages: leer" on public.messages
  for select to authenticated using ((select public.is_chat_member(client_id)));
drop policy if exists "messages: escribir" on public.messages;
create policy "messages: escribir" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select public.is_chat_member(client_id))
              and (image_path is null or split_part(image_path, '/', 1) = client_id::text));
drop policy if exists "messages: borrar los propios" on public.messages;
create policy "messages: borrar los propios" on public.messages
  for delete to authenticated using (sender_id = (select auth.uid()));
revoke update on public.messages from anon, authenticated;

-- Marca como leídos los mensajes que le escribieron al usuario en esa conversación.
create or replace function public.mark_chat_read(p_client uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.messages m set read_at = now()
  where m.client_id = p_client and m.read_at is null and m.sender_id <> auth.uid()
    and public.is_chat_member(p_client)
$$;

-- Conversaciones del coach: último mensaje y no leídos.
create or replace function public.coach_chat_threads()
returns table (client_id uuid, first_name text, last_name text, avatar_url text,
               last_body text, last_image boolean, last_at timestamptz, last_from_me boolean, unread bigint)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.first_name, c.last_name, p.avatar_url,
         l.body, l.image_path is not null, l.created_at, l.sender_id = auth.uid(),
         (select count(*) from public.messages u where u.client_id = c.id and u.read_at is null and u.sender_id <> auth.uid())
  from public.clients c
  left join public.profiles p on p.id = c.user_id
  join lateral (select m.* from public.messages m where m.client_id = c.id order by m.created_at desc limit 1) l on true
  where c.coach_id = auth.uid()
  order by l.created_at desc
$$;

-- Aviso push al otro lado de la conversación (como máximo uno cada 2 minutos por conversación).
create or replace function public.notify_message()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_coach  uuid;
  v_user   uuid;
  v_name   text;
  v_to     uuid;
  v_link   text;
  v_title  text;
begin
  select c.coach_id, c.user_id, c.first_name into v_coach, v_user, v_name from public.clients c where c.id = new.client_id;
  if new.sender_id = v_coach then
    v_to := v_user; v_link := '/portal/chat'; v_title := 'Mensaje de tu coach';
  else
    v_to := v_coach; v_link := '/coach/chat/' || new.client_id; v_title := 'Mensaje de ' || v_name;
  end if;
  if v_to is null then return new; end if;
  if exists (select 1 from public.notifications n where n.user_id = v_to and n.type = 'message_new'
             and n.link = v_link and n.created_at > now() - interval '2 minutes') then
    return new;
  end if;
  insert into public.notifications (user_id, type, title, body, link, read_at)
  values (v_to, 'message_new', v_title,
          coalesce(left(new.body, 140), '📷 Foto'), v_link, now());
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_message();

-- Fotos del chat
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', false, 3 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat: leer" on storage.objects;
create policy "chat: leer" on storage.objects
  for select to authenticated using (bucket_id = 'chat' and public.is_chat_member(public.photo_client_id(name)));
drop policy if exists "chat: subir" on storage.objects;
create policy "chat: subir" on storage.objects
  for insert to authenticated with check (bucket_id = 'chat' and public.is_chat_member(public.photo_client_id(name)));

revoke execute on function public.is_chat_member(uuid), public.mark_chat_read(uuid), public.coach_chat_threads() from public, anon;
grant execute on function public.is_chat_member(uuid), public.mark_chat_read(uuid), public.coach_chat_threads() to authenticated;

-- Mensajes en tiempo real
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
