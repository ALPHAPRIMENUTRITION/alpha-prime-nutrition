-- Prueba de aislamiento (RLS) sobre un Postgres local vacío:
--   psql -d prueba -f supabase/tests/_local_auth_stub.sql
--   psql -d prueba -f supabase/migrations/20261001000100_schema.sql
--   psql -d prueba -f supabase/migrations/20261001000200_security.sql
--   psql -d prueba -f supabase/tests/rls_smoke_test.sql
-- Los 6 ERROR que aparecen son intentos que DEBEN fallar (están anotados).
\set ON_ERROR_STOP 0
-- Datos: 1 coach, 2 clientes con cuenta, 1 coach ajeno
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000c1','coach@x.com','{"role":"coach"}','{"full_name":"Carlos Aguilar"}'),
 ('00000000-0000-0000-0000-0000000000c2','otro@x.com','{"role":"coach"}','{"full_name":"Otro Coach"}'),
 ('00000000-0000-0000-0000-0000000000a1','juan@x.com','{}','{"full_name":"Juan"}'),
 ('00000000-0000-0000-0000-0000000000a2','pedro@x.com','{"role":"client"}','{"full_name":"Pedro"}'),
 ('00000000-0000-0000-0000-0000000000a3','hacker@x.com','{}','{"full_name":"Hacker","role":"coach"}');

select id, role, full_name from public.profiles order by full_name;
select count(*) as coaches from public.coaches;

insert into public.clients (id, coach_id, user_id, first_name, last_name, email, renewal_date, start_date) values
 ('11111111-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','Juan','Pérez','juan@x.com', current_date + 20, current_date - 60),
 ('11111111-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a2','Pedro','Ramírez','pedro@x.com', current_date - 30, current_date - 120);
insert into public.measurements (client_id, measured_at, weight_kg, waist_cm) values
 ('11111111-0000-0000-0000-000000000001', current_date - 30, 84, 90),
 ('11111111-0000-0000-0000-000000000002', current_date - 30, 95, 101);
insert into public.nutrition_plans (coach_id, client_id, name, is_active, target_kcal) values
 ('00000000-0000-0000-0000-0000000000c1','11111111-0000-0000-0000-000000000001','Plan Juan', true, 2700),
 ('00000000-0000-0000-0000-0000000000c1','11111111-0000-0000-0000-000000000002','Plan Pedro', true, 2400);
insert into public.coach_notes (client_id, coach_id, body) values
 ('11111111-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','Nota privada');

\echo '=== COMO JUAN (cliente al día) ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select 'clients visibles' t, count(*) from public.clients;
select 'medidas visibles' t, count(*) from public.measurements;
select 'planes visibles' t, string_agg(name, ',') from public.nutrition_plans;
select 'notas coach' t, count(*) from public.coach_notes;
select 'status propio' t, public.membership_status('11111111-0000-0000-0000-000000000001');
select 'status ajeno (debe ser null)' t, public.membership_status('11111111-0000-0000-0000-000000000002');
select 'overview' t, count(*) from public.coach_client_overview;
\echo '-- intentar extender su propia renovación (debe fallar)'
update public.clients set renewal_date = '2099-01-01' where id = '11111111-0000-0000-0000-000000000001';
\echo '-- intentar crear suscripción (debe fallar)'
insert into public.subscriptions (client_id, status) values ('11111111-0000-0000-0000-000000000001','active');
\echo '-- check-in tratando de fijar override del coach'
insert into public.checkins (client_id, week_start, weight_kg, nutrition_adherence_pct, workouts_completed, workouts_planned, coach_adherence_override)
 values ('11111111-0000-0000-0000-000000000001', current_date - 3, 83.2, 90, 4, 4, 100);
select 'checkin' t, adherence_score, coach_adherence_override, status from public.checkins;
\echo '-- check-in a nombre de Pedro (debe fallar)'
insert into public.checkins (client_id, week_start) values ('11111111-0000-0000-0000-000000000002', current_date);
\echo '-- cambiar su rol a coach (debe fallar)'
update public.profiles set role = 'coach' where id = auth.uid();
reset role;

\echo '=== COMO PEDRO (vencido, sin acceso) ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select 'status' t, public.membership_status('11111111-0000-0000-0000-000000000002');
select 'ficha visible' t, count(*) from public.clients;
select 'planes visibles (0)' t, count(*) from public.nutrition_plans;
select 'medidas visibles (0)' t, count(*) from public.measurements;
reset role;

\echo '=== COMO HACKER (role en user_metadata, debe ser cliente sin datos) ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select 'rol' t, public.app_role();
select 'clients' t, count(*) from public.clients;
insert into public.clients (coach_id, first_name, email) values ('00000000-0000-0000-0000-0000000000c1','X','x@x.com');
reset role;

\echo '=== COMO COACH CARLOS ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select first_name, current_weight_kg, adherence_pct, membership_status, days_to_renewal, checkin_pending, last_checkin_at is not null as has_ci from public.coach_client_overview order by first_name;
select public.coach_dashboard_stats();
update public.nutrition_plans set target_kcal = 2850 where name = 'Plan Juan';
update public.checkins set coach_adherence_override = 85, status = 'reviewed', reviewed_at = now();
select 'override' t, coach_adherence_override, status from public.checkins;
select 'audit' t, entity, action, actor_name, changes from public.audit_logs order by id desc limit 3;
select 'notif propia' t, type, body from public.notifications;
reset role;

\echo '=== COMO OTRO COACH ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select 'clients ajenos (0)' t, count(*) from public.clients;
select 'overview (0)' t, count(*) from public.coach_client_overview;
select 'audit (0)' t, count(*) from public.audit_logs;
insert into public.nutrition_plans (coach_id, client_id, name) values ('00000000-0000-0000-0000-0000000000c2','11111111-0000-0000-0000-000000000001','Robo');
reset role;

\echo '=== ANON ==='
set role anon;
select count(*) from public.clients;
reset role;
