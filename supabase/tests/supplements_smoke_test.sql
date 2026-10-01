-- Corre después de nutrition_smoke_test.sql en la misma DB local.
\set ON_ERROR_STOP 0
update clients set renewal_date = current_date + 20 where id='11111111-0000-0000-0000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
insert into plan_supplements (plan_id, name, dose, timing, frequency, position) values
 ('22222222-0000-0000-0000-000000000001', 'Creatina monohidratada', '5 g', 'Post-entreno', 'Diario', 0),
 ('22222222-0000-0000-0000-000000000001', 'Vitamina D3', '2000 UI', 'Con el desayuno', 'Diario', 1);
update plan_supplements set dose = '3 g' where name like 'Creatina%';
update plan_supplements set position = 5 where name like 'Vitamina%';
\echo '-- copiar plan copia suplementos'
select nutrition_copy_plan('22222222-0000-0000-0000-000000000001', null, 'Tpl supl') as tpl \gset
select count(*) as supl_en_copia from plan_supplements where plan_id = :'tpl';
\echo '-- historial (insert x2 + dosis; el cambio de posición no se registra)'
select action, changes->'dose' as dose, client_id is not null as con_cliente from audit_logs where entity='plan_supplements' and client_id is not null order by id;
reset role;

\echo '=== JUAN: plan A inactivo (no ve), activar A (ve 2) ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select count(*) as visibles_inactivo from plan_supplements;
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select nutrition_set_active('22222222-0000-0000-0000-000000000001', true);
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select count(*) as visibles_activo from plan_supplements;
update plan_supplements set dose = '50 g';
insert into plan_supplements (plan_id, name) values ('22222222-0000-0000-0000-000000000001', 'hack');
reset role;
\echo '=== OTRO COACH ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select count(*) as visibles_otro from plan_supplements;
reset role;
