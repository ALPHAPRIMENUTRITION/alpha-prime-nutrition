-- Mensajes rápidos de WhatsApp del coach (editables).
alter table public.coaches add column if not exists message_templates jsonb
  check (message_templates is null or (jsonb_typeof(message_templates) = 'array' and pg_column_size(message_templates) < 30000));
grant update (message_templates) on public.coaches to authenticated;
