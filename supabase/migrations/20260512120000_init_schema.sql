-- Shadow MVP — canonical schema (aligned with web/src/types/db.ts).
-- Drops + recreates app tables in correct order. `auth.*` is owned by Supabase.

create extension if not exists pgcrypto;
create extension if not exists vector;

------------------------------------------------------------------------------
-- profiles + new-user trigger
------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------------------
-- reference tables (global; RLS read-only)
------------------------------------------------------------------------------
create table if not exists public.life_areas (
  id          smallint primary key,
  slug        text unique not null,
  name        text not null,
  description text,
  order_index smallint not null,
  color_hint  text
);

create table if not exists public.question_bank (
  id                serial primary key,
  text              text not null,
  category          text,
  type              text,                  -- open | numeric | yesno
  time_of_day       text,                  -- morning | day | evening | any
  emotional_depth   smallint default 1,    -- 1..5
  weight            numeric default 1.0,
  is_active         boolean default true,
  is_state_question boolean default false,
  state_key         text,                  -- mood | energy | stress | null
  created_at        timestamptz default now()
);
create index if not exists question_bank_active_idx on public.question_bank (is_active);

------------------------------------------------------------------------------
-- user-owned core
------------------------------------------------------------------------------
create table if not exists public.entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  raw_text          text not null,
  summary           text,
  entry_type        text,                  -- thought | task | feeling | question | event | expense | food
  life_area_id      smallint references public.life_areas(id),
  emotion_primary   text,
  emotion_intensity smallint,
  status            text default 'unprocessed' not null,  -- unprocessed | processed | failed
  embedding         vector(1536),
  created_at        timestamptz default now()
);
create index if not exists entries_user_created_idx on public.entries (user_id, created_at desc);
create index if not exists entries_user_status_idx  on public.entries (user_id, status);
create index if not exists entries_user_area_idx    on public.entries (user_id, life_area_id);
create index if not exists entries_embedding_ivf    on public.entries
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists public.question_answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  question_id   integer references public.question_bank(id) on delete set null,
  value_text    text,
  value_numeric numeric,
  created_at    timestamptz default now()
);
create index if not exists qa_user_created_idx on public.question_answers (user_id, created_at desc);

create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  status          text default 'open' not null,  -- open | done | dropped
  priority        text,                          -- low | medium | high | critical
  linked_entry_id uuid references public.entries(id) on delete set null,
  due_at          timestamptz,
  created_at      timestamptz default now()
);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status, due_at);

create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  status       text default 'active' not null,
  life_area_id smallint references public.life_areas(id),
  created_at   timestamptz default now()
);

create table if not exists public.life_area_scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  life_area_id smallint not null references public.life_areas(id),
  score        numeric not null check (score >= 0 and score <= 10),
  confidence   numeric check (confidence >= 0 and confidence <= 1),
  computed_at  timestamptz default now(),
  unique (user_id, life_area_id, computed_at)
);
create index if not exists area_scores_user_idx on public.life_area_scores (user_id, computed_at desc);

create table if not exists public.daily_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  report_date date not null,
  body        text not null,
  confidence  numeric,
  created_at  timestamptz default now(),
  unique (user_id, report_date)
);

create table if not exists public.ai_processing_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  task        text not null,                -- classify | score | report | embed
  model       text not null,
  latency_ms  integer,
  tokens_in   integer,
  tokens_out  integer,
  cost_usd    numeric,
  ok          boolean default true not null,
  error       text,
  created_at  timestamptz default now()
);
create index if not exists ai_logs_user_task_idx on public.ai_processing_logs (user_id, task, created_at desc);

create table if not exists public.user_settings (
  user_id                       uuid primary key references public.profiles(id) on delete cascade,
  show_questions_on_first_open  boolean default true,
  questions_per_day             smallint default 5,
  ai_tone                       text default 'analytical',
  memory_enabled                boolean default true,
  created_at                    timestamptz default now(),
  updated_at                    timestamptz default now()
);
