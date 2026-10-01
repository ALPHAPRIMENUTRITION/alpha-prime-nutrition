-- Corre después de nutrition_smoke_test.sql (usa sus usuarios).
\set ON_ERROR_STOP 0
update clients set renewal_date = current_date + 20 where id='11111111-0000-0000-0000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
\echo '-- catálogo visible'
select count(*) >= 70 as catalogo from exercises where coach_id is null;
insert into workout_plans (id, coach_id, client_id, name, weeks) values
 ('77777777-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','11111111-0000-0000-0000-000000000001','Fuerza', 4);
select workout_ensure_day('77777777-0000-0000-0000-000000000001', 1, 1) as d1 \gset
update workout_days set name = 'Pecho y tríceps' where id = :'d1';
insert into workout_exercises (id, day_id, exercise_id, position, sets, reps, weight_kg, rir, rest_seconds, tempo)
select '88888888-0000-0000-0000-000000000001', :'d1', id, 0, 4, '6-8', 80, 2, 150, '3-1-1' from exercises where name = 'Press de banca con barra';
insert into workout_exercises (day_id, exercise_id, position, sets, reps, weight_kg, rpe)
select :'d1', id, 1, 3, '10-12', 25, 8 from exercises where name = 'Extensión de tríceps en polea';
\echo '-- copiar lunes a jueves'
select workout_copy_day(:'d1', '[{"week":1,"day":4}]');
select d.name, count(e.*) from workout_days d join workout_exercises e on e.day_id = d.id where d.plan_id='77777777-0000-0000-0000-000000000001' and d.week_number=1 group by d.day_number, d.name order by d.day_number;
\echo '-- copiar semana 1 a 2,3,4 con +2.5 % y RIR -0.5 acumulado'
select workout_copy_week('77777777-0000-0000-0000-000000000001', 1, array[2,3,4], 2.5, 0, -0.5, 0);
select d.week_number, e.weight_kg, e.rir from workout_days d join workout_exercises e on e.day_id=d.id join exercises x on x.id=e.exercise_id
 where d.plan_id='77777777-0000-0000-0000-000000000001' and d.day_number=1 and x.name='Press de banca con barra' order by 1;
\echo '-- plantilla y activar'
select workout_copy_plan('77777777-0000-0000-0000-000000000001', null, 'Plantilla fuerza') as tpl \gset
select (select count(*) from workout_days where plan_id = :'tpl') as dias_tpl;
select workout_set_active('77777777-0000-0000-0000-000000000001', true);
\echo '-- activar plantilla (debe fallar)'
select workout_set_active(:'tpl', true);
reset role;

\echo '=== JUAN ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select name from workout_plans;
select count(*) as ejercicios_visibles from workout_exercises;
\echo '-- registra 2 series'
insert into workout_logs (client_id, workout_exercise_id, exercise_id, set_number, weight_kg, reps, rir)
values ('11111111-0000-0000-0000-000000000001','88888888-0000-0000-0000-000000000001', (select id from exercises where name='Sentadilla con barra'), 1, 80, 8, 2),
       ('11111111-0000-0000-0000-000000000001','88888888-0000-0000-0000-000000000001', null, 2, 80, 7, 1);
select set_number, weight_kg, reps, (select name from exercises where id = exercise_id) from workout_logs order by set_number;
\echo '-- registrar para otro cliente (debe fallar)'
insert into workout_logs (client_id, workout_exercise_id, set_number, weight_kg, reps) values ('11111111-0000-0000-0000-0000000000ff','88888888-0000-0000-0000-000000000001', 3, 80, 8);
\echo '-- fecha futura (debe fallar)'
insert into workout_logs (client_id, workout_exercise_id, set_number, weight_kg, reps, performed_at) values ('11111111-0000-0000-0000-000000000001','88888888-0000-0000-0000-000000000001', 3, 80, 8, current_date + 5);
\echo '-- cliente intenta editar la rutina (0 filas) y copiar (falla)'
update workout_exercises set weight_kg = 500;
select workout_copy_week('77777777-0000-0000-0000-000000000001', 1, array[2], 0, 0, 0, 0);
reset role;

\echo '=== OTRO COACH ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select count(*) as rutinas, (select count(*) from workout_logs) as logs from workout_plans;
reset role;

\echo '=== JUAN con membresía vencida ==='
update clients set renewal_date = current_date - 30 where id='11111111-0000-0000-0000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select count(*) as rutinas_vencido, (select count(*) from workout_exercises) as ejercicios from workout_plans;
insert into workout_logs (client_id, workout_exercise_id, set_number, weight_kg, reps) values ('11111111-0000-0000-0000-000000000001','88888888-0000-0000-0000-000000000001', 4, 80, 8);
reset role;
update clients set renewal_date = current_date + 20 where id='11111111-0000-0000-0000-000000000001';
