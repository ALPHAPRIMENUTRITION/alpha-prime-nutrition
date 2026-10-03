\set ON_ERROR_STOP 0
select id as juan from profiles where role='client' order by created_at limit 1 \gset
select id as otro from profiles where id <> :'juan' order by created_at limit 1 \gset
\echo '== Juan guarda su suscripción'
set role authenticated; select set_config('request.jwt.claim.sub', :'juan', false);
select public.save_push_subscription('https://fcm.example/abc','pk','ak','UA');
select count(*) as mias from push_subscriptions;
\echo '-- no puede insertar directo ni llamar claim_push'
insert into push_subscriptions(user_id,endpoint,p256dh,auth) values (:'juan','https://x/y','a','b');
select public.claim_push(gen_random_uuid());
reset role;
\echo '== otro usuario no ve la de Juan; si inicia sesión en el mismo teléfono, pasa a él'
set role authenticated; select set_config('request.jwt.claim.sub', :'otro', false);
select count(*) as ve_de_juan from push_subscriptions;
select public.save_push_subscription('https://fcm.example/abc','pk2','ak2','UA');
select count(*) as ahora_mias from push_subscriptions;
reset role;
select public.save_push_subscription('https://fcm.example/abc','pk','ak','UA') from (select set_config('request.jwt.claim.sub', :'juan', false)) x;
\echo '== service_role: claim una sola vez'
insert into notifications(user_id,type,title,body,link) values (:'juan','plan_new','Nueva rutina','Hola','/portal/entrenamiento') returning id as nid \gset
set role service_role;
select public.claim_push(:'nid') ->> 'title' as t1, jsonb_array_length(public.claim_push(:'nid')->'subscriptions') as segundo_intento_null;
select public.claim_push(:'nid') is null as ya_enviado;
select public.drop_push_endpoints(array['https://fcm.example/abc']);
reset role;
select count(*) as quedan from push_subscriptions;
\echo '-- aviso viejo no se envía'
insert into notifications(user_id,type,title,created_at) values (:'juan','plan_new','Vieja', now()-interval '1 hour') returning id as old \gset
set role service_role; select public.claim_push(:'old') is null as viejo_null; reset role;
delete from notifications where id in (:'nid', :'old');
