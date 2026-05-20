-- User gamification state: points, level, streak
create table if not exists public.user_gamification (
  user_id              uuid    primary key references auth.users(id) on delete cascade,
  total_points         integer not null default 0,
  level                integer not null default 1,
  streak_days          integer not null default 0,
  last_reflection_date date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.user_gamification enable row level security;

create policy "Users manage own gamification"
  on public.user_gamification for all
  using (auth.uid() = user_id);
