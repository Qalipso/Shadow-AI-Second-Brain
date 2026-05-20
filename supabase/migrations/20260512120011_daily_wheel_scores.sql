-- Daily self-assessment scores for the Life Wheel.
-- One row per user per calendar day. Upsert on re-submission.
-- Separate from AI-computed life_area_scores — user scores take priority.

create table if not exists public.daily_wheel_scores (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  scored_date    date not null,

  -- 12 main life areas (slug-named columns, nullable = not yet rated)
  work           smallint check (work between 0 and 10),
  money          smallint check (money between 0 and 10),
  health         smallint check (health between 0 and 10),
  energy         smallint check (energy between 0 and 10),
  food           smallint check (food between 0 and 10),
  mind           smallint check (mind between 0 and 10),
  creativity     smallint check (creativity between 0 and 10),
  social         smallint check (social between 0 and 10),
  emotion        smallint check (emotion between 0 and 10),
  discipline     smallint check (discipline between 0 and 10),
  environment    smallint check (environment between 0 and 10),
  meaning        smallint check (meaning between 0 and 10),

  -- 3 optional psychological extras
  autonomy       smallint check (autonomy between 0 and 10),
  inner_noise    smallint check (inner_noise between 0 and 10),
  self_compassion smallint check (self_compassion between 0 and 10),

  submitted_at   timestamptz default now(),
  created_at     timestamptz default now(),

  unique(user_id, scored_date)
);

-- RLS
alter table public.daily_wheel_scores enable row level security;

create policy "Users see own wheel scores"
  on public.daily_wheel_scores for select
  using (auth.uid() = user_id);

create policy "Users insert own wheel scores"
  on public.daily_wheel_scores for insert
  with check (auth.uid() = user_id);

create policy "Users update own wheel scores"
  on public.daily_wheel_scores for update
  using (auth.uid() = user_id);
