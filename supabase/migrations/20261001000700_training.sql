-- =====================================================================
-- ALPHA PRIME NUTRITION · Fase 4: entrenamiento
--  * Catálogo base de ejercicios (global; el coach crea los suyos).
--  * Rutinas por semanas y días, periodización por semana.
--  * Copiar día, copiar semana (con progresión opcional), copiar rutina.
--  * Registro de cargas del cliente, validado en la base de datos.
--  * RLS con conjuntos de IDs calculados una vez por consulta.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogo base
-- ---------------------------------------------------------------------
insert into public.exercises (coach_id, name, muscle_group, equipment) values
  -- Pecho
  (null, 'Press de banca con barra', 'Pecho', 'Barra'),
  (null, 'Press de banca inclinado con barra', 'Pecho', 'Barra'),
  (null, 'Press con mancuernas plano', 'Pecho', 'Mancuernas'),
  (null, 'Press con mancuernas inclinado', 'Pecho', 'Mancuernas'),
  (null, 'Press en máquina', 'Pecho', 'Máquina'),
  (null, 'Aperturas con mancuernas', 'Pecho', 'Mancuernas'),
  (null, 'Cruce de poleas', 'Pecho', 'Polea'),
  (null, 'Pec deck', 'Pecho', 'Máquina'),
  (null, 'Fondos en paralelas', 'Pecho', 'Peso corporal'),
  (null, 'Lagartijas', 'Pecho', 'Peso corporal'),
  -- Espalda
  (null, 'Dominadas', 'Espalda', 'Peso corporal'),
  (null, 'Jalón al pecho', 'Espalda', 'Polea'),
  (null, 'Jalón con agarre neutro', 'Espalda', 'Polea'),
  (null, 'Remo con barra', 'Espalda', 'Barra'),
  (null, 'Remo con mancuerna a una mano', 'Espalda', 'Mancuernas'),
  (null, 'Remo sentado en polea', 'Espalda', 'Polea'),
  (null, 'Remo en máquina', 'Espalda', 'Máquina'),
  (null, 'Remo en T', 'Espalda', 'Barra'),
  (null, 'Pullover en polea', 'Espalda', 'Polea'),
  (null, 'Peso muerto convencional', 'Espalda', 'Barra'),
  -- Hombros
  (null, 'Press militar con barra', 'Hombros', 'Barra'),
  (null, 'Press de hombro con mancuernas', 'Hombros', 'Mancuernas'),
  (null, 'Press de hombro en máquina', 'Hombros', 'Máquina'),
  (null, 'Elevaciones laterales con mancuernas', 'Hombros', 'Mancuernas'),
  (null, 'Elevaciones laterales en polea', 'Hombros', 'Polea'),
  (null, 'Elevaciones frontales', 'Hombros', 'Mancuernas'),
  (null, 'Pájaros (deltoide posterior)', 'Hombros', 'Mancuernas'),
  (null, 'Face pull', 'Hombros', 'Polea'),
  (null, 'Encogimientos de hombros', 'Hombros', 'Mancuernas'),
  -- Bíceps
  (null, 'Curl con barra', 'Bíceps', 'Barra'),
  (null, 'Curl con mancuernas alterno', 'Bíceps', 'Mancuernas'),
  (null, 'Curl martillo', 'Bíceps', 'Mancuernas'),
  (null, 'Curl inclinado con mancuernas', 'Bíceps', 'Mancuernas'),
  (null, 'Curl predicador', 'Bíceps', 'Máquina'),
  (null, 'Curl en polea', 'Bíceps', 'Polea'),
  -- Tríceps
  (null, 'Extensión de tríceps en polea', 'Tríceps', 'Polea'),
  (null, 'Extensión de tríceps con cuerda', 'Tríceps', 'Polea'),
  (null, 'Press francés', 'Tríceps', 'Barra'),
  (null, 'Extensión sobre la cabeza con mancuerna', 'Tríceps', 'Mancuernas'),
  (null, 'Press de banca agarre cerrado', 'Tríceps', 'Barra'),
  (null, 'Fondos en banco', 'Tríceps', 'Peso corporal'),
  -- Cuádriceps
  (null, 'Sentadilla con barra', 'Cuádriceps', 'Barra'),
  (null, 'Sentadilla frontal', 'Cuádriceps', 'Barra'),
  (null, 'Sentadilla hack', 'Cuádriceps', 'Máquina'),
  (null, 'Prensa de piernas', 'Cuádriceps', 'Máquina'),
  (null, 'Extensión de cuádriceps', 'Cuádriceps', 'Máquina'),
  (null, 'Zancadas con mancuernas', 'Cuádriceps', 'Mancuernas'),
  (null, 'Sentadilla búlgara', 'Cuádriceps', 'Mancuernas'),
  (null, 'Sentadilla goblet', 'Cuádriceps', 'Mancuernas'),
  -- Isquiotibiales
  (null, 'Peso muerto rumano', 'Isquiotibiales', 'Barra'),
  (null, 'Peso muerto rumano con mancuernas', 'Isquiotibiales', 'Mancuernas'),
  (null, 'Curl femoral acostado', 'Isquiotibiales', 'Máquina'),
  (null, 'Curl femoral sentado', 'Isquiotibiales', 'Máquina'),
  (null, 'Buenos días', 'Isquiotibiales', 'Barra'),
  -- Glúteos
  (null, 'Hip thrust con barra', 'Glúteos', 'Barra'),
  (null, 'Puente de glúteo', 'Glúteos', 'Peso corporal'),
  (null, 'Patada de glúteo en polea', 'Glúteos', 'Polea'),
  (null, 'Abducción de cadera en máquina', 'Glúteos', 'Máquina'),
  -- Pantorrillas
  (null, 'Elevación de talones de pie', 'Pantorrillas', 'Máquina'),
  (null, 'Elevación de talones sentado', 'Pantorrillas', 'Máquina'),
  -- Core
  (null, 'Plancha', 'Core', 'Peso corporal'),
  (null, 'Crunch en polea', 'Core', 'Polea'),
  (null, 'Elevación de piernas colgado', 'Core', 'Peso corporal'),
  (null, 'Rueda abdominal', 'Core', 'Otro'),
  (null, 'Pallof press', 'Core', 'Polea'),
  -- Cardio
  (null, 'Caminadora', 'Cardio', 'Máquina'),
  (null, 'Bicicleta estática', 'Cardio', 'Máquina'),
  (null, 'Elíptica', 'Cardio', 'Máquina'),
  (null, 'Escaladora', 'Cardio', 'Máquina'),
  (null, 'Remo ergómetro', 'Cardio', 'Máquina'),
  (null, 'HIIT', 'Cardio', 'Otro');

create index if not exists exercises_name_idx on public.exercises (lower(name));
create unique index if not exists exercises_coach_name_idx on public.exercises (coalesce(coach_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- Notas por día (calentamiento, indicaciones) y orden de grupos musculares
alter table public.workout_days add column if not exists notes text check (char_length(notes) <= 1000);

-- ---------------------------------------------------------------------
-- RLS rápida (mismo esquema que nutrición)
-- ---------------------------------------------------------------------
create or replace function public.workout_scope_plans(p_write boolean)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select p.id from public.workout_plans p where p.coach_id = auth.uid()
  union all
  select p.id from public.workout_plans p
  where not p_write
    and p.is_active
    and p.client_id = public.my_client_id()
    and public.client_has_access(p.client_id)
$$;

create or replace function public.workout_scope_days(p_write boolean)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select d.id from public.workout_days d where d.plan_id in (select public.workout_scope_plans(p_write))
$$;

revoke execute on function public.workout_scope_plans(boolean), public.workout_scope_days(boolean) from public, anon;
grant execute on function public.workout_scope_plans(boolean), public.workout_scope_days(boolean) to authenticated;

alter policy "workout_plans: leer" on public.workout_plans
  using (coach_id = (select auth.uid())
         or (is_active
             and client_id = (select public.my_client_id())
             and (select public.client_has_access(public.my_client_id()))));
alter policy "workout_plans: coach escribe" on public.workout_plans
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and (client_id is null or public.is_coach_of(client_id)));

alter policy "workout_days: leer" on public.workout_days
  using (plan_id in (select public.workout_scope_plans(false)));
alter policy "workout_days: escribir" on public.workout_days
  using (plan_id in (select public.workout_scope_plans(true)))
  with check (plan_id in (select public.workout_scope_plans(true)));

alter policy "workout_exercises: leer" on public.workout_exercises
  using (day_id in (select public.workout_scope_days(false)));
alter policy "workout_exercises: escribir" on public.workout_exercises
  using (day_id in (select public.workout_scope_days(true)))
  with check (day_id in (select public.workout_scope_days(true)));

-- ---------------------------------------------------------------------
-- Registro de cargas: el cliente solo registra sobre SU rutina activa y el
-- ejercicio debe coincidir con el prescrito. Se valida aquí, no en la app.
-- ---------------------------------------------------------------------
create or replace function public.workout_logs_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_exercise uuid;
  v_active boolean;
begin
  if new.workout_exercise_id is not null then
    select p.client_id, we.exercise_id, p.is_active into v_client, v_exercise, v_active
    from public.workout_exercises we
    join public.workout_days d on d.id = we.day_id
    join public.workout_plans p on p.id = d.plan_id
    where we.id = new.workout_exercise_id;
    if v_client is null or v_client <> new.client_id then
      raise exception 'Ejercicio fuera de tu rutina' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      if not v_active then
        raise exception 'Esa rutina ya no está activa' using errcode = '42501';
      end if;
      new.exercise_id := v_exercise;
    elsif new.exercise_id <> v_exercise then
      raise exception 'Ejercicio inválido' using errcode = '22023';
    end if;
  end if;
  if new.performed_at > current_date + 1 then
    raise exception 'La fecha no puede ser futura' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function public.workout_logs_guard() from public, anon, authenticated;
drop trigger if exists workout_logs_guard on public.workout_logs;
create trigger workout_logs_guard before insert or update on public.workout_logs
  for each row execute function public.workout_logs_guard();

create unique index if not exists workout_logs_unique_set
  on public.workout_logs (client_id, workout_exercise_id, performed_at, set_number);

-- ---------------------------------------------------------------------
-- Funciones (SECURITY INVOKER: RLS decide)
-- ---------------------------------------------------------------------
create or replace function public.workout_ensure_day(p_plan uuid, p_week int, p_day int)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_weeks int;
  v_id uuid;
begin
  select weeks into v_weeks from public.workout_plans where id = p_plan and coach_id = auth.uid();
  if v_weeks is null then raise exception 'Rutina no encontrada' using errcode = 'P0002'; end if;
  if p_week < 1 or p_week > v_weeks or p_day < 1 or p_day > 7 then
    raise exception 'Semana o día fuera de rango' using errcode = '22023';
  end if;
  select id into v_id from public.workout_days where plan_id = p_plan and week_number = p_week and day_number = p_day;
  if v_id is null then
    insert into public.workout_days (plan_id, week_number, day_number) values (p_plan, p_week, p_day) returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Copia los ejercicios de un día a otro (reemplaza el destino), con
-- progresión opcional: % y/o kg sobre el peso, y cambio de RIR / RPE.
create or replace function public.workout_copy_day_into(
  p_src uuid, p_dst uuid,
  p_weight_pct numeric default 0, p_weight_kg numeric default 0,
  p_rir_delta numeric default 0, p_rpe_delta numeric default 0)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if p_src = p_dst then return; end if;
  update public.workout_days dst
     set name = src.name, notes = src.notes
    from public.workout_days src
   where src.id = p_src and dst.id = p_dst;
  delete from public.workout_exercises where day_id = p_dst;
  insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, weight_kg, rir, rpe, rest_seconds, tempo, notes)
  select p_dst, e.exercise_id, e.position, e.sets, e.reps,
         case when e.weight_kg is null then null
              else greatest(0, round((e.weight_kg * (1 + coalesce(p_weight_pct, 0) / 100) + coalesce(p_weight_kg, 0)) * 2) / 2) end,
         case when e.rir is null then null else least(10, greatest(0, e.rir + coalesce(p_rir_delta, 0))) end,
         case when e.rpe is null then null else least(10, greatest(1, e.rpe + coalesce(p_rpe_delta, 0))) end,
         e.rest_seconds, e.tempo, e.notes
  from public.workout_exercises e where e.day_id = p_src;
end;
$$;

-- p_targets: [{"week": 1, "day": 2}, ...]
create or replace function public.workout_copy_day(p_src_day uuid, p_targets jsonb)
returns int
language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan uuid;
  t jsonb;
  v_dst uuid;
  n int := 0;
begin
  select plan_id into v_plan from public.workout_days where id = p_src_day;
  if v_plan is null then raise exception 'Día no encontrado' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_targets) <> 'array' then raise exception 'Destinos inválidos' using errcode = '22023'; end if;
  for t in select * from jsonb_array_elements(p_targets) loop
    v_dst := public.workout_ensure_day(v_plan, (t ->> 'week')::int, (t ->> 'day')::int);
    continue when v_dst = p_src_day;
    perform public.workout_copy_day_into(p_src_day, v_dst);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Copia una semana completa a otras semanas, con progresión acumulada:
-- la semana destino N recibe (N - origen) veces el incremento.
create or replace function public.workout_copy_week(
  p_plan uuid, p_src_week int, p_targets int[],
  p_weight_pct numeric default 0, p_weight_kg numeric default 0,
  p_rir_delta numeric default 0, p_rpe_delta numeric default 0)
returns int
language plpgsql security invoker set search_path = ''
as $$
declare
  w int;
  d int;
  v_src uuid;
  v_dst uuid;
  k numeric;
  n int := 0;
begin
  if not exists (select 1 from public.workout_plans where id = p_plan and coach_id = auth.uid()) then
    raise exception 'Rutina no encontrada' using errcode = 'P0002';
  end if;
  foreach w in array coalesce(p_targets, '{}') loop
    continue when w = p_src_week;
    k := w - p_src_week;
    for d in 1..7 loop
      select id into v_src from public.workout_days where plan_id = p_plan and week_number = p_src_week and day_number = d;
      if v_src is null then
        -- día vacío en el origen: vaciar el destino si existe
        delete from public.workout_exercises where day_id in
          (select id from public.workout_days where plan_id = p_plan and week_number = w and day_number = d);
        update public.workout_days set name = null, notes = null where plan_id = p_plan and week_number = w and day_number = d;
        continue;
      end if;
      v_dst := public.workout_ensure_day(p_plan, w, d);
      perform public.workout_copy_day_into(v_src, v_dst, p_weight_pct * k, p_weight_kg * k, p_rir_delta * k, p_rpe_delta * k);
    end loop;
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.workout_copy_plan(p_plan uuid, p_client uuid, p_name text)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_new uuid;
  d record;
  v_day uuid;
begin
  insert into public.workout_plans (coach_id, client_id, name, start_date, weeks, is_active, periodization, notes)
  select auth.uid(), p_client, coalesce(nullif(trim(p_name), ''), p.name),
         case when p_client is null then null else current_date end,
         p.weeks, false, p.periodization, p.notes
  from public.workout_plans p where p.id = p_plan
  returning id into v_new;
  if v_new is null then raise exception 'Rutina no encontrada' using errcode = 'P0002'; end if;

  for d in select * from public.workout_days where plan_id = p_plan loop
    insert into public.workout_days (plan_id, week_number, day_number, name, notes)
    values (v_new, d.week_number, d.day_number, d.name, d.notes) returning id into v_day;
    insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, weight_kg, rir, rpe, rest_seconds, tempo, notes)
    select v_day, e.exercise_id, e.position, e.sets, e.reps, e.weight_kg, e.rir, e.rpe, e.rest_seconds, e.tempo, e.notes
    from public.workout_exercises e where e.day_id = d.id;
  end loop;
  return v_new;
end;
$$;

create or replace function public.workout_set_active(p_plan uuid, p_active boolean)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_client uuid;
begin
  select client_id into v_client from public.workout_plans where id = p_plan and coach_id = auth.uid();
  if v_client is null then raise exception 'Rutina no encontrada' using errcode = 'P0002'; end if;
  if p_active then
    update public.workout_plans set is_active = false where client_id = v_client and id <> p_plan and is_active;
  end if;
  update public.workout_plans
     set is_active = p_active,
         start_date = case when p_active and start_date is null then current_date else start_date end
   where id = p_plan;
end;
$$;

revoke execute on function
  public.workout_ensure_day(uuid, int, int),
  public.workout_copy_day_into(uuid, uuid, numeric, numeric, numeric, numeric),
  public.workout_copy_day(uuid, jsonb),
  public.workout_copy_week(uuid, int, int[], numeric, numeric, numeric, numeric),
  public.workout_copy_plan(uuid, uuid, text),
  public.workout_set_active(uuid, boolean)
from public, anon;
grant execute on function
  public.workout_ensure_day(uuid, int, int),
  public.workout_copy_day_into(uuid, uuid, numeric, numeric, numeric, numeric),
  public.workout_copy_day(uuid, jsonb),
  public.workout_copy_week(uuid, int, int[], numeric, numeric, numeric, numeric),
  public.workout_copy_plan(uuid, uuid, text),
  public.workout_set_active(uuid, boolean)
to authenticated;
