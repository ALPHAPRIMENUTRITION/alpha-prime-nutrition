-- Corre después de nutrition_smoke_test.sql y training_smoke_test.sql (usa sus usuarios y planes).
\set ON_ERROR_STOP 0
delete from notifications;
update clients set has_nutrition = true, has_training = true where id='11111111-0000-0000-0000-000000000001';

\echo '=== JUAN con ambos servicios ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select (select count(*) from nutrition_plans) as planes_nutri, (select count(*) from meals) as comidas,
       (select count(*) from workout_plans) as rutinas, (select count(*) from workout_exercises) as ejercicios;
reset role;

\echo '=== COACH: Juan solo entrenamiento ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
update clients set has_nutrition = false where id='11111111-0000-0000-0000-000000000001';
\echo '-- sin ningún servicio: rechazado'
update clients set has_training = false where id='11111111-0000-0000-0000-000000000001';
\echo '-- el coach sigue viendo y editando su plan nutricional'
select count(*) as coach_ve_planes from nutrition_plans where client_id='11111111-0000-0000-0000-000000000001';
update nutrition_plans set updated_at = now() + interval '1 minute' where client_id='11111111-0000-0000-0000-000000000001' and is_active;
reset role;

\echo '=== JUAN solo entrenamiento ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select (select count(*) from nutrition_plans) as planes_nutri, (select count(*) from meals) as comidas,
       (select count(*) from plan_supplements) as suplementos,
       (select count(*) from workout_plans) as rutinas, (select count(*) from workout_exercises) as ejercicios;
select count(*) as avisos_de_nutricion from notifications where link = '/portal/nutricion';
reset role;

\echo '=== COACH: Juan solo nutrición ==='
update clients set has_nutrition = true, has_training = false where id='11111111-0000-0000-0000-000000000001';
select we.id as we_id from workout_exercises we join workout_days d on d.id = we.day_id join workout_plans p on p.id = d.plan_id
where p.client_id='11111111-0000-0000-0000-000000000001' and p.is_active limit 1 \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select (select count(*) from nutrition_plans) as planes_nutri, (select count(*) from meals) as comidas,
       (select count(*) from workout_plans) as rutinas, (select count(*) from workout_days) as dias_rutina;
\echo '-- no puede registrar series'
insert into workout_logs (client_id, workout_exercise_id, performed_at, set_number, reps, weight_kg)
values ('11111111-0000-0000-0000-000000000001', :'we_id', local_today(), 9, 10, 50);
reset role;
update clients set has_nutrition = true, has_training = true where id='11111111-0000-0000-0000-000000000001';

\echo '-- con entrenamiento de nuevo sí puede'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into workout_logs (client_id, workout_exercise_id, performed_at, set_number, reps, weight_kg)
values ('11111111-0000-0000-0000-000000000001', :'we_id', local_today(), 9, 10, 50) returning set_number;
reset role;
