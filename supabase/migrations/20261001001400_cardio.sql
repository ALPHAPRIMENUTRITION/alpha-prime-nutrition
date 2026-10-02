-- =====================================================================
-- Cardio por tiempo: el coach pauta minutos e intensidad (en vez de
-- series/reps/lb) y el cliente registra los minutos que hizo.
-- =====================================================================
alter table public.workout_exercises
  add column if not exists duration_min numeric(5,1) check (duration_min between 0.5 and 600),
  add column if not exists intensity    text check (char_length(intensity) <= 60);

alter table public.workout_logs
  add column if not exists duration_min numeric(5,1) check (duration_min between 0.5 and 600);

-- Copiar día/semana: incluye minutos e intensidad
create or replace function public.workout_copy_day_into(
  p_src uuid, p_dst uuid, p_weight_pct numeric default 0, p_weight_kg numeric default 0,
  p_rir_delta numeric default 0, p_rpe_delta numeric default 0)
returns void
language plpgsql set search_path = ''
as $$
begin
  if p_src = p_dst then return; end if;
  update public.workout_days dst
     set name = src.name, notes = src.notes
    from public.workout_days src
   where src.id = p_src and dst.id = p_dst;
  delete from public.workout_exercises where day_id = p_dst;
  insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, weight_kg, rir, rpe, rest_seconds, tempo, notes, duration_min, intensity)
  select p_dst, e.exercise_id, e.position, e.sets, e.reps,
         case when e.weight_kg is null then null
              else greatest(0, round((e.weight_kg * (1 + coalesce(p_weight_pct, 0) / 100) + coalesce(p_weight_kg, 0)) * 2) / 2) end,
         case when e.rir is null then null else least(10, greatest(0, e.rir + coalesce(p_rir_delta, 0))) end,
         case when e.rpe is null then null else least(10, greatest(1, e.rpe + coalesce(p_rpe_delta, 0))) end,
         e.rest_seconds, e.tempo, e.notes, e.duration_min, e.intensity
  from public.workout_exercises e where e.day_id = p_src;
end;
$$;

-- Copiar rutina completa: incluye minutos e intensidad
create or replace function public.workout_copy_plan(p_plan uuid, p_client uuid, p_name text)
returns uuid
language plpgsql set search_path = ''
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
    insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, weight_kg, rir, rpe, rest_seconds, tempo, notes, duration_min, intensity)
    select v_day, e.exercise_id, e.position, e.sets, e.reps, e.weight_kg, e.rir, e.rpe, e.rest_seconds, e.tempo, e.notes, e.duration_min, e.intensity
    from public.workout_exercises e where e.day_id = d.id;
  end loop;
  return v_new;
end;
$$;
