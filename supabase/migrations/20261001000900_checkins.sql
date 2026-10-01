-- =====================================================================
-- ALPHA PRIME NUTRITION · Fase 5: check-ins y notificaciones
--  * La semana del check-in (lunes) la fija la base, con la hora de El Salvador.
--  * El cliente lee el día y las preguntas que configuró su coach.
--  * Notificaciones dentro de la app: check-in pendiente, check-in revisado,
--    plan nuevo y plan actualizado (sin spam: máximo 1 cada 6 horas).
--  * La tabla notifications ya guarda los canales enviados ("delivered"),
--    lista para sumar correo o push sin cambiar la estructura.
-- =====================================================================

alter type public.notification_type add value if not exists 'checkin_reviewed';

-- Fecha local (El Salvador) y lunes de la semana
create or replace function public.local_today()
returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'America/El_Salvador')::date $$;

create or replace function public.week_monday(p_date date)
returns date
language sql immutable set search_path = ''
as $$ select (p_date - ((extract(isodow from p_date)::int) - 1))::date $$;

-- Configuración del check-in y nombre que ve el cliente (los de SU coach)
create or replace function public.my_checkin_settings()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('weekday', co.checkin_weekday, 'config', co.checkin_config, 'coach_name', p.full_name)
  from public.clients c
  join public.coaches co on co.id = c.coach_id
  join public.profiles p on p.id = co.id
  where c.user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Guardia del check-in: el cliente no toca campos del coach, y la semana
-- la decide la base (no el navegador).
-- ---------------------------------------------------------------------
create or replace function public.checkins_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_training numeric;
begin
  if auth.uid() is not null and not public.is_coach_of(new.client_id) then
    if tg_op = 'INSERT' then
      new.week_start := public.week_monday(public.local_today());
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
      new.submitted_at := old.submitted_at;
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

-- ---------------------------------------------------------------------
-- Notificación al cliente cuando el coach revisa su check-in
-- ---------------------------------------------------------------------
create or replace function public.notify_checkin_reviewed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  if new.status = 'reviewed' and old.status is distinct from 'reviewed' then
    select c.user_id into v_user from public.clients c where c.id = new.client_id;
    if v_user is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_user, 'checkin_reviewed', 'Check-in revisado',
              'Tu coach revisó tu check-in y te dejó comentarios.', '/portal/checkin');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists checkins_notify_reviewed on public.checkins;
create trigger checkins_notify_reviewed
  after update on public.checkins
  for each row execute function public.notify_checkin_reviewed();

-- ---------------------------------------------------------------------
-- Plan nuevo / actualizado (nutrición y entrenamiento)
-- ---------------------------------------------------------------------
create or replace function public.notify_plan_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_link text := case when tg_table_name = 'workout_plans' then '/portal/entrenamiento' else '/portal/nutricion' end;
  v_what text := case when tg_table_name = 'workout_plans' then 'rutina de entrenamiento' else 'plan nutricional' end;
begin
  if new.client_id is null or not new.is_active then return new; end if;
  select c.user_id into v_user from public.clients c where c.id = new.client_id;
  if v_user is null then return new; end if;

  if tg_op = 'INSERT' or not coalesce(old.is_active, false) then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user, 'plan_new',
            case when tg_table_name = 'workout_plans' then 'Nueva rutina' else 'Nuevo plan nutricional' end,
            'Tu coach te asignó una nueva ' || v_what || ': ' || new.name || '.', v_link);
  elsif new.updated_at is distinct from old.updated_at
        and not exists (
          select 1 from public.notifications n
          where n.user_id = v_user and n.type = 'plan_updated' and n.link = v_link
            and n.created_at > now() - interval '6 hours')
  then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user, 'plan_updated', 'Plan actualizado',
            'Tu coach hizo cambios en tu ' || v_what || '.', v_link);
  end if;
  return new;
end;
$$;

drop trigger if exists nutrition_plans_notify on public.nutrition_plans;
create trigger nutrition_plans_notify
  after insert or update on public.nutrition_plans
  for each row execute function public.notify_plan_change();
drop trigger if exists workout_plans_notify on public.workout_plans;
create trigger workout_plans_notify
  after insert or update on public.workout_plans
  for each row execute function public.notify_plan_change();

-- ---------------------------------------------------------------------
-- Recordatorio de check-in pendiente (sin tareas programadas: se evalúa
-- cuando el cliente abre la app). Crea como máximo 1 aviso por semana.
-- ---------------------------------------------------------------------
create or replace function public.checkin_reminder_tick()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_weekday int;
  v_today date := public.local_today();
  v_monday date := public.week_monday(public.local_today());
  v_due date;
begin
  select c.id, co.checkin_weekday into v_client, v_weekday
  from public.clients c join public.coaches co on co.id = c.coach_id
  where c.user_id = auth.uid();
  if v_client is null or not public.client_has_access(v_client) then return false; end if;

  -- checkin_weekday: 0 = domingo … 6 = sábado → día dentro de la semana que empieza el lunes
  v_due := v_monday + ((v_weekday + 6) % 7);
  if v_today < v_due then return false; end if;
  if exists (select 1 from public.checkins k where k.client_id = v_client and k.week_start = v_monday) then return false; end if;
  if exists (select 1 from public.notifications n where n.user_id = auth.uid() and n.type = 'checkin_pending'
             and (n.created_at at time zone 'America/El_Salvador')::date >= v_monday) then return false; end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (auth.uid(), 'checkin_pending', 'Check-in pendiente', 'Te toca completar tu check-in semanal.', '/portal/checkin');
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Fotos del check-in: deben ser del mismo cliente que el check-in
-- ---------------------------------------------------------------------
create or replace function public.progress_photos_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.checkin_id is not null and not exists (
    select 1 from public.checkins k where k.id = new.checkin_id and k.client_id = new.client_id) then
    raise exception 'La foto no corresponde a ese check-in' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists progress_photos_guard on public.progress_photos;
create trigger progress_photos_guard
  before insert or update on public.progress_photos
  for each row execute function public.progress_photos_guard();

create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index if not exists checkins_status_idx on public.checkins (status, submitted_at desc);

revoke execute on function public.notify_checkin_reviewed(), public.notify_plan_change(), public.progress_photos_guard()
  from public, anon, authenticated;
revoke execute on function public.my_checkin_settings(), public.checkin_reminder_tick(), public.local_today(), public.week_monday(date)
  from public, anon;
grant execute on function public.my_checkin_settings(), public.checkin_reminder_tick(), public.local_today(), public.week_monday(date)
  to authenticated;
