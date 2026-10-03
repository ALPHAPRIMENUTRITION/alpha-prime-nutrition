-- Solicitud corta (pública) vs. cuestionario completo (link personal del cliente) y más estados.
alter table public.intakes drop constraint if exists intakes_status_check;
alter table public.intakes add constraint intakes_status_check
  check (status in ('new', 'reviewed', 'contacted', 'converted', 'lost', 'archived'));
alter table public.intakes add column if not exists kind text not null default 'full' check (kind in ('short', 'full'));

-- Lo que llega desde la página pública es una solicitud corta
create or replace function public.intakes_set_kind()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.kind := case when new.client_id is null then 'short' else 'full' end;
  return new;
end;
$$;
drop trigger if exists intakes_set_kind on public.intakes;
create trigger intakes_set_kind before insert on public.intakes
  for each row execute function public.intakes_set_kind();
