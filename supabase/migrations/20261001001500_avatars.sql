-- =====================================================================
-- Foto de perfil (coach y clientes).
-- Bucket público de solo lectura: cada archivo tiene un nombre aleatorio
-- difícil de adivinar y la carpeta no se puede listar. Cada usuario solo
-- puede subir/borrar dentro de SU carpeta: {user_id}/{aleatorio}.webp
-- La app recorta y comprime la imagen (~300 px) antes de subirla.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 512 * 1024, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: subir la propia" on storage.objects;
create policy "avatars: subir la propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: borrar la propia" on storage.objects;
create policy "avatars: borrar la propia" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- La URL guardada debe ser de este bucket y de la carpeta del propio usuario
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null
         or (length(avatar_url) <= 500 and strpos(avatar_url, '/storage/v1/object/public/avatars/' || id::text || '/') > 0));
