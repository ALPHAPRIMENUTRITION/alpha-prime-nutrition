-- Corre después de nutrition_smoke_test.sql (usa sus usuarios).
\set ON_ERROR_STOP 0
update clients set renewal_date = public.local_today() + 2, payment_link = null, payment_amount_cents = null where id='11111111-0000-0000-0000-000000000001';
update coaches set payment_link = null, payment_amount_cents = null where id='00000000-0000-0000-0000-0000000000c1';
delete from notifications;
delete from payments;

\echo '=== COACH configura su link ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
update coaches set payment_link = 'https://pagos.cubo.example/abc', payment_amount_cents = 4000, payment_plan_name = 'Coaching mensual', payment_instructions = 'Pagá con tarjeta.' where id = auth.uid();
\echo '-- link sin https: rechazado'
update coaches set payment_link = 'http://inseguro.com' where id = auth.uid();
\echo '-- link propio para Juan con otro monto'
update clients set payment_amount_cents = 3500 where id='11111111-0000-0000-0000-000000000001';
reset role;

\echo '=== JUAN ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select my_payment_info();
select payment_reminder_tick() as aviso1, payment_reminder_tick() as aviso2;
\echo '-- no puede insertar pagos directo'
insert into payments (client_id, provider, amount_cents, status) values ('11111111-0000-0000-0000-000000000001', 'manual', 100, 'succeeded');
\echo '-- no puede cambiarse la fecha de renovación'
update clients set renewal_date = '2030-01-01';
select report_payment(3500, 'REF-123') is not null as reportado;
\echo '-- segundo reporte con uno pendiente: error'
select report_payment(3500, 'otra');
select (my_payment_info() ->> 'pending') as pendiente;
\echo '-- no puede confirmarse a sí mismo'
select confirm_payment((select id from payments limit 1), 1);
reset role;

\echo '=== OTRO COACH no puede confirmar ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select confirm_payment((select id from public.payments limit 1), 1);
select count(*) as pagos_visibles from payments;
reset role;
select id as pay_id from payments \gset

\echo '=== COACH confirma ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select type, body from notifications;
select confirm_payment(:'pay_id', 1) = (public.local_today() + 2 + interval '1 month')::date as renovacion_ok;
select confirm_payment(:'pay_id', 1) as doble_confirmacion;
\echo '-- registra pago en efectivo por 2 meses'
select register_payment('11111111-0000-0000-0000-000000000001', 8000, 2, 'cash', 'recibo 7') = (public.local_today() + 2 + interval '3 months')::date as renovacion_ok2;
select status, method, amount_cents, months, reference from payments order by created_at;
select coach_dashboard_stats() ->> 'revenue_30d_cents' as ingresos_30d;
reset role;

\echo '=== JUAN: reporta, coach rechaza ==='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select report_payment(3500, null) is not null as reportado;
reset role;
select id as pay2 from payments where status = 'pending' \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select reject_payment(:'pay2', 'No lo veo en Cubo');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select type, title, body from notifications order by created_at;
select status, note from payments order by created_at;
reset role;

\echo '=== vencido hace mucho: arranca desde hoy ==='
update clients set renewal_date = public.local_today() - 40 where id='11111111-0000-0000-0000-000000000001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select register_payment('11111111-0000-0000-0000-000000000001', 3500, 1, 'transfer', null) = (public.local_today() + interval '1 month')::date as desde_hoy;
select membership_status('11111111-0000-0000-0000-000000000001') as estado;
reset role;
