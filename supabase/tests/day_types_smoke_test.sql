-- Corre después de nutrition_smoke_test.sql y supplements_smoke_test.sql.
\set ON_ERROR_STOP 0
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
insert into nutrition_day_types (id, plan_id, name, target_kcal, target_protein_g, target_carbs_g, target_fat_g, position) values
 ('66666666-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','Tren superior',2500,180,280,70,0),
 ('66666666-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','Descanso',2100,180,180,75,1);
\echo '-- nombre repetido (debe fallar)'
insert into nutrition_day_types (plan_id, name) values ('22222222-0000-0000-0000-000000000001','descanso');
\echo '-- asignar superior a lun/jue y descanso a sáb/dom (2 semanas)'
select nutrition_assign_day_type('22222222-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000001', array[1,4]);
select nutrition_assign_day_type('22222222-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000002', array[6,7]);
select t.name, count(*) from nutrition_plan_days d join nutrition_day_types t on t.id = d.day_type_id where d.plan_id='22222222-0000-0000-0000-000000000001' group by 1 order by 1;
\echo '-- tipo de OTRO plan en este día (debe fallar por FK compuesta)'
select nutrition_copy_plan('22222222-0000-0000-0000-000000000001', null, 'Otro') as otro \gset
update nutrition_plan_days set day_type_id = (select id from nutrition_day_types where plan_id = :'otro' limit 1) where plan_id='22222222-0000-0000-0000-000000000001' and week_number=1 and day_number=2;
\echo '-- la copia tiene sus propios tipos reasignados'
select t.name, count(*), bool_and(t.plan_id = :'otro') as mismo_plan from nutrition_plan_days d join nutrition_day_types t on t.id = d.day_type_id where d.plan_id = :'otro' group by 1 order by 1;
\echo '-- copiar lunes (superior) a martes semana 1: martes pasa a superior'
select nutrition_copy_day((select id from nutrition_plan_days where plan_id='22222222-0000-0000-0000-000000000001' and week_number=1 and day_number=1), '[{"week":1,"day":2}]');
select t.name from nutrition_plan_days d join nutrition_day_types t on t.id=d.day_type_id where d.plan_id='22222222-0000-0000-0000-000000000001' and week_number=1 and day_number=2;
\echo '-- borrar Descanso: sáb/dom quedan sin tipo (general)'
delete from nutrition_day_types where id='66666666-0000-0000-0000-000000000002';
select count(*) as sin_tipo_findesemana from nutrition_plan_days where plan_id='22222222-0000-0000-0000-000000000001' and day_number in (6,7) and day_type_id is null;
reset role;
\echo '=== JUAN ve los tipos de su plan activo, no puede escribir ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select name from nutrition_day_types;
update nutrition_day_types set target_kcal = 9999;
select nutrition_assign_day_type('22222222-0000-0000-0000-000000000001', null, array[1]);
reset role;
\echo '=== OTRO COACH ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select count(*) as tipos_visibles from nutrition_day_types;
reset role;
