-- =====================================================================
-- ALPHA PRIME NUTRITION · Seguridad, reglas de negocio y vistas
--  * Row Level Security en todas las tablas.
--  * Cada cliente solo ve SUS filas, aunque cambie IDs en la URL.
--  * El estado de membresía se calcula en la base de datos, nunca en el
--    navegador, y bloquea el contenido privado cuando vence la gracia.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funciones auxiliares (security definer: leen sin pasar por RLS para
-- evitar recursión, pero solo responden sobre auth.uid()).
-- ---------------------------------------------------------------------
create or replace function public.app_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_coach_of(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.clients c where c.id = p_client and c.coach_id = auth.uid())
$$;

create or replace function public.is_self_client(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.clients c where c.id = p_client and c.user_id = auth.uid())
$$;

create or replace function public.my_coach_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select c.coach_id from public.clients c where c.user_id = auth.uid() $$;

-- Estados posibles:
--   active    → al día
--   past_due  → el último cobro falló pero el periodo pagado sigue vigente (advertencia)
--   grace     → venció el periodo, está dentro de los días de gracia (advertencia)
--   expired   → venció la gracia: sin acceso al contenido privado
--   suspended → suspendido manualmente por el coach
create or replace function public.membership_status(p_client uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_status      public.client_status;
  v_renewal     date;
  v_grace       integer;
  v_sub_status  public.subscription_status;
  v_period_end  timestamptz;
  v_paid_until  date;
begin
  select c.status, c.renewal_date, co.grace_period_days
    into v_status, v_renewal, v_grace
  from public.clients c
  join public.coaches co on co.id = c.coach_id
  where c.id = p_client;

  if not found then return null; end if;
  -- Nadie puede consultar el estado de un cliente ajeno
  if auth.uid() is not null and not (public.is_coach_of(p_client) or public.is_self_client(p_client)) then
    return null;
  end if;
  if v_status = 'suspended' then return 'suspended'; end if;

  select s.status, s.current_period_end into v_sub_status, v_period_end
  from public.subscriptions s where s.client_id = p_client;

  -- Suscripción activa en Stripe sin fecha de corte → activo
  if v_sub_status in ('active', 'trialing') and v_period_end is null then
    return 'active';
  end if;

  v_paid_until := greatest(v_renewal, (v_period_end at time zone 'UTC')::date);
  if v_paid_until is null then return 'expired'; end if;

  if v_paid_until >= current_date then
    if v_sub_status in ('past_due', 'unpaid') then return 'past_due'; end if;
    return 'active';
  end if;

  if v_paid_until + v_grace >= current_date then return 'grace'; end if;
  return 'expired';
end;
$$;

-- El cliente puede ver su plan, rutinas, progreso y check-ins solo si
-- su membresía da acceso. El coach conserva siempre el acceso.
create or replace function public.client_has_access(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_self_client(p_client)
     and public.membership_status(p_client) in ('active', 'past_due', 'grace')
$$;

create or replace function public.can_read_client_content(p_client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_coach_of(p_client) or public.client_has_access(p_client) $$;

-- Permisos sobre planes (las plantillas tienen client_id null)
create or replace function public.can_read_nutrition_plan(p_plan uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.nutrition_plans p
    where p.id = p_plan
      and (p.coach_id = auth.uid() or (p.client_id is not null and public.client_has_access(p.client_id)))
  )
$$;

create or replace function public.can_write_nutrition_plan(p_plan uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.nutrition_plans p where p.id = p_plan and p.coach_id = auth.uid()) $$;

create or replace function public.can_read_workout_plan(p_plan uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workout_plans p
    where p.id = p_plan
      and (p.coach_id = auth.uid() or (p.client_id is not null and public.client_has_access(p.client_id)))
  )
$$;

create or replace function public.can_write_workout_plan(p_plan uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.workout_plans p where p.id = p_plan and p.coach_id = auth.uid()) $$;

-- ---------------------------------------------------------------------
-- Triggers de negocio
-- ---------------------------------------------------------------------

-- Nuevo usuario de Auth → perfil. El rol sale de app_metadata (solo
-- escribible con la service role), nunca de user_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'client')::public.user_role;
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  if v_role = 'coach' then
    insert into public.coaches (id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Supabase Auth puede guardar app_metadata en un UPDATE posterior al
-- INSERT (p. ej. admin.createUser). Este trigger mantiene el rol al día.
create or replace function public.sync_user_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  v_role := nullif(new.raw_app_meta_data ->> 'role', '')::public.user_role;
  if v_role is null then return new; end if;

  update public.profiles set role = v_role where id = new.id and role is distinct from v_role;
  if v_role = 'coach' then
    insert into public.coaches (id) values (new.id) on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_role_changed
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data ->> 'role' is distinct from new.raw_app_meta_data ->> 'role')
  execute function public.sync_user_role();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','coaches','clients','client_profiles','coach_notes','foods',
    'nutrition_plans','workout_plans','subscriptions'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Check-in: calcula una adherencia sugerida (60 % nutrición + 40 %
-- entrenamientos completados) y evita que el cliente toque campos del coach.
create or replace function public.checkins_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_training numeric;
begin
  if auth.uid() is not null and not public.is_coach_of(new.client_id) then
    if tg_op = 'INSERT' then
      new.coach_adherence_override := null;
      new.coach_feedback := null;
      new.status := 'submitted';
      new.reviewed_at := null;
      new.submitted_at := now();
    else
      new.client_id := old.client_id;
      new.week_start := old.week_start;
      new.coach_adherence_override := old.coach_adherence_override;
      new.coach_feedback := old.coach_feedback;
      new.status := old.status;
      new.reviewed_at := old.reviewed_at;
    end if;
  end if;

  if new.workouts_planned > 0 and new.workouts_completed is not null then
    v_training := least(100, new.workouts_completed * 100.0 / new.workouts_planned);
  end if;

  new.adherence_score := case
    when new.nutrition_adherence_pct is not null and v_training is not null
      then round(new.nutrition_adherence_pct * 0.6 + v_training * 0.4)
    when new.nutrition_adherence_pct is not null then new.nutrition_adherence_pct
    when v_training is not null then round(v_training)
    else null
  end;
  return new;
end;
$$;

create trigger checkins_guard
  before insert or update on public.checkins
  for each row execute function public.checkins_guard();

-- Al completar un check-in se avisa al coach dentro de la app.
create or replace function public.notify_checkin_submitted()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_coach uuid;
  v_name  text;
begin
  select c.coach_id, trim(c.first_name || ' ' || c.last_name) into v_coach, v_name
  from public.clients c where c.id = new.client_id;

  insert into public.notifications (user_id, type, title, body, link, created_at)
  values (v_coach, 'checkin_submitted', 'Nuevo check-in',
          v_name || ' completó su check-in semanal.',
          '/coach/clientes/' || new.client_id,
          coalesce(new.submitted_at, now()));
  return new;
end;
$$;

create trigger checkins_notify
  after insert on public.checkins
  for each row execute function public.notify_checkin_submitted();

-- Auditoría genérica: guarda qué campos cambiaron, quién y cuándo.
create or replace function public.audit_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old     jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else '{}'::jsonb end;
  v_new     jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}'::jsonb end;
  v_row     jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
  v_changes jsonb := '{}'::jsonb;
  v_key     text;
  v_client  uuid;
  v_name    text;
begin
  for v_key in select jsonb_object_keys(v_old || v_new) loop
    continue when v_key in ('id', 'updated_at', 'created_at');
    if coalesce(v_old -> v_key, 'null'::jsonb) is distinct from coalesce(v_new -> v_key, 'null'::jsonb) then
      v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
    end if;
  end loop;

  if tg_op = 'UPDATE' and v_changes = '{}'::jsonb then return null; end if;

  v_client := case when tg_table_name = 'clients' then (v_row ->> 'id')::uuid
                   else (v_row ->> 'client_id')::uuid end;
  select p.full_name into v_name from public.profiles p where p.id = auth.uid();

  insert into public.audit_logs (actor_id, actor_name, client_id, entity, entity_id, action, changes)
  values (auth.uid(), coalesce(v_name, 'Sistema'), v_client, tg_table_name,
          (v_row ->> 'id')::uuid, lower(tg_op), v_changes);
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'clients','client_profiles','measurements','body_composition',
    'nutrition_plans','workout_plans','subscriptions','checkins'
  ] loop
    execute format('create trigger audit_changes after insert or update or delete on public.%I
                    for each row execute function public.audit_changes()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- profiles
create policy "profiles: leer el propio" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: el coach lee a sus clientes" on public.profiles
  for select to authenticated
  using (exists (select 1 from public.clients c where c.user_id = profiles.id and c.coach_id = auth.uid()));
create policy "profiles: el cliente lee a su coach" on public.profiles
  for select to authenticated using (id = public.my_coach_id());
create policy "profiles: editar el propio" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- coaches
create policy "coaches: leer el propio" on public.coaches
  for select to authenticated using (id = auth.uid() or id = public.my_coach_id());
create policy "coaches: editar el propio" on public.coaches
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- clients
create policy "clients: coach lee los suyos" on public.clients
  for select to authenticated using (coach_id = auth.uid());
create policy "clients: cliente lee su ficha" on public.clients
  for select to authenticated using (user_id = auth.uid());
create policy "clients: coach crea" on public.clients
  for insert to authenticated with check (coach_id = auth.uid() and public.app_role() = 'coach');
create policy "clients: coach edita" on public.clients
  for update to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "clients: coach elimina" on public.clients
  for delete to authenticated using (coach_id = auth.uid());

-- client_profiles
create policy "client_profiles: coach todo" on public.client_profiles
  for all to authenticated using (public.is_coach_of(client_id)) with check (public.is_coach_of(client_id));
create policy "client_profiles: cliente lee" on public.client_profiles
  for select to authenticated using (public.is_self_client(client_id));

-- coach_notes (el cliente nunca las ve)
create policy "coach_notes: solo coach" on public.coach_notes
  for all to authenticated
  using (coach_id = auth.uid() and public.is_coach_of(client_id))
  with check (coach_id = auth.uid() and public.is_coach_of(client_id));

-- measurements / body_composition
create policy "measurements: coach todo" on public.measurements
  for all to authenticated using (public.is_coach_of(client_id)) with check (public.is_coach_of(client_id));
create policy "measurements: cliente lee con acceso" on public.measurements
  for select to authenticated using (public.client_has_access(client_id));
create policy "body_composition: coach todo" on public.body_composition
  for all to authenticated using (public.is_coach_of(client_id)) with check (public.is_coach_of(client_id));
create policy "body_composition: cliente lee con acceso" on public.body_composition
  for select to authenticated using (public.client_has_access(client_id));

-- foods / exercises: catálogo global + propios del coach
create policy "foods: leer" on public.foods
  for select to authenticated
  using (coach_id is null or coach_id = auth.uid() or coach_id = public.my_coach_id());
create policy "foods: coach gestiona los suyos" on public.foods
  for all to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "exercises: leer" on public.exercises
  for select to authenticated
  using (coach_id is null or coach_id = auth.uid() or coach_id = public.my_coach_id());
create policy "exercises: coach gestiona los suyos" on public.exercises
  for all to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- nutrition_plans y su árbol
create policy "nutrition_plans: leer" on public.nutrition_plans
  for select to authenticated
  using (coach_id = auth.uid() or (client_id is not null and public.client_has_access(client_id)));
create policy "nutrition_plans: coach escribe" on public.nutrition_plans
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and (client_id is null or public.is_coach_of(client_id)));

create policy "nutrition_plan_days: leer" on public.nutrition_plan_days
  for select to authenticated using (public.can_read_nutrition_plan(plan_id));
create policy "nutrition_plan_days: escribir" on public.nutrition_plan_days
  for all to authenticated using (public.can_write_nutrition_plan(plan_id)) with check (public.can_write_nutrition_plan(plan_id));

create policy "meals: leer" on public.meals
  for select to authenticated
  using (exists (select 1 from public.nutrition_plan_days d where d.id = day_id and public.can_read_nutrition_plan(d.plan_id)));
create policy "meals: escribir" on public.meals
  for all to authenticated
  using (exists (select 1 from public.nutrition_plan_days d where d.id = day_id and public.can_write_nutrition_plan(d.plan_id)))
  with check (exists (select 1 from public.nutrition_plan_days d where d.id = day_id and public.can_write_nutrition_plan(d.plan_id)));

create policy "meal_options: leer" on public.meal_options
  for select to authenticated
  using (exists (select 1 from public.meals m join public.nutrition_plan_days d on d.id = m.day_id
                 where m.id = meal_id and public.can_read_nutrition_plan(d.plan_id)));
create policy "meal_options: escribir" on public.meal_options
  for all to authenticated
  using (exists (select 1 from public.meals m join public.nutrition_plan_days d on d.id = m.day_id
                 where m.id = meal_id and public.can_write_nutrition_plan(d.plan_id)))
  with check (exists (select 1 from public.meals m join public.nutrition_plan_days d on d.id = m.day_id
                 where m.id = meal_id and public.can_write_nutrition_plan(d.plan_id)));

create policy "meal_items: leer" on public.meal_items
  for select to authenticated
  using (exists (select 1 from public.meal_options o join public.meals m on m.id = o.meal_id
                 join public.nutrition_plan_days d on d.id = m.day_id
                 where o.id = meal_option_id and public.can_read_nutrition_plan(d.plan_id)));
create policy "meal_items: escribir" on public.meal_items
  for all to authenticated
  using (exists (select 1 from public.meal_options o join public.meals m on m.id = o.meal_id
                 join public.nutrition_plan_days d on d.id = m.day_id
                 where o.id = meal_option_id and public.can_write_nutrition_plan(d.plan_id)))
  with check (exists (select 1 from public.meal_options o join public.meals m on m.id = o.meal_id
                 join public.nutrition_plan_days d on d.id = m.day_id
                 where o.id = meal_option_id and public.can_write_nutrition_plan(d.plan_id)));

create policy "food_substitutions: leer" on public.food_substitutions
  for select to authenticated
  using (exists (select 1 from public.meal_items i join public.meal_options o on o.id = i.meal_option_id
                 join public.meals m on m.id = o.meal_id join public.nutrition_plan_days d on d.id = m.day_id
                 where i.id = meal_item_id and public.can_read_nutrition_plan(d.plan_id)));
create policy "food_substitutions: escribir" on public.food_substitutions
  for all to authenticated
  using (exists (select 1 from public.meal_items i join public.meal_options o on o.id = i.meal_option_id
                 join public.meals m on m.id = o.meal_id join public.nutrition_plan_days d on d.id = m.day_id
                 where i.id = meal_item_id and public.can_write_nutrition_plan(d.plan_id)))
  with check (exists (select 1 from public.meal_items i join public.meal_options o on o.id = i.meal_option_id
                 join public.meals m on m.id = o.meal_id join public.nutrition_plan_days d on d.id = m.day_id
                 where i.id = meal_item_id and public.can_write_nutrition_plan(d.plan_id)));

-- workout_plans y su árbol
create policy "workout_plans: leer" on public.workout_plans
  for select to authenticated
  using (coach_id = auth.uid() or (client_id is not null and public.client_has_access(client_id)));
create policy "workout_plans: coach escribe" on public.workout_plans
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and (client_id is null or public.is_coach_of(client_id)));

create policy "workout_days: leer" on public.workout_days
  for select to authenticated using (public.can_read_workout_plan(plan_id));
create policy "workout_days: escribir" on public.workout_days
  for all to authenticated using (public.can_write_workout_plan(plan_id)) with check (public.can_write_workout_plan(plan_id));

create policy "workout_exercises: leer" on public.workout_exercises
  for select to authenticated
  using (exists (select 1 from public.workout_days d where d.id = day_id and public.can_read_workout_plan(d.plan_id)));
create policy "workout_exercises: escribir" on public.workout_exercises
  for all to authenticated
  using (exists (select 1 from public.workout_days d where d.id = day_id and public.can_write_workout_plan(d.plan_id)))
  with check (exists (select 1 from public.workout_days d where d.id = day_id and public.can_write_workout_plan(d.plan_id)));

-- workout_logs: el cliente registra sus cargas; el coach las ve
create policy "workout_logs: leer" on public.workout_logs
  for select to authenticated using (public.can_read_client_content(client_id));
create policy "workout_logs: cliente registra" on public.workout_logs
  for insert to authenticated with check (public.client_has_access(client_id));
create policy "workout_logs: cliente corrige" on public.workout_logs
  for update to authenticated using (public.client_has_access(client_id)) with check (public.client_has_access(client_id));
create policy "workout_logs: cliente borra" on public.workout_logs
  for delete to authenticated using (public.client_has_access(client_id));

-- checkins
create policy "checkins: leer" on public.checkins
  for select to authenticated using (public.can_read_client_content(client_id));
create policy "checkins: cliente envía" on public.checkins
  for insert to authenticated with check (public.client_has_access(client_id));
create policy "checkins: cliente corrige antes de revisión" on public.checkins
  for update to authenticated
  using (public.client_has_access(client_id) and status = 'submitted')
  with check (public.client_has_access(client_id));
create policy "checkins: coach revisa" on public.checkins
  for update to authenticated using (public.is_coach_of(client_id)) with check (public.is_coach_of(client_id));

-- progress_photos
create policy "progress_photos: leer" on public.progress_photos
  for select to authenticated using (public.can_read_client_content(client_id));
create policy "progress_photos: subir" on public.progress_photos
  for insert to authenticated with check (public.can_read_client_content(client_id) and uploaded_by = auth.uid());
create policy "progress_photos: coach borra" on public.progress_photos
  for delete to authenticated using (public.is_coach_of(client_id));

-- subscriptions / payments: lectura; escritura solo desde el backend
create policy "subscriptions: leer" on public.subscriptions
  for select to authenticated using (public.is_coach_of(client_id) or public.is_self_client(client_id));
create policy "payments: leer" on public.payments
  for select to authenticated using (public.is_coach_of(client_id) or public.is_self_client(client_id));

-- notifications
create policy "notifications: leer las propias" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: marcar leídas" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_logs: solo el coach del cliente
create policy "audit_logs: coach lee" on public.audit_logs
  for select to authenticated using (public.is_coach_of(client_id));

-- stripe_events: sin políticas → solo service role.

-- ---------------------------------------------------------------------
-- Privilegios por columna (defensa adicional a RLS)
-- ---------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

revoke update on public.coaches from authenticated;
grant update (business_name, grace_period_days, checkin_weekday, checkin_config) on public.coaches to authenticated;

-- user_id (vínculo con la cuenta) y coach_id solo los cambia el backend
revoke update on public.clients from authenticated;
grant update (first_name, last_name, email, phone, goal, status, start_date, renewal_date)
  on public.clients to authenticated;

revoke insert, update, delete on public.subscriptions, public.payments, public.stripe_events,
  public.audit_logs from authenticated;
revoke select on public.stripe_events from authenticated;

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke insert, delete on public.notifications from authenticated;

-- ---------------------------------------------------------------------
-- Vista del dashboard del coach (respeta RLS del usuario que consulta)
-- ---------------------------------------------------------------------
create or replace view public.coach_client_overview
with (security_invoker = true) as
select
  c.id,
  c.coach_id,
  c.first_name,
  c.last_name,
  c.email,
  c.goal,
  c.status,
  c.start_date,
  c.renewal_date,
  p.avatar_url,
  w.weight_kg                                     as current_weight_kg,
  bf.body_fat_pct                                 as current_body_fat_pct,
  adh.adherence_pct,
  lc.last_checkin_at,
  public.membership_status(c.id)                  as membership_status,
  (c.renewal_date - current_date)                 as days_to_renewal,
  (c.status = 'active'
     and c.start_date <= current_date - 7
     and (lc.last_checkin_at is null or lc.last_checkin_at < now() - interval '7 days'))
                                                  as checkin_pending
from public.clients c
left join public.profiles p on p.id = c.user_id
left join lateral (
  select x.weight_kg from (
    select m.weight_kg, m.measured_at::timestamptz as at from public.measurements m
      where m.client_id = c.id and m.weight_kg is not null
    union all
    select k.weight_kg, k.submitted_at from public.checkins k
      where k.client_id = c.id and k.weight_kg is not null
  ) x order by x.at desc limit 1
) w on true
left join lateral (
  select b.body_fat_pct from public.body_composition b
  where b.client_id = c.id and b.body_fat_pct is not null
  order by b.measured_at desc limit 1
) bf on true
left join lateral (
  select round(avg(coalesce(k.coach_adherence_override, k.adherence_score)))::int as adherence_pct
  from (select * from public.checkins k2 where k2.client_id = c.id order by k2.submitted_at desc limit 4) k
) adh on true
left join lateral (
  select max(k.submitted_at) as last_checkin_at from public.checkins k where k.client_id = c.id
) lc on true;

grant select on public.coach_client_overview to authenticated;
revoke all on public.coach_client_overview from anon;

-- Métricas del dashboard en una sola consulta
create or replace function public.coach_dashboard_stats()
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'total',            count(*),
    'active',           count(*) filter (where o.membership_status in ('active', 'past_due')),
    'expiring_soon',    count(*) filter (where o.membership_status = 'active' and o.days_to_renewal between 0 and 7),
    'overdue',          count(*) filter (where o.membership_status in ('grace', 'expired', 'past_due')),
    'expired',          count(*) filter (where o.membership_status = 'expired'),
    'suspended',        count(*) filter (where o.membership_status = 'suspended'),
    'checkins_pending', count(*) filter (where o.checkin_pending),
    'low_adherence',    count(*) filter (where o.adherence_pct < 70),
    'revenue_30d_cents', (
      select coalesce(sum(pay.amount_cents), 0) from public.payments pay
      where pay.status = 'succeeded' and pay.paid_at >= now() - interval '30 days'
        and public.is_coach_of(pay.client_id)
    )
  )
  from public.coach_client_overview o
  where o.coach_id = auth.uid()
$$;

-- Funciones expuestas a usuarios autenticados únicamente
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.app_role(), public.is_coach_of(uuid), public.is_self_client(uuid), public.my_coach_id(),
  public.membership_status(uuid), public.client_has_access(uuid), public.can_read_client_content(uuid),
  public.can_read_nutrition_plan(uuid), public.can_write_nutrition_plan(uuid),
  public.can_read_workout_plan(uuid), public.can_write_workout_plan(uuid),
  public.coach_dashboard_stats()
to authenticated;

-- Las funciones de trigger no se exponen como RPC
revoke execute on function public.audit_changes(), public.checkins_guard(), public.handle_new_user(),
  public.notify_checkin_submitted(), public.sync_user_role(), public.set_updated_at()
  from public, anon, authenticated;
