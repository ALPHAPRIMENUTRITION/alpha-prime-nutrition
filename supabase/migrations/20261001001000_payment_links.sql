-- =====================================================================
-- ALPHA PRIME NUTRITION · Fase 6: pagos con link (Cubo u otro proveedor)
--  * El coach guarda su link de pago (general y, si quiere, uno por cliente).
--  * El cliente paga fuera de la app y avisa "Ya pagué" → queda pendiente.
--  * El coach confirma (o rechaza). Al confirmar, la renovación avanza N meses.
--  * El coach también puede registrar pagos directos (efectivo, transferencia).
--  * La app no recibe datos de tarjetas ni se conecta al proveedor: no hay
--    claves ni webhooks que configurar.
-- =====================================================================

alter type public.notification_type add value if not exists 'payment_reported';

alter table public.coaches
  add column if not exists payment_link text
    check (payment_link is null or (payment_link ~* '^https://[^\s]+$' and length(payment_link) <= 500)),
  add column if not exists payment_plan_name text check (length(payment_plan_name) <= 80),
  add column if not exists payment_amount_cents integer check (payment_amount_cents between 0 and 10000000),
  add column if not exists payment_instructions text check (length(payment_instructions) <= 1000);

alter table public.clients
  add column if not exists payment_link text
    check (payment_link is null or (payment_link ~* '^https://[^\s]+$' and length(payment_link) <= 500)),
  add column if not exists payment_amount_cents integer check (payment_amount_cents between 0 and 10000000);

alter table public.payments
  add column if not exists method text check (method in ('link', 'cash', 'transfer', 'other')),
  add column if not exists reference text check (length(reference) <= 120),
  add column if not exists months smallint not null default 1 check (months between 1 and 12),
  add column if not exists reviewed_at timestamptz,
  add column if not exists note text check (length(note) <= 300);

create index if not exists payments_pending_idx on public.payments (client_id) where status = 'pending';

grant update (payment_link, payment_plan_name, payment_amount_cents, payment_instructions) on public.coaches to authenticated;
grant update (payment_link, payment_amount_cents) on public.clients to authenticated;

-- ---------------------------------------------------------------------
-- Lo que ve el cliente en Membresía (link propio o el general del coach)
-- ---------------------------------------------------------------------
create or replace function public.my_payment_info()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'link',         coalesce(c.payment_link, co.payment_link),
    'amount_cents', coalesce(c.payment_amount_cents, co.payment_amount_cents),
    'plan_name',    co.payment_plan_name,
    'instructions', co.payment_instructions,
    'pending',      exists (select 1 from public.payments p where p.client_id = c.id and p.status = 'pending')
  )
  from public.clients c
  join public.coaches co on co.id = c.coach_id
  where c.user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Extiende la renovación N meses. Si pagó a tiempo (o dentro de la gracia)
-- se mantiene su ciclo; si ya había vencido del todo, arranca desde hoy.
-- ---------------------------------------------------------------------
create or replace function public.extend_renewal(p_client uuid, p_months int)
returns date
language plpgsql security definer set search_path = ''
as $$
declare
  v_renewal date;
  v_grace int;
  v_today date := public.local_today();
  v_base date;
  v_new date;
begin
  select c.renewal_date, co.grace_period_days into v_renewal, v_grace
  from public.clients c join public.coaches co on co.id = c.coach_id
  where c.id = p_client
  for update of c;

  v_base := case when v_renewal is null or v_renewal + v_grace < v_today then v_today else v_renewal end;
  v_new := (v_base + make_interval(months => p_months))::date;
  update public.clients set renewal_date = v_new where id = p_client;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------
-- Cliente: "Ya pagué"
-- ---------------------------------------------------------------------
create or replace function public.report_payment(p_amount_cents int, p_reference text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_coach uuid;
  v_name text;
  v_id uuid;
begin
  select c.id, c.coach_id, trim(c.first_name || ' ' || c.last_name) into v_client, v_coach, v_name
  from public.clients c where c.user_id = auth.uid();
  if v_client is null then raise exception 'Cuenta sin programa' using errcode = '42501'; end if;
  if exists (select 1 from public.clients c where c.id = v_client and c.status = 'suspended') then
    raise exception 'Tu cuenta está suspendida. Hablá con tu coach.' using errcode = '42501';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > 10000000 then
    raise exception 'Monto inválido' using errcode = '22023';
  end if;
  if exists (select 1 from public.payments p where p.client_id = v_client and p.status = 'pending') then
    raise exception 'Ya tenés un pago esperando confirmación del coach.' using errcode = '23505';
  end if;

  insert into public.payments (client_id, provider, method, amount_cents, status, description, reference)
  values (v_client, 'manual', 'link', p_amount_cents, 'pending', 'Pago con link',
          nullif(left(trim(coalesce(p_reference, '')), 120), ''))
  returning id into v_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (v_coach, 'payment_reported', 'Pago por confirmar',
          v_name || ' avisó que pagó $' || to_char(p_amount_cents / 100.0, 'FM999990.00') || '. Revisalo en tu cuenta de pagos y confirmalo.',
          '/coach/pagos');
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Coach: confirmar / rechazar un pago reportado
-- ---------------------------------------------------------------------
create or replace function public.confirm_payment(p_payment uuid, p_months int default 1)
returns date
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_user uuid;
  v_new date;
begin
  if p_months is null or p_months not between 1 and 12 then raise exception 'Meses inválidos' using errcode = '22023'; end if;
  select p.client_id into v_client from public.payments p where p.id = p_payment and p.status = 'pending' for update;
  if v_client is null or not public.is_coach_of(v_client) then
    raise exception 'Pago no encontrado o ya revisado' using errcode = '42501';
  end if;

  update public.payments
  set status = 'succeeded', paid_at = now(), months = p_months, reviewed_at = now()
  where id = p_payment;
  v_new := public.extend_renewal(v_client, p_months);

  select c.user_id into v_user from public.clients c where c.id = v_client;
  if v_user is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user, 'renewal_success', 'Pago confirmado',
            'Tu coach confirmó tu pago. Tu membresía está activa hasta el ' || to_char(v_new, 'DD/MM/YYYY') || '.',
            '/portal/membresia');
  end if;
  return v_new;
end;
$$;

create or replace function public.reject_payment(p_payment uuid, p_note text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_user uuid;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 300), '');
begin
  select p.client_id into v_client from public.payments p where p.id = p_payment and p.status = 'pending' for update;
  if v_client is null or not public.is_coach_of(v_client) then
    raise exception 'Pago no encontrado o ya revisado' using errcode = '42501';
  end if;
  update public.payments set status = 'failed', reviewed_at = now(), note = v_note where id = p_payment;

  select c.user_id into v_user from public.clients c where c.id = v_client;
  if v_user is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user, 'payment_failed', 'Pago no confirmado',
            coalesce(v_note, 'Tu coach no encontró tu pago. Revisá con él o intentá de nuevo.'),
            '/portal/membresia');
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Coach: registrar un pago directo (efectivo, transferencia, link)
-- ---------------------------------------------------------------------
create or replace function public.register_payment(
  p_client uuid, p_amount_cents int, p_months int, p_method text, p_reference text)
returns date
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_new date;
begin
  if not public.is_coach_of(p_client) then raise exception 'Cliente no encontrado' using errcode = '42501'; end if;
  if p_amount_cents is null or p_amount_cents < 0 or p_amount_cents > 10000000 then
    raise exception 'Monto inválido' using errcode = '22023';
  end if;
  if p_months is null or p_months not between 1 and 12 then raise exception 'Meses inválidos' using errcode = '22023'; end if;
  if p_method not in ('link', 'cash', 'transfer', 'other') then raise exception 'Método inválido' using errcode = '22023'; end if;

  insert into public.payments (client_id, provider, method, amount_cents, status, description, reference, months, paid_at, reviewed_at)
  values (p_client, 'manual', p_method, p_amount_cents, 'succeeded',
          case p_method when 'cash' then 'Pago en efectivo' when 'transfer' then 'Transferencia'
                        when 'link' then 'Pago con link' else 'Pago' end,
          nullif(left(trim(coalesce(p_reference, '')), 120), ''), p_months, now(), now());
  v_new := public.extend_renewal(p_client, p_months);

  select c.user_id into v_user from public.clients c where c.id = p_client;
  if v_user is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user, 'renewal_success', 'Pago registrado',
            'Tu coach registró tu pago. Tu membresía está activa hasta el ' || to_char(v_new, 'DD/MM/YYYY') || '.',
            '/portal/membresia');
  end if;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------
-- Aviso de pago próximo (se evalúa cuando el cliente abre la app):
-- 3 días antes de la renovación, máximo 1 aviso por ciclo.
-- ---------------------------------------------------------------------
create or replace function public.payment_reminder_tick()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_renewal date;
  v_today date := public.local_today();
begin
  select c.id, c.renewal_date into v_client, v_renewal
  from public.clients c where c.user_id = auth.uid() and c.status = 'active';
  if v_client is null or v_renewal is null then return false; end if;
  if v_renewal - v_today not between 0 and 3 then return false; end if;
  if exists (select 1 from public.payments p where p.client_id = v_client and p.status = 'pending') then return false; end if;
  if exists (select 1 from public.notifications n where n.user_id = auth.uid() and n.type = 'payment_upcoming'
             and n.created_at > now() - interval '10 days') then return false; end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (auth.uid(), 'payment_upcoming', 'Tu membresía vence pronto',
          case when v_renewal = v_today then 'Tu membresía vence hoy. Podés pagar desde Membresía.'
               else 'Tu membresía vence el ' || to_char(v_renewal, 'DD/MM/YYYY') || '. Podés pagar desde Membresía.' end,
          '/portal/membresia');
  return true;
end;
$$;

revoke execute on function public.extend_renewal(uuid, int) from public, anon, authenticated;
revoke execute on function public.my_payment_info(), public.report_payment(int, text), public.confirm_payment(uuid, int),
  public.reject_payment(uuid, text), public.register_payment(uuid, int, int, text, text), public.payment_reminder_tick()
  from public, anon;
grant execute on function public.my_payment_info(), public.report_payment(int, text), public.confirm_payment(uuid, int),
  public.reject_payment(uuid, text), public.register_payment(uuid, int, int, text, text), public.payment_reminder_tick()
  to authenticated;
