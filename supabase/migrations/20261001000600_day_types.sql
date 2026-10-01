-- =====================================================================
-- ALPHA PRIME NUTRITION · Tipos de día dentro del plan
--  * Ej.: "Tren superior", "Tren inferior", "Descanso", cada uno con sus
--    propias calorías y macros.
--  * Cada día del plan puede tener un tipo; si no tiene, usa los objetivos
--    generales del plan.
--  * Se copian con el plan; al copiar un día, el destino toma su tipo.
-- =====================================================================

create table public.nutrition_day_types (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.nutrition_plans (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 40),
  target_kcal      integer check (target_kcal between 500 and 10000),
  target_protein_g integer check (target_protein_g between 0 and 600),
  target_carbs_g   integer check (target_carbs_g between 0 and 1500),
  target_fat_g     integer check (target_fat_g between 0 and 600),
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, plan_id)
);
create index nutrition_day_types_plan_idx on public.nutrition_day_types (plan_id, position);
create unique index nutrition_day_types_name_idx on public.nutrition_day_types (plan_id, lower(name));

create trigger set_updated_at before update on public.nutrition_day_types
  for each row execute function public.set_updated_at();
create trigger audit_changes after insert or update or delete on public.nutrition_day_types
  for each row execute function public.audit_changes();

-- El tipo debe ser del MISMO plan que el día (FK compuesta).
-- Si se borra el tipo, el día vuelve a los objetivos generales.
alter table public.nutrition_plan_days add column day_type_id uuid;
alter table public.nutrition_plan_days
  add constraint nutrition_plan_days_day_type_fk
  foreign key (day_type_id, plan_id) references public.nutrition_day_types (id, plan_id)
  on delete set null (day_type_id);
create index nutrition_plan_days_type_idx on public.nutrition_plan_days (day_type_id);

alter table public.nutrition_day_types enable row level security;
create policy "nutrition_day_types: leer" on public.nutrition_day_types
  for select to authenticated using (plan_id in (select public.nutrition_scope_plans(false)));
create policy "nutrition_day_types: escribir" on public.nutrition_day_types
  for all to authenticated
  using (plan_id in (select public.nutrition_scope_plans(true)))
  with check (plan_id in (select public.nutrition_scope_plans(true)));

revoke all on public.nutrition_day_types from anon;
grant select, insert, update, delete on public.nutrition_day_types to authenticated;

-- Asigna un tipo (o ninguno) a ciertos días de la semana, en todas las semanas.
create or replace function public.nutrition_assign_day_type(p_plan uuid, p_type uuid, p_days int[])
returns int
language plpgsql security invoker set search_path = ''
as $$
declare
  v_weeks int;
  w int;
  d int;
  n int := 0;
  v_day uuid;
begin
  select weeks into v_weeks from public.nutrition_plans where id = p_plan and coach_id = auth.uid();
  if v_weeks is null then raise exception 'Plan no encontrado' using errcode = 'P0002'; end if;
  if p_type is not null and not exists (select 1 from public.nutrition_day_types where id = p_type and plan_id = p_plan) then
    raise exception 'Tipo de día no encontrado' using errcode = 'P0002';
  end if;
  for w in 1..v_weeks loop
    foreach d in array coalesce(p_days, '{}') loop
      v_day := public.nutrition_ensure_day(p_plan, w, d);
      update public.nutrition_plan_days set day_type_id = p_type where id = v_day;
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$;

-- Copiar día: el destino toma también el tipo del día origen.
create or replace function public.nutrition_copy_day(p_src_day uuid, p_targets jsonb)
returns int
language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan uuid;
  v_type uuid;
  t jsonb;
  v_dst uuid;
  m record;
  n int := 0;
begin
  select plan_id, day_type_id into v_plan, v_type from public.nutrition_plan_days where id = p_src_day;
  if v_plan is null then raise exception 'Día no encontrado' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_targets) <> 'array' then raise exception 'Destinos inválidos' using errcode = '22023'; end if;

  for t in select * from jsonb_array_elements(p_targets) loop
    v_dst := public.nutrition_ensure_day(v_plan, (t ->> 'week')::int, (t ->> 'day')::int);
    continue when v_dst = p_src_day;
    update public.nutrition_plan_days set day_type_id = v_type where id = v_dst;
    delete from public.meals where day_id = v_dst;
    for m in select id from public.meals where day_id = p_src_day order by position loop
      perform public.nutrition_copy_meal(m.id, v_dst);
    end loop;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Copiar plan: también copia los tipos de día y los reasigna.
create or replace function public.nutrition_copy_plan(p_plan uuid, p_client uuid, p_name text)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_new uuid;
  d record;
  v_day uuid;
  m record;
  ty record;
  v_map jsonb := '{}'::jsonb;
  v_type uuid;
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

  for ty in select * from public.nutrition_day_types where plan_id = p_plan loop
    insert into public.nutrition_day_types (plan_id, name, target_kcal, target_protein_g, target_carbs_g, target_fat_g, position)
    values (v_new, ty.name, ty.target_kcal, ty.target_protein_g, ty.target_carbs_g, ty.target_fat_g, ty.position)
    returning id into v_type;
    v_map := v_map || jsonb_build_object(ty.id::text, v_type);
  end loop;

  for d in select * from public.nutrition_plan_days where plan_id = p_plan loop
    insert into public.nutrition_plan_days (plan_id, week_number, day_number, label, day_type_id)
    values (v_new, d.week_number, d.day_number, d.label, (v_map ->> d.day_type_id::text)::uuid)
    returning id into v_day;
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

revoke execute on function public.nutrition_assign_day_type(uuid, uuid, int[]) from public, anon;
grant execute on function public.nutrition_assign_day_type(uuid, uuid, int[]) to authenticated;
