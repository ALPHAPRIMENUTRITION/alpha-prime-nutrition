-- =====================================================================
-- ALPHA PRIME NUTRITION · Esquema base
-- Todas las tablas viven en el esquema public y se protegen con RLS
-- (ver 20261001000200_security.sql).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('coach', 'client');
create type public.client_status as enum ('active', 'suspended');
create type public.sex_type as enum ('male', 'female', 'other');
create type public.subscription_status as enum (
  'none', 'trialing', 'active', 'past_due', 'unpaid',
  'canceled', 'incomplete', 'incomplete_expired', 'paused'
);
create type public.payment_provider as enum ('stripe', 'manual');
create type public.payment_status as enum ('succeeded', 'failed', 'pending', 'refunded');
create type public.checkin_status as enum ('submitted', 'reviewed');
create type public.photo_pose as enum ('front', 'side', 'back', 'other');
create type public.notification_type as enum (
  'checkin_pending', 'checkin_submitted', 'plan_new', 'plan_updated',
  'payment_upcoming', 'payment_failed', 'membership_expired', 'renewal_success'
);

-- ---------------------------------------------------------------------
-- Usuarios
-- profiles: 1:1 con auth.users. El rol se toma de app_metadata, que
-- solo puede escribir el backend (service role), nunca el navegador.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'client',
  full_name   text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.coaches (
  id                  uuid primary key references public.profiles (id) on delete cascade,
  business_name       text not null default 'Alpha Prime Nutrition',
  grace_period_days   integer not null default 5 check (grace_period_days between 0 and 60),
  checkin_weekday     smallint not null default 1 check (checkin_weekday between 0 and 6), -- 0 = domingo
  checkin_config      jsonb not null default '{}'::jsonb, -- campos extra configurables del check-in
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Clientes
-- clients: expediente que crea el coach. user_id se llena cuando el
-- cliente tiene cuenta de acceso (puede existir sin cuenta todavía).
-- ---------------------------------------------------------------------
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.coaches (id) on delete restrict,
  user_id       uuid unique references public.profiles (id) on delete set null,
  first_name    text not null check (length(first_name) between 1 and 80),
  last_name     text not null default '' check (length(last_name) <= 80),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text check (length(phone) <= 30),
  goal          text check (length(goal) <= 200),
  status        public.client_status not null default 'active',
  start_date    date not null default current_date,
  renewal_date  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (coach_id, email)
);
create index clients_coach_idx on public.clients (coach_id);

create table public.client_profiles (
  client_id   uuid primary key references public.clients (id) on delete cascade,
  birth_date  date,
  sex         public.sex_type,
  height_cm   numeric(5,1) check (height_cm between 50 and 260),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Notas privadas: tabla aparte para que el cliente nunca pueda leerlas.
create table public.coach_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  coach_id    uuid not null references public.coaches (id) on delete cascade,
  body        text not null check (length(body) between 1 and 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index coach_notes_client_idx on public.coach_notes (client_id, created_at desc);

-- ---------------------------------------------------------------------
-- Antropometría y composición corporal
-- ---------------------------------------------------------------------
create table public.measurements (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  measured_at  date not null default current_date,
  weight_kg    numeric(5,2) check (weight_kg between 20 and 400),
  neck_cm      numeric(5,1) check (neck_cm between 10 and 100),
  shoulders_cm numeric(5,1) check (shoulders_cm between 40 and 250),
  chest_cm     numeric(5,1) check (chest_cm between 40 and 250),
  arm_cm       numeric(5,1) check (arm_cm between 10 and 100),
  waist_cm     numeric(5,1) check (waist_cm between 30 and 250),
  hip_cm       numeric(5,1) check (hip_cm between 40 and 250),
  thigh_cm     numeric(5,1) check (thigh_cm between 20 and 150),
  calf_cm      numeric(5,1) check (calf_cm between 15 and 100),
  extra        jsonb not null default '{}'::jsonb, -- otros campos configurables
  notes        text check (length(notes) <= 1000),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index measurements_client_idx on public.measurements (client_id, measured_at desc);

create table public.body_composition (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  measured_at   date not null default current_date,
  body_fat_pct  numeric(4,1) check (body_fat_pct between 2 and 75),
  lean_mass_kg  numeric(5,2),
  method        text check (length(method) <= 60), -- p. ej. pliegues (Jackson-Pollock 7), bioimpedancia, DEXA
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index body_comp_client_idx on public.body_composition (client_id, measured_at desc);

-- ---------------------------------------------------------------------
-- Nutrición
-- Estructura: plan → días (por semana) → comidas → opciones → items
-- ---------------------------------------------------------------------
create table public.foods (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid references public.coaches (id) on delete cascade, -- null = catálogo global
  name              text not null check (length(name) between 1 and 120),
  category          text check (length(category) <= 60),
  reference_amount  numeric(7,2) not null default 100 check (reference_amount > 0),
  unit              text not null default 'g' check (unit in ('g', 'ml', 'unidad')),
  kcal              numeric(7,2) not null check (kcal >= 0),
  protein_g         numeric(6,2) not null default 0 check (protein_g >= 0),
  carbs_g           numeric(6,2) not null default 0 check (carbs_g >= 0),
  fat_g             numeric(6,2) not null default 0 check (fat_g >= 0),
  fiber_g           numeric(6,2) not null default 0 check (fiber_g >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index foods_coach_idx on public.foods (coach_id);

create table public.nutrition_plans (
  id               uuid primary key default gen_random_uuid(),
  coach_id         uuid not null references public.coaches (id) on delete cascade,
  client_id        uuid references public.clients (id) on delete cascade, -- null = plantilla
  name             text not null check (length(name) between 1 and 120),
  start_date       date,
  weeks            smallint not null default 1 check (weeks between 1 and 52),
  is_active        boolean not null default false,
  target_kcal      integer check (target_kcal between 500 and 10000),
  target_protein_g integer check (target_protein_g between 0 and 600),
  target_carbs_g   integer check (target_carbs_g between 0 and 1500),
  target_fat_g     integer check (target_fat_g between 0 and 600),
  -- Foto del cálculo: fórmula, datos introducidos, resultado y ajuste del coach
  calculation      jsonb,
  notes            text check (length(notes) <= 5000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index nutrition_plans_client_idx on public.nutrition_plans (client_id);
create unique index nutrition_plans_one_active on public.nutrition_plans (client_id) where is_active;

create table public.nutrition_plan_days (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.nutrition_plans (id) on delete cascade,
  week_number smallint not null default 1 check (week_number between 1 and 52),
  day_number  smallint not null default 1 check (day_number between 1 and 7),
  label       text check (length(label) <= 60),
  unique (plan_id, week_number, day_number)
);

create table public.meals (
  id        uuid primary key default gen_random_uuid(),
  day_id    uuid not null references public.nutrition_plan_days (id) on delete cascade,
  name      text not null check (length(name) between 1 and 80),
  position  smallint not null default 0,
  notes     text check (length(notes) <= 1000)
);
create index meals_day_idx on public.meals (day_id, position);

create table public.meal_options (
  id        uuid primary key default gen_random_uuid(),
  meal_id   uuid not null references public.meals (id) on delete cascade,
  label     text not null default 'Opción A' check (length(label) <= 40),
  position  smallint not null default 0
);

create table public.meal_items (
  id              uuid primary key default gen_random_uuid(),
  meal_option_id  uuid not null references public.meal_options (id) on delete cascade,
  food_id         uuid not null references public.foods (id) on delete restrict,
  quantity        numeric(7,2) not null check (quantity > 0), -- en la unidad del alimento (gramos por defecto)
  position        smallint not null default 0
);
create index meal_items_option_idx on public.meal_items (meal_option_id, position);

create table public.food_substitutions (
  id            uuid primary key default gen_random_uuid(),
  meal_item_id  uuid not null references public.meal_items (id) on delete cascade,
  food_id       uuid not null references public.foods (id) on delete restrict,
  quantity      numeric(7,2) not null check (quantity > 0),
  notes         text check (length(notes) <= 300)
);

-- ---------------------------------------------------------------------
-- Entrenamiento
-- ---------------------------------------------------------------------
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid references public.coaches (id) on delete cascade, -- null = catálogo global
  name          text not null check (length(name) between 1 and 120),
  muscle_group  text check (length(muscle_group) <= 60),
  equipment     text check (length(equipment) <= 60),
  notes         text check (length(notes) <= 1000),
  created_at    timestamptz not null default now()
);

create table public.workout_plans (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.coaches (id) on delete cascade,
  client_id    uuid references public.clients (id) on delete cascade, -- null = plantilla
  name         text not null check (length(name) between 1 and 120),
  start_date   date,
  weeks        smallint not null default 1 check (weeks between 1 and 52),
  is_active    boolean not null default false,
  periodization jsonb, -- bloques/fases definidos por el coach
  notes        text check (length(notes) <= 5000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index workout_plans_client_idx on public.workout_plans (client_id);
create unique index workout_plans_one_active on public.workout_plans (client_id) where is_active;

create table public.workout_days (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.workout_plans (id) on delete cascade,
  week_number  smallint not null default 1 check (week_number between 1 and 52),
  day_number   smallint not null default 1 check (day_number between 1 and 7),
  name         text check (length(name) <= 80),
  unique (plan_id, week_number, day_number)
);

create table public.workout_exercises (
  id            uuid primary key default gen_random_uuid(),
  day_id        uuid not null references public.workout_days (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete restrict,
  position      smallint not null default 0,
  sets          smallint check (sets between 1 and 20),
  reps          text check (length(reps) <= 20), -- "8-10", "12", "AMRAP"
  weight_kg     numeric(6,2) check (weight_kg >= 0),
  rir           numeric(3,1) check (rir between 0 and 10),
  rpe           numeric(3,1) check (rpe between 1 and 10),
  rest_seconds  integer check (rest_seconds between 0 and 1800),
  tempo         text check (length(tempo) <= 12),
  notes         text check (length(notes) <= 500)
);
create index workout_exercises_day_idx on public.workout_exercises (day_id, position);

create table public.workout_logs (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.clients (id) on delete cascade,
  workout_exercise_id  uuid references public.workout_exercises (id) on delete set null,
  exercise_id          uuid not null references public.exercises (id) on delete restrict,
  performed_at         date not null default current_date,
  set_number           smallint not null check (set_number between 1 and 30),
  weight_kg            numeric(6,2) check (weight_kg >= 0),
  reps                 smallint check (reps between 0 and 200),
  rir                  numeric(3,1) check (rir between 0 and 10),
  rpe                  numeric(3,1) check (rpe between 1 and 10),
  comment              text check (length(comment) <= 500),
  created_at           timestamptz not null default now()
);
create index workout_logs_client_idx on public.workout_logs (client_id, performed_at desc);
create index workout_logs_exercise_idx on public.workout_logs (client_id, exercise_id, performed_at);

-- ---------------------------------------------------------------------
-- Check-ins y fotos
-- ---------------------------------------------------------------------
create table public.checkins (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 uuid not null references public.clients (id) on delete cascade,
  week_start                date not null,
  submitted_at              timestamptz not null default now(),
  weight_kg                 numeric(5,2) check (weight_kg between 20 and 400),
  waist_cm                  numeric(5,1) check (waist_cm between 30 and 250),
  nutrition_adherence_pct   smallint check (nutrition_adherence_pct between 0 and 100),
  workouts_completed        smallint check (workouts_completed between 0 and 14),
  workouts_planned          smallint check (workouts_planned between 0 and 14),
  cardio_minutes            integer check (cardio_minutes between 0 and 3000),
  sleep_hours               numeric(3,1) check (sleep_hours between 0 and 24),
  energy                    smallint check (energy between 1 and 10),
  hunger                    smallint check (hunger between 1 and 10),
  stress                    smallint check (stress between 1 and 10),
  comments                  text check (length(comments) <= 3000),
  extra_answers             jsonb not null default '{}'::jsonb,
  -- Puntuación sugerida por el sistema (ver trigger) y revisión del coach
  adherence_score           smallint,
  coach_adherence_override  smallint check (coach_adherence_override between 0 and 100),
  coach_feedback            text check (length(coach_feedback) <= 3000),
  status                    public.checkin_status not null default 'submitted',
  reviewed_at               timestamptz,
  unique (client_id, week_start)
);
create index checkins_client_idx on public.checkins (client_id, submitted_at desc);

create table public.progress_photos (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  checkin_id    uuid references public.checkins (id) on delete set null,
  storage_path  text not null unique, -- {client_id}/{uuid}.jpg dentro del bucket privado
  pose          public.photo_pose not null default 'front',
  taken_at      date not null default current_date,
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index progress_photos_client_idx on public.progress_photos (client_id, taken_at desc);

-- ---------------------------------------------------------------------
-- Membresía y pagos (solo el backend escribe aquí)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null unique references public.clients (id) on delete cascade,
  provider                public.payment_provider not null default 'manual',
  status                  public.subscription_status not null default 'none',
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  plan_name               text,
  amount_cents            integer check (amount_cents >= 0),
  currency                text not null default 'usd',
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.payments (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients (id) on delete cascade,
  subscription_id       uuid references public.subscriptions (id) on delete set null,
  provider              public.payment_provider not null,
  provider_payment_id   text unique, -- invoice / payment_intent de Stripe
  amount_cents          integer not null check (amount_cents >= 0),
  currency              text not null default 'usd',
  status                public.payment_status not null,
  description           text,
  paid_at               timestamptz,
  created_at            timestamptz not null default now()
);
create index payments_client_idx on public.payments (client_id, created_at desc);

-- Idempotencia de webhooks: cada evento de Stripe se procesa una sola vez.
create table public.stripe_events (
  id            text primary key,
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Notificaciones y auditoría
-- ---------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  -- canales ya enviados ('in_app', 'email', 'push') para cuando se agreguen
  delivered   text[] not null default array['in_app'],
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_name  text,
  client_id   uuid, -- sin FK: el historial debe sobrevivir aunque se borre el registro
  entity      text not null,
  entity_id   uuid,
  action      text not null check (action in ('insert', 'update', 'delete')),
  changes     jsonb not null default '{}'::jsonb, -- {campo: {old, new}}
  created_at  timestamptz not null default now()
);
create index audit_logs_client_idx on public.audit_logs (client_id, created_at desc);
