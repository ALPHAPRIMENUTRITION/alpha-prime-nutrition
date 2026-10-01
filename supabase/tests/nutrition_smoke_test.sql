-- Prueba de funciones de nutrición y RLS (Postgres local, después de las migraciones)
\set ON_ERROR_STOP 0
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000c1','coach@x.com','{"role":"coach"}','{"full_name":"Carlos Aguilar"}'),
 ('00000000-0000-0000-0000-0000000000c2','otro@x.com','{"role":"coach"}','{"full_name":"Otro"}'),
 ('00000000-0000-0000-0000-0000000000a1','juan@x.com','{}','{"full_name":"Juan"}');
insert into public.clients (id, coach_id, user_id, first_name, last_name, email, renewal_date) values
 ('11111111-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','Juan','Pérez','juan@x.com', current_date + 20);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
insert into nutrition_plans (id, coach_id, client_id, name, weeks, target_kcal) values
 ('22222222-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','11111111-0000-0000-0000-000000000001','Plan A', 2, 2700);
select nutrition_ensure_day('22222222-0000-0000-0000-000000000001', 1, 1) as d1 \gset
insert into meals (id, day_id, name, position) values ('33333333-0000-0000-0000-000000000001', :'d1', 'Desayuno', 0);
insert into meal_options (id, meal_id, label) values ('44444444-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','Opción A');
insert into meal_items (id, meal_option_id, food_id, quantity) select '55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001', id, 80 from foods where name like 'Avena%';
insert into food_substitutions (meal_item_id, food_id, quantity) select '55555555-0000-0000-0000-000000000001', id, 60 from foods where name='Pan integral';
\echo '-- ensure_day idempotente'
select nutrition_ensure_day('22222222-0000-0000-0000-000000000001', 1, 1) = :'d1' as same_day;
\echo '-- fuera de rango (debe fallar)'
select nutrition_ensure_day('22222222-0000-0000-0000-000000000001', 3, 1);
\echo '-- copiar día 1 a días 2..7 de semana 1 y 2'
select nutrition_copy_day(:'d1', (select jsonb_agg(jsonb_build_object('week', w, 'day', d)) from generate_series(1,2) w, generate_series(1,7) d)) as copied;
select count(*) as days, (select count(*) from meals m join nutrition_plan_days d on d.id=m.day_id where d.plan_id='22222222-0000-0000-0000-000000000001') as meals,
       (select count(*) from food_substitutions) as subs
from nutrition_plan_days where plan_id='22222222-0000-0000-0000-000000000001';
\echo '-- copiar otra vez no duplica (reemplaza)'
select nutrition_copy_day(:'d1', '[{"week":1,"day":2}]');
select count(*) as meals_day2 from meals m join nutrition_plan_days d on d.id = m.day_id where d.plan_id='22222222-0000-0000-0000-000000000001' and d.week_number=1 and d.day_number=2;
\echo '-- copiar plan como plantilla y activar'
select nutrition_copy_plan('22222222-0000-0000-0000-000000000001', null, 'Plantilla') as tpl \gset
select name, client_id is null as is_template, (select count(*) from nutrition_plan_days where plan_id = :'tpl') as days from nutrition_plans where id = :'tpl';
select nutrition_copy_plan(:'tpl', '11111111-0000-0000-0000-000000000001', 'Plan B') as pb \gset
select nutrition_set_active('22222222-0000-0000-0000-000000000001', true);
select nutrition_set_active(:'pb', true);
select name, is_active from nutrition_plans where client_id is not null order by name;
\echo '-- activar plantilla (debe fallar)'
select nutrition_set_active(:'tpl', true);
update nutrition_plans set target_kcal = 2850 where id = '22222222-0000-0000-0000-000000000001';
select actor_name, changes->'target_kcal' as kcal from audit_logs where entity='nutrition_plans' and action='update' and changes ? 'target_kcal';
reset role;

\echo '=== CLIENTE JUAN ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select name, is_active from nutrition_plans order by name;
select count(*) as meals_visible from meals;
\echo '-- cliente intenta modificar (0 filas)'
update meal_items set quantity = 999;
select max(quantity) from meal_items;
\echo '-- cliente intenta copiar (debe fallar)'
select nutrition_copy_day(:'d1', '[{"week":1,"day":3}]');
reset role;

\echo '=== OTRO COACH ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select count(*) as plans_visible from nutrition_plans;
select nutrition_copy_plan('22222222-0000-0000-0000-000000000001', null, 'robo');
insert into meal_items (meal_option_id, food_id, quantity) select '44444444-0000-0000-0000-000000000001', id, 1 from foods limit 1;
reset role;
