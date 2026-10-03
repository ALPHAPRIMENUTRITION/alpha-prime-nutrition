-- =====================================================================
-- ALPHA PRIME NUTRITION · Cuestionario inicial
--  * Cualquier persona puede llenarlo desde la página (/empezar).
--  * Cada cliente tiene además su propio link (/cuestionario/<token>);
--    lo que llene queda pegado a su expediente.
--  * Solo el coach puede leer las respuestas (incluyen datos de salud).
-- =====================================================================

alter type public.notification_type add value if not exists 'intake_submitted';

alter table public.clients add column if not exists intake_token uuid not null default gen_random_uuid();
create unique index if not exists clients_intake_token_key on public.clients (intake_token);

create table if not exists public.intakes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.coaches (id) on delete cascade,
  client_id   uuid references public.clients (id) on delete set null,
  status      text not null default 'new' check (status in ('new', 'reviewed', 'converted', 'archived')),
  first_name  text not null check (length(first_name) between 1 and 80),
  last_name   text not null default '' check (length(last_name) <= 80),
  email       text check (length(email) <= 200),
  phone       text check (length(phone) <= 30),
  birth_date  date check (birth_date between date '1900-01-01' and current_date),
  sex         public.sex_type,
  height_cm   numeric(5,1) check (height_cm between 50 and 260),
  weight_kg   numeric(5,2) check (weight_kg between 20 and 400),
  goal        text check (length(goal) <= 200),
  service     text check (service in ('nutrition', 'training', 'both', 'personal')),
  answers     jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 32000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists intakes_coach_idx on public.intakes (coach_id, created_at desc);
create index if not exists intakes_client_idx on public.intakes (client_id);

alter table public.intakes enable row level security;
drop policy if exists "intakes: coach lee" on public.intakes;
create policy "intakes: coach lee" on public.intakes
  for select to authenticated using (coach_id = (select auth.uid()));
drop policy if exists "intakes: coach actualiza" on public.intakes;
create policy "intakes: coach actualiza" on public.intakes
  for update to authenticated using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
drop policy if exists "intakes: coach borra" on public.intakes;
create policy "intakes: coach borra" on public.intakes
  for delete to authenticated using (coach_id = (select auth.uid()));
revoke insert on public.intakes from anon, authenticated;
grant select, update (status, client_id, updated_at), delete on public.intakes to authenticated;

-- Al vincular una solicitud a un cliente, ese cliente debe ser del mismo coach.
create or replace function public.intakes_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients c where c.id = new.client_id and c.coach_id = new.coach_id) then
    raise exception 'Cliente inválido';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists intakes_guard on public.intakes;
create trigger intakes_guard before update on public.intakes
  for each row execute function public.intakes_guard();

-- Nombre del cliente dueño de un link de cuestionario (para saludarlo). Solo el nombre.
create or replace function public.intake_link_name(p_token uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select c.first_name from public.clients c where c.intake_token = p_token
$$;

-- Guarda un cuestionario. Con token, queda en el expediente de ese cliente.
create or replace function public.submit_intake(p jsonb, p_token uuid default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_coach  uuid;
  v_client uuid;
  v_id     uuid;
  v_name   text := left(btrim(coalesce(p->>'first_name', '')), 80);
  v_sex    text := nullif(p->>'sex', '');
begin
  if jsonb_typeof(p) is distinct from 'object' or pg_column_size(p) > 40000 then
    raise exception 'Datos inválidos' using errcode = '22023';
  end if;
  if v_name = '' then raise exception 'Falta el nombre' using errcode = '22023'; end if;

  if p_token is not null then
    select c.id, c.coach_id into v_client, v_coach from public.clients c where c.intake_token = p_token;
    if v_client is null then raise exception 'Link inválido' using errcode = '22023'; end if;
    if (select count(*) from public.intakes i where i.client_id = v_client and i.created_at > now() - interval '10 minutes') >= 3 then
      raise exception 'Demasiados envíos, probá más tarde' using errcode = '22023';
    end if;
  else
    select c.id into v_coach from public.coaches c order by c.created_at limit 1;
    if v_coach is null then raise exception 'Sin coach' using errcode = '22023'; end if;
    if (select count(*) from public.intakes i where i.client_id is null and i.created_at > now() - interval '1 hour') >= 30 then
      raise exception 'Demasiados envíos, probá más tarde' using errcode = '22023';
    end if;
  end if;

  insert into public.intakes (coach_id, client_id, first_name, last_name, email, phone, birth_date, sex,
                              height_cm, weight_kg, goal, service, answers)
  values (
    v_coach, v_client, v_name,
    left(btrim(coalesce(p->>'last_name', '')), 80),
    nullif(left(btrim(coalesce(p->>'email', '')), 200), ''),
    nullif(left(btrim(coalesce(p->>'phone', '')), 30), ''),
    nullif(p->>'birth_date', '')::date,
    case when v_sex in ('male', 'female', 'other') then v_sex::public.sex_type end,
    nullif(p->>'height_cm', '')::numeric,
    nullif(p->>'weight_kg', '')::numeric,
    nullif(left(btrim(coalesce(p->>'goal', '')), 200), ''),
    case when p->>'service' in ('nutrition', 'training', 'both', 'personal') then p->>'service' end,
    coalesce(p->'answers', '{}'::jsonb)
  )
  returning id into v_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (v_coach, 'intake_submitted',
          case when v_client is null then 'Nueva solicitud' else 'Cuestionario respondido' end,
          btrim(v_name || ' ' || left(btrim(coalesce(p->>'last_name', '')), 80)) || ' llenó el cuestionario inicial.',
          '/coach/solicitudes/' || v_id);
  return v_id;
end;
$$;

revoke execute on function public.submit_intake(jsonb, uuid) from public;
grant execute on function public.submit_intake(jsonb, uuid) to anon, authenticated;
revoke execute on function public.intake_link_name(uuid) from public;
grant execute on function public.intake_link_name(uuid) to anon, authenticated;
