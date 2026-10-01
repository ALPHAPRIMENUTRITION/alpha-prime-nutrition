-- =====================================================================
-- ALPHA PRIME NUTRITION · Suplementación dentro del plan nutricional
--  * El coach pauta suplementos por plan: producto, dosis, momento,
--    frecuencia e indicaciones. Texto libre: la app no decide dosis.
--  * Se copia junto con el plan (plantillas y duplicados).
--  * El cliente lo ve solo en su plan ACTIVO y con membresía con acceso.
-- =====================================================================

create table public.plan_supplements (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.nutrition_plans (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  dose        text check (char_length(dose) <= 60),
  timing      text check (char_length(timing) <= 60),
  frequency   text check (char_length(frequency) <= 60),
  notes       text check (char_length(notes) <= 500),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index plan_supplements_plan_idx on public.plan_supplements (plan_id, position);

create trigger set_updated_at before update on public.plan_supplements
  for each row execute function public.set_updated_at();

alter table public.plan_supplements enable row level security;

create policy "plan_supplements: leer" on public.plan_supplements
  for select to authenticated using (plan_id in (select public.nutrition_scope_plans(false)));
create policy "plan_supplements: escribir" on public.plan_supplements
  for all to authenticated
  using (plan_id in (select public.nutrition_scope_plans(true)))
  with check (plan_id in (select public.nutrition_scope_plans(true)));

revoke all on public.plan_supplements from anon;
grant select, insert, update, delete on public.plan_supplements to authenticated;

-- Historial: la auditoría genérica busca el cliente a través del plan.
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
    continue when v_key in ('id', 'updated_at', 'created_at', 'position');
    if coalesce(v_old -> v_key, 'null'::jsonb) is distinct from coalesce(v_new -> v_key, 'null'::jsonb) then
      v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
    end if;
  end loop;

  if tg_op = 'UPDATE' and v_changes = '{}'::jsonb then return null; end if;

  if tg_table_name = 'clients' then
    v_client := (v_row ->> 'id')::uuid;
  elsif v_row ? 'client_id' then
    v_client := (v_row ->> 'client_id')::uuid;
  elsif v_row ? 'plan_id' then
    select p.client_id into v_client from public.nutrition_plans p where p.id = (v_row ->> 'plan_id')::uuid;
  end if;
  select p.full_name into v_name from public.profiles p where p.id = auth.uid();

  insert into public.audit_logs (actor_id, actor_name, client_id, entity, entity_id, action, changes)
  values (auth.uid(), coalesce(v_name, 'Sistema'), v_client, tg_table_name,
          (v_row ->> 'id')::uuid, lower(tg_op), v_changes);
  return null;
end;
$$;
revoke execute on function public.audit_changes() from public, anon, authenticated;

create trigger audit_changes after insert or update or delete on public.plan_supplements
  for each row execute function public.audit_changes();

-- Copiar un plan ahora también copia su suplementación.
create or replace function public.nutrition_copy_plan(p_plan uuid, p_client uuid, p_name text)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_new uuid;
  d record;
  v_day uuid;
  m record;
begin
  insert into public.nutrition_plans (
    coach_id, client_id, name, start_date, weeks, is_active,
    target_kcal, target_protein_g, target_carbs_g, target_fat_g, calculation, notes)
  select auth.uid(), p_client, coalesce(nullif(trim(p_name), ''), p.name),
         case when p_client is null then null else current_date end,
         p.weeks, false,
         p.target_kcal, p.target_protein_g, p.target_carbs_g, p.target_fat_g,
         case when p_client is not null and p.client_id is distinct from p_client then null else p.calculation end,
         p.notes
  from public.nutrition_plans p where p.id = p_plan
  returning id into v_new;
  if v_new is null then raise exception 'Plan no encontrado' using errcode = 'P0002'; end if;

  for d in select * from public.nutrition_plan_days where plan_id = p_plan loop
    insert into public.nutrition_plan_days (plan_id, week_number, day_number, label)
    values (v_new, d.week_number, d.day_number, d.label) returning id into v_day;
    for m in select id from public.meals where day_id = d.id order by position loop
      perform public.nutrition_copy_meal(m.id, v_day);
    end loop;
  end loop;

  insert into public.plan_supplements (plan_id, name, dose, timing, frequency, notes, position)
  select v_new, s.name, s.dose, s.timing, s.frequency, s.notes, s.position
  from public.plan_supplements s where s.plan_id = p_plan;

  return v_new;
end;
$$;
