-- El aviso push ahora llama a la app por el dominio propio.
create or replace function public.push_on_notification()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if to_regnamespace('net') is null then return new; end if;
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then return new; end if;
  perform net.http_post(
    url := 'https://alphaprimenutrition.com/api/push',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  return new;
end;
$$;
