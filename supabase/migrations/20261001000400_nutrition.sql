-- =====================================================================
-- ALPHA PRIME NUTRITION · Fase 3: nutrición
--  * Catálogo base de alimentos (global, solo lectura para coaches).
--  * Funciones para copiar comidas, días, semanas y planes completos.
--  * Activar un plan (uno activo por cliente).
-- Todas las funciones son SECURITY INVOKER: RLS decide qué puede leer y
-- escribir quien las llama.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogo base. Valores por porción de referencia, aproximados a partir
-- de tablas de composición (USDA FoodData Central). El coach puede crear
-- alimentos propios con los datos exactos de cada etiqueta.
-- ---------------------------------------------------------------------
insert into public.foods (coach_id, name, category, reference_amount, unit, kcal, protein_g, carbs_g, fat_g, fiber_g) values
  -- Proteínas
  (null, 'Pechuga de pollo cocida, sin piel', 'Proteínas', 100, 'g', 165, 31.0, 0, 3.6, 0),
  (null, 'Huevo entero', 'Proteínas', 1, 'unidad', 72, 6.3, 0.4, 4.8, 0),
  (null, 'Clara de huevo', 'Proteínas', 100, 'g', 52, 10.9, 0.7, 0.2, 0),
  (null, 'Carne de res molida 90% magra, cocida', 'Proteínas', 100, 'g', 217, 26.1, 0, 11.7, 0),
  (null, 'Lomo de cerdo cocido', 'Proteínas', 100, 'g', 143, 26.2, 0, 3.5, 0),
  (null, 'Atún en agua, escurrido', 'Proteínas', 100, 'g', 116, 25.5, 0, 0.8, 0),
  (null, 'Salmón cocido', 'Proteínas', 100, 'g', 206, 22.1, 0, 12.4, 0),
  (null, 'Tilapia cocida', 'Proteínas', 100, 'g', 128, 26.2, 0, 2.7, 0),
  (null, 'Proteína whey en polvo (promedio)', 'Proteínas', 30, 'g', 120, 24.0, 3.0, 1.5, 0),
  -- Lácteos
  (null, 'Queso fresco', 'Lácteos', 100, 'g', 299, 18.1, 3.0, 23.8, 0),
  (null, 'Queso cottage 2%', 'Lácteos', 100, 'g', 81, 10.5, 4.8, 2.3, 0),
  (null, 'Yogur griego natural sin grasa', 'Lácteos', 100, 'g', 59, 10.2, 3.6, 0.4, 0),
  (null, 'Leche descremada', 'Lácteos', 100, 'ml', 34, 3.4, 5.0, 0.1, 0),
  (null, 'Leche entera', 'Lácteos', 100, 'ml', 61, 3.2, 4.8, 3.3, 0),
  -- Cereales, tubérculos y leguminosas
  (null, 'Arroz blanco cocido', 'Carbohidratos', 100, 'g', 130, 2.7, 28.2, 0.3, 0.4),
  (null, 'Arroz integral cocido', 'Carbohidratos', 100, 'g', 123, 2.7, 25.6, 1.0, 1.6),
  (null, 'Avena en hojuelas (cruda)', 'Carbohidratos', 100, 'g', 379, 13.2, 67.7, 6.5, 10.1),
  (null, 'Pan integral', 'Carbohidratos', 100, 'g', 252, 12.4, 42.7, 3.5, 6.0),
  (null, 'Tortilla de maíz', 'Carbohidratos', 100, 'g', 218, 5.7, 44.6, 2.9, 6.3),
  (null, 'Papa cocida con cáscara', 'Carbohidratos', 100, 'g', 87, 1.9, 20.1, 0.1, 1.8),
  (null, 'Camote cocido', 'Carbohidratos', 100, 'g', 90, 2.0, 20.7, 0.2, 3.3),
  (null, 'Pasta cocida', 'Carbohidratos', 100, 'g', 158, 5.8, 30.9, 0.9, 1.8),
  (null, 'Plátano cocido', 'Carbohidratos', 100, 'g', 116, 0.8, 31.2, 0.2, 2.3),
  (null, 'Quinoa cocida', 'Carbohidratos', 100, 'g', 120, 4.4, 21.3, 1.9, 2.8),
  (null, 'Frijoles rojos cocidos', 'Leguminosas', 100, 'g', 127, 8.7, 22.8, 0.5, 7.4),
  (null, 'Frijoles negros cocidos', 'Leguminosas', 100, 'g', 132, 8.9, 23.7, 0.5, 8.7),
  (null, 'Lentejas cocidas', 'Leguminosas', 100, 'g', 116, 9.0, 20.1, 0.4, 7.9),
  -- Frutas
  (null, 'Banano', 'Frutas', 100, 'g', 89, 1.1, 22.8, 0.3, 2.6),
  (null, 'Manzana', 'Frutas', 100, 'g', 52, 0.3, 13.8, 0.2, 2.4),
  (null, 'Fresas', 'Frutas', 100, 'g', 32, 0.7, 7.7, 0.3, 2.0),
  (null, 'Papaya', 'Frutas', 100, 'g', 43, 0.5, 10.8, 0.3, 1.7),
  (null, 'Piña', 'Frutas', 100, 'g', 50, 0.5, 13.1, 0.1, 1.4),
  (null, 'Mango', 'Frutas', 100, 'g', 60, 0.8, 15.0, 0.4, 1.6),
  (null, 'Naranja', 'Frutas', 100, 'g', 47, 0.9, 11.8, 0.1, 2.4),
  -- Verduras
  (null, 'Brócoli cocido', 'Verduras', 100, 'g', 35, 2.4, 7.2, 0.4, 3.3),
  (null, 'Espinaca cruda', 'Verduras', 100, 'g', 23, 2.9, 3.6, 0.4, 2.2),
  (null, 'Lechuga', 'Verduras', 100, 'g', 15, 1.4, 2.9, 0.2, 1.3),
  (null, 'Tomate', 'Verduras', 100, 'g', 18, 0.9, 3.9, 0.2, 1.2),
  (null, 'Pepino', 'Verduras', 100, 'g', 15, 0.7, 3.6, 0.1, 0.5),
  (null, 'Zanahoria', 'Verduras', 100, 'g', 41, 0.9, 9.6, 0.2, 2.8),
  (null, 'Güisquil cocido', 'Verduras', 100, 'g', 22, 0.6, 4.5, 0.5, 2.8),
  (null, 'Ejotes cocidos', 'Verduras', 100, 'g', 35, 1.9, 7.9, 0.3, 3.2),
  -- Grasas
  (null, 'Aguacate', 'Grasas', 100, 'g', 160, 2.0, 8.5, 14.7, 6.7),
  (null, 'Aceite de oliva', 'Grasas', 100, 'g', 884, 0, 0, 100, 0),
  (null, 'Mantequilla de maní', 'Grasas', 100, 'g', 588, 25.1, 19.6, 50.4, 6.0),
  (null, 'Almendras', 'Grasas', 100, 'g', 579, 21.2, 21.6, 49.9, 12.5),
  (null, 'Nueces', 'Grasas', 100, 'g', 654, 15.2, 13.7, 65.2, 6.7),
  (null, 'Semillas de chía', 'Grasas', 100, 'g', 486, 16.5, 42.1, 30.7, 34.4),
  -- Otros
  (null, 'Miel', 'Otros', 100, 'g', 304, 0.3, 82.4, 0, 0.2);

create index if not exists foods_name_idx on public.foods (lower(name));

-- ---------------------------------------------------------------------
-- Funciones
-- ---------------------------------------------------------------------

-- Devuelve el día (semana, día) de un plan, creándolo si no existe.
create or replace function public.nutrition_ensure_day(p_plan uuid, p_week int, p_day int)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_weeks int;
  v_id uuid;
begin
  select weeks into v_weeks from public.nutrition_plans where id = p_plan;
  if v_weeks is null then raise exception 'Plan no encontrado' using errcode = 'P0002'; end if;
  if p_week < 1 or p_week > v_weeks or p_day < 1 or p_day > 7 then
    raise exception 'Semana o día fuera de rango' using errcode = '22023';
  end if;

  select id into v_id from public.nutrition_plan_days
  where plan_id = p_plan and week_number = p_week and day_number = p_day;
  if v_id is null then
    insert into public.nutrition_plan_days (plan_id, week_number, day_number)
    values (p_plan, p_week, p_day) returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Copia una comida (con sus opciones, alimentos y sustituciones) al final de otro día.
create or replace function public.nutrition_copy_meal(p_meal uuid, p_target_day uuid)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_meal uuid;
  o record;
  i record;
  v_opt uuid;
  v_item uuid;
begin
  insert into public.meals (day_id, name, position, notes)
  select p_target_day, m.name,
         coalesce((select max(x.position) + 1 from public.meals x where x.day_id = p_target_day), 0),
         m.notes
  from public.meals m where m.id = p_meal
  returning id into v_meal;
  if v_meal is null then raise exception 'Comida no encontrada' using errcode = 'P0002'; end if;

  for o in select * from public.meal_options where meal_id = p_meal order by position loop
    insert into public.meal_options (meal_id, label, position)
    values (v_meal, o.label, o.position) returning id into v_opt;

    for i in select * from public.meal_items where meal_option_id = o.id order by position loop
      insert into public.meal_items (meal_option_id, food_id, quantity, position)
      values (v_opt, i.food_id, i.quantity, i.position) returning id into v_item;

      insert into public.food_substitutions (meal_item_id, food_id, quantity, notes)
      select v_item, s.food_id, s.quantity, s.notes
      from public.food_substitutions s where s.meal_item_id = i.id;
    end loop;
  end loop;
  return v_meal;
end;
$$;

-- Reemplaza el contenido de uno o varios días con el de un día origen.
-- p_targets: [{"week": 1, "day": 2}, ...]
create or replace function public.nutrition_copy_day(p_src_day uuid, p_targets jsonb)
returns int
language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan uuid;
  t jsonb;
  v_dst uuid;
  m record;
  n int := 0;
begin
  select plan_id into v_plan from public.nutrition_plan_days where id = p_src_day;
  if v_plan is null then raise exception 'Día no encontrado' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_targets) <> 'array' then raise exception 'Destinos inválidos' using errcode = '22023'; end if;

  for t in select * from jsonb_array_elements(p_targets) loop
    v_dst := public.nutrition_ensure_day(v_plan, (t ->> 'week')::int, (t ->> 'day')::int);
    continue when v_dst = p_src_day;
    delete from public.meals where day_id = v_dst;
    for m in select id from public.meals where day_id = p_src_day order by position loop
      perform public.nutrition_copy_meal(m.id, v_dst);
    end loop;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Copia un plan completo a un cliente (o como plantilla si p_client es null).
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
  return v_new;
end;
$$;

-- Activa un plan del cliente y desactiva los demás (o lo desactiva).
create or replace function public.nutrition_set_active(p_plan uuid, p_active boolean)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_client uuid;
begin
  select client_id into v_client from public.nutrition_plans where id = p_plan and coach_id = auth.uid();
  if v_client is null then raise exception 'Plan no encontrado' using errcode = 'P0002'; end if;

  if p_active then
    update public.nutrition_plans set is_active = false
    where client_id = v_client and id <> p_plan and is_active;
  end if;
  update public.nutrition_plans
  set is_active = p_active,
      start_date = case when p_active and start_date is null then current_date else start_date end
  where id = p_plan;
end;
$$;

revoke execute on function
  public.nutrition_ensure_day(uuid, int, int), public.nutrition_copy_meal(uuid, uuid),
  public.nutrition_copy_day(uuid, jsonb), public.nutrition_copy_plan(uuid, uuid, text),
  public.nutrition_set_active(uuid, boolean)
from public, anon;
grant execute on function
  public.nutrition_ensure_day(uuid, int, int), public.nutrition_copy_meal(uuid, uuid),
  public.nutrition_copy_day(uuid, jsonb), public.nutrition_copy_plan(uuid, uuid, text),
  public.nutrition_set_active(uuid, boolean)
to authenticated;

-- ---------------------------------------------------------------------
-- El cliente solo ve su plan ACTIVO (los borradores del coach no).
-- Mismo criterio para rutinas de entrenamiento.
-- ---------------------------------------------------------------------
create or replace function public.can_read_nutrition_plan(p_plan uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.nutrition_plans p
    where p.id = p_plan
      and (p.coach_id = auth.uid()
           or (p.client_id is not null and p.is_active and public.client_has_access(p.client_id)))
  )
$$;

create or replace function public.can_read_workout_plan(p_plan uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workout_plans p
    where p.id = p_plan
      and (p.coach_id = auth.uid()
           or (p.client_id is not null and p.is_active and public.client_has_access(p.client_id)))
  )
$$;

alter policy "workout_plans: leer" on public.workout_plans
  using (coach_id = auth.uid() or (client_id is not null and is_active and public.client_has_access(client_id)));

-- ---------------------------------------------------------------------
-- Rendimiento de RLS en el árbol del plan.
-- Antes cada fila (día, comida, opción, alimento, sustitución) llamaba a
-- funciones por fila y además disparaba la RLS de las tablas padre en los
-- joins. Ahora cada consulta calcula UNA vez el conjunto de IDs
-- permitidos (funciones security definer, sin recursión de RLS) y Postgres
-- lo usa como tabla hash. Mismo criterio de acceso que antes:
--   * coach: todo lo de sus planes (leer y escribir)
--   * cliente: solo leer su plan ACTIVO y solo si su membresía da acceso
-- ---------------------------------------------------------------------
create or replace function public.my_client_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select c.id from public.clients c where c.user_id = auth.uid() $$;

create or replace function public.nutrition_scope_plans(p_write boolean)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select p.id from public.nutrition_plans p where p.coach_id = auth.uid()
  union all
  select p.id from public.nutrition_plans p
  where not p_write
    and p.is_active
    and p.client_id = public.my_client_id()
    and public.client_has_access(p.client_id)
$$;

create or replace function public.nutrition_scope_days(p_write boolean)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select d.id from public.nutrition_plan_days d
  where d.plan_id in (select public.nutrition_scope_plans(p_write))
$$;

create or replace function public.nutrition_scope_meals(p_write boolean)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.id from public.meals m
  join public.nutrition_plan_days d on d.id = m.day_id
  where d.plan_id in (select public.nutrition_scope_plans(p_write))
$$;

create or replace function public.nutrition_scope_options(p_write boolean)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select o.id from public.meal_options o
  join public.meals m on m.id = o.meal_id
  join public.nutrition_plan_days d on d.id = m.day_id
  where d.plan_id in (select public.nutrition_scope_plans(p_write))
$$;

create or replace function public.nutrition_scope_items(p_write boolean)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select i.id from public.meal_items i
  join public.meal_options o on o.id = i.meal_option_id
  join public.meals m on m.id = o.meal_id
  join public.nutrition_plan_days d on d.id = m.day_id
  where d.plan_id in (select public.nutrition_scope_plans(p_write))
$$;

revoke execute on function public.my_client_id(), public.nutrition_scope_plans(boolean),
  public.nutrition_scope_days(boolean), public.nutrition_scope_meals(boolean),
  public.nutrition_scope_options(boolean), public.nutrition_scope_items(boolean)
from public, anon;
grant execute on function public.my_client_id(), public.nutrition_scope_plans(boolean),
  public.nutrition_scope_days(boolean), public.nutrition_scope_meals(boolean),
  public.nutrition_scope_options(boolean), public.nutrition_scope_items(boolean)
to authenticated;

-- Plan: el coach por columna (auth.uid() evaluado una sola vez); el
-- cliente por su id y su acceso, también evaluados una sola vez.
-- (alter policy: se modifican las reglas existentes, no se borran)
alter policy "nutrition_plans: leer" on public.nutrition_plans
  using (coach_id = (select auth.uid())
         or (is_active
             and client_id = (select public.my_client_id())
             and (select public.client_has_access(public.my_client_id()))));

alter policy "nutrition_plans: coach escribe" on public.nutrition_plans
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and (client_id is null or public.is_coach_of(client_id)));

alter policy "nutrition_plan_days: leer" on public.nutrition_plan_days
  using (plan_id in (select public.nutrition_scope_plans(false)));
alter policy "nutrition_plan_days: escribir" on public.nutrition_plan_days
  using (plan_id in (select public.nutrition_scope_plans(true)))
  with check (plan_id in (select public.nutrition_scope_plans(true)));

alter policy "meals: leer" on public.meals
  using (day_id in (select public.nutrition_scope_days(false)));
alter policy "meals: escribir" on public.meals
  using (day_id in (select public.nutrition_scope_days(true)))
  with check (day_id in (select public.nutrition_scope_days(true)));

alter policy "meal_options: leer" on public.meal_options
  using (meal_id in (select public.nutrition_scope_meals(false)));
alter policy "meal_options: escribir" on public.meal_options
  using (meal_id in (select public.nutrition_scope_meals(true)))
  with check (meal_id in (select public.nutrition_scope_meals(true)));

alter policy "meal_items: leer" on public.meal_items
  using (meal_option_id in (select public.nutrition_scope_options(false)));
alter policy "meal_items: escribir" on public.meal_items
  using (meal_option_id in (select public.nutrition_scope_options(true)))
  with check (meal_option_id in (select public.nutrition_scope_options(true)));

alter policy "food_substitutions: leer" on public.food_substitutions
  using (meal_item_id in (select public.nutrition_scope_items(false)));
alter policy "food_substitutions: escribir" on public.food_substitutions
  using (meal_item_id in (select public.nutrition_scope_items(true)))
  with check (meal_item_id in (select public.nutrition_scope_items(true)));
