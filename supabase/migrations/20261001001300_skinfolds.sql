-- =====================================================================
-- Pliegues cutáneos (mm) en cada medición: bicipital, tricipital,
-- subescapular y suprailíaco. Sirven para comparar el progreso.
-- =====================================================================
alter table public.measurements
  add column if not exists biceps_mm      numeric(4,1) check (biceps_mm between 1 and 80),
  add column if not exists triceps_mm     numeric(4,1) check (triceps_mm between 1 and 80),
  add column if not exists subscapular_mm numeric(4,1) check (subscapular_mm between 1 and 80),
  add column if not exists suprailiac_mm  numeric(4,1) check (suprailiac_mm between 1 and 80);
