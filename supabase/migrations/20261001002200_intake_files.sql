-- Fotos/PDF que el cliente sube en el cuestionario (plan anterior). Privado: solo su coach los ve.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('intake-files', 'intake-files', false, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "intake-files: coach lee" on storage.objects;
create policy "intake-files: coach lee" on storage.objects
  for select to authenticated using (bucket_id = 'intake-files' and public.is_coach_of(public.photo_client_id(name)));
drop policy if exists "intake-files: coach borra" on storage.objects;
create policy "intake-files: coach borra" on storage.objects
  for delete to authenticated using (bucket_id = 'intake-files' and public.is_coach_of(public.photo_client_id(name)));
