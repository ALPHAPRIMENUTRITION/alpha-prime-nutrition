-- =====================================================================
-- ALPHA PRIME NUTRITION · Almacenamiento privado de fotos de progreso
-- Ruta obligatoria dentro del bucket: {client_id}/{archivo}
-- Los archivos solo se sirven con URLs firmadas de corta duración.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 8 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.photo_client_id(p_name text)
returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null; -- ruta mal formada → sin acceso
end;
$$;

create policy "progress-photos: leer" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and public.can_read_client_content(public.photo_client_id(name)));

create policy "progress-photos: subir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and public.can_read_client_content(public.photo_client_id(name)));

create policy "progress-photos: coach borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and public.is_coach_of(public.photo_client_id(name)));

revoke execute on function public.photo_client_id(text) from public, anon;
grant execute on function public.photo_client_id(text) to authenticated;
