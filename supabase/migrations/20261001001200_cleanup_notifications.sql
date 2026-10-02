-- =====================================================================
-- Al borrar un cliente, se borran también los avisos del coach que
-- apuntan a ese cliente (antes quedaban en "Actividad reciente").
-- =====================================================================

create or replace function public.clients_cleanup_notifications()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.notifications n
  where n.link like '/coach/clientes/' || old.id::text || '%';
  return old;
end;
$$;

drop trigger if exists clients_cleanup_notifications on public.clients;
create trigger clients_cleanup_notifications
  after delete on public.clients
  for each row execute function public.clients_cleanup_notifications();

revoke execute on function public.clients_cleanup_notifications() from public, anon, authenticated;

-- Limpieza de los avisos que quedaron de clientes ya borrados
delete from public.notifications n
where n.link like '/coach/clientes/%'
  and not exists (
    select 1 from public.clients c
    where n.link like '/coach/clientes/' || c.id::text || '%'
  );
