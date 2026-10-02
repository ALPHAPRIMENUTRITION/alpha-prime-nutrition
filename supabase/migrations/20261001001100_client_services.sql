-- =====================================================================
-- ALPHA PRIME NUTRITION · Servicios por cliente
--  * Cada cliente puede tener nutrición, entrenamiento o ambos.
--  * Lo que no tiene contratado no lo puede leer (la base lo bloquea, no
--    solo la pantalla). El coach siempre ve y edita todo.
-- =====================================================================

alter table public.clients
  add column if not exists has_nutrition boolean not null default true,
  add column if not exists has_training boolean not null default true;

alter table public.clients drop constraint if exists clients_some_service;
alter table public.clients add constraint clients_some_service check (has_nutrition or has_training);

grant update (has_nutrition, has_training) on public.clients to authenticated;

create or replace function public.client_service(p_client uuid, p_kind text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select case p_kind when 'nutrition' then c.has_nutrition when 'training' then c.has_training else false end
                   from public.clients c where c.id = p_client), false)
$$;

-- Nutrición: el cliente solo la ve si la tiene contratada
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
    and public.client_service(p.client_id, 'nutrition')
$$;

create or replace function public.can_read_nutrition_plan(p_plan uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.nutrition_plans p
    where p.id = p_plan
      and (p.coach_id = auth.uid()
           or (p.client_id is not null and p.is_active and public.client_has_access(p.client_id)
               and public.client_service(p.client_id, 'nutrition')))
  )
$$;

alter policy "nutrition_plans: leer" on public.nutrition_plans
  using ((coach_id = (select auth.uid()))
         or (is_active and client_id = (select public.my_client_id())
             and (select public.client_has_access(public.my_client_id()))
             and (select public.client_service(public.my_client_id(), 'nutrition'))));

-- Entrenamiento: igual
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
    and public.client_service(p.client_id, 'training')
$$;

create or replace function public.can_read_workout_plan(p_plan uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workout_plans p
    where p.id = p_plan
      and (p.coach_id = auth.uid()
           or (p.client_id is not null and p.is_active and public.client_has_access(p.client_id)
               and public.client_service(p.client_id, 'training')))
  )
$$;

alter policy "workout_plans: leer" on public.workout_plans
  using ((coach_id = (select auth.uid()))
         or (is_active and client_id = (select public.my_client_id())
             and (select public.client_has_access(public.my_client_id()))
             and (select public.client_service(public.my_client_id(), 'training'))));

alter policy "workout_logs: cliente registra" on public.workout_logs
  with check (public.client_has_access(client_id) and public.client_service(client_id, 'training'));
alter policy "workout_logs: cliente corrige" on public.workout_logs
  using (public.client_has_access(client_id) and public.client_service(client_id, 'training'))
  with check (public.client_has_access(client_id) and public.client_service(client_id, 'training'));

-- Sin avisos de planes que el cliente no tiene contratados
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
  if not public.client_service(new.client_id, case when tg_table_name = 'workout_plans' then 'training' else 'nutrition' end) then
    return new;
  end if;
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

revoke execute on function public.client_service(uuid, text) from public, anon;
grant execute on function public.client_service(uuid, text) to authenticated;
