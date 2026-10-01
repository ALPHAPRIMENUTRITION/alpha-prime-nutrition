-- Corre después de nutrition_smoke_test.sql (usa sus usuarios).
\set ON_ERROR_STOP 0
update clients set renewal_date = current_date + 20 where id='11111111-0000-0000-0000-000000000001';
update coaches set checkin_weekday = extract(dow from public.local_today())::int, checkin_config = '{"questions":[{"id":"q1","label":"¿Cumpliste los pasos?","type":"yesno"}]}' where id='00000000-0000-0000-0000-0000000000c1';
delete from notifications;

\echo '=== JUAN ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select my_checkin_settings() ->> 'weekday' is not null as ve_config, (my_checkin_settings() -> 'config' -> 'questions' -> 0 ->> 'label') as pregunta;
\echo '-- recordatorio: 1 sola vez por semana'
select checkin_reminder_tick() as primero, checkin_reminder_tick() as segundo;
\echo '-- envía check-in con semana falsa y campos del coach (se corrigen)'
insert into checkins (client_id, week_start, weight_kg, waist_cm, nutrition_adherence_pct, workouts_completed, workouts_planned, sleep_hours, energy, hunger, stress, comments, extra_answers, coach_feedback, status)
values ('11111111-0000-0000-0000-000000000001', '2020-01-06', 80.5, 84, 90, 3, 4, 7.5, 8, 5, 4, 'Bien', '{"q1":"si"}', 'hackeado', 'reviewed')
returning week_start = week_monday(local_today()) as semana_ok, coach_feedback is null as sin_feedback, status, adherence_score;
select checkin_reminder_tick() as tras_enviar;
\echo '-- corrige antes de revisión'
update checkins set weight_kg = 80.2 where client_id='11111111-0000-0000-0000-000000000001';
reset role;

\echo '=== COACH ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select type, body from notifications order by created_at;
update checkins set coach_feedback = 'Muy bien, seguí así', coach_adherence_override = 88, status = 'reviewed', reviewed_at = now() where client_id='11111111-0000-0000-0000-000000000001';
\echo '-- activar plan nutricional y editarlo dos veces (1 sola notificación de cambio)'
select nutrition_set_active('22222222-0000-0000-0000-000000000001', false);
select nutrition_set_active('22222222-0000-0000-0000-000000000001', true);
update nutrition_plans set updated_at = now() + interval '1 second' where id='22222222-0000-0000-0000-000000000001';
update nutrition_plans set updated_at = now() + interval '2 second' where id='22222222-0000-0000-0000-000000000001';
reset role;

\echo '=== JUAN ve sus notificaciones; no puede editar tras revisión ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select type, title from notifications order by created_at;
update checkins set weight_kg = 70 where client_id='11111111-0000-0000-0000-000000000001';
select weight_kg, coach_feedback, status from checkins;
\echo '-- no puede crearse notificaciones'
insert into notifications (user_id, type, title) values ('00000000-0000-0000-0000-0000000000a1', 'plan_new', 'x');
reset role;

\echo '=== OTRO COACH ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select count(*) as checkins_visibles, (select count(*) from notifications) as notifs from checkins;
select my_checkin_settings() as settings_otro_coach;
reset role;
