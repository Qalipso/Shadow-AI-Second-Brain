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
-- Row-level security. Personal tables: user owns their rows.
-- Reference tables: anyone authenticated can read; only service role writes.

-- Enable RLS.
alter table public.profiles            enable row level security;
alter table public.life_areas          enable row level security;
alter table public.question_bank       enable row level security;
alter table public.entries             enable row level security;
alter table public.question_answers    enable row level security;
alter table public.tasks               enable row level security;
alter table public.goals               enable row level security;
alter table public.life_area_scores    enable row level security;
alter table public.daily_reports       enable row level security;
alter table public.ai_processing_logs  enable row level security;
alter table public.user_settings       enable row level security;

------------------------------------------------------------------------------
-- profiles
------------------------------------------------------------------------------
drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id);

create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

------------------------------------------------------------------------------
-- reference tables (global read for authed users)
------------------------------------------------------------------------------
drop policy if exists life_areas_read on public.life_areas;
create policy life_areas_read on public.life_areas
  for select to authenticated using (true);

drop policy if exists question_bank_read on public.question_bank;
create policy question_bank_read on public.question_bank
  for select to authenticated using (is_active = true);

------------------------------------------------------------------------------
-- personal tables: full CRUD owned by user
------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'entries',
    'question_answers',
    'tasks',
    'goals',
    'life_area_scores',
    'daily_reports',
    'ai_processing_logs',
    'user_settings'
  ])
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    if t = 'user_settings' then
      execute format($f$
        create policy %I_select on public.%I
          for select using (auth.uid() = user_id);
        create policy %I_insert on public.%I
          for insert with check (auth.uid() = user_id);
        create policy %I_update on public.%I
          for update using (auth.uid() = user_id);
        create policy %I_delete on public.%I
          for delete using (auth.uid() = user_id);
      $f$, t, t, t, t, t, t, t, t);
    else
      execute format($f$
        create policy %I_select on public.%I
          for select using (auth.uid() = user_id);
        create policy %I_insert on public.%I
          for insert with check (auth.uid() = user_id);
        create policy %I_update on public.%I
          for update using (auth.uid() = user_id);
        create policy %I_delete on public.%I
          for delete using (auth.uid() = user_id);
      $f$, t, t, t, t, t, t, t, t);
    end if;
  end loop;
end$$;
-- 12 canonical life areas. Color hints match web/src/lib/seed-fallback.ts.

insert into public.life_areas (id, slug, name, description, order_index, color_hint) values
  (1,  'work',        'Work',        'Career, focus, output',         1,  '#C9A36A'),
  (2,  'money',       'Money',       'Income, spending, runway',      2,  '#6FBF8A'),
  (3,  'health',      'Health',      'Body, sleep, movement',         3,  '#E36161'),
  (4,  'energy',      'Energy',      'Daily fuel + recovery',         4,  '#E0B25C'),
  (5,  'food',        'Food',        'Eating + nutrition',            5,  '#A38BFF'),
  (6,  'mind',        'Mind',        'Thoughts, focus, learning',     6,  '#6D7BFF'),
  (7,  'creativity',  'Creativity',  'Making, ideas, expression',     7,  '#6BB7C9'),
  (8,  'social',      'Social',      'People, relationships',         8,  '#D58CA0'),
  (9,  'emotion',     'Emotion',     'Feeling, mood, processing',     9,  '#8FB46B'),
  (10, 'discipline',  'Discipline',  'Habits, follow-through',        10, '#C97A6A'),
  (11, 'environment', 'Environment', 'Space, surroundings',           11, '#7FA1C9'),
  (12, 'meaning',     'Meaning',     'Purpose, direction',            12, '#B86DFF')
on conflict (id) do update
set slug        = excluded.slug,
    name        = excluded.name,
    description = excluded.description,
    order_index = excluded.order_index,
    color_hint  = excluded.color_hint;
-- Seed question_bank. 3 state questions + 20 reflection questions.
-- Schema column names differ from db/seeds/question_bank.sql:
--   question_type → type
--   frequency_weight (1..10) → weight (numeric)

insert into public.question_bank
  (text, category, type, time_of_day, emotional_depth, weight, is_active, is_state_question, state_key) values
  -- Three state questions used by Dashboard meters.
  ('How is your mood right now (1–10)?',                   'state',        'numeric', 'any',     1, 1.0, true, true,  'mood'),
  ('How is your energy right now (1–10)?',                 'state',        'numeric', 'any',     1, 1.0, true, true,  'energy'),
  ('How is your stress right now (1–10)?',                 'state',        'numeric', 'any',     1, 1.0, true, true,  'stress'),

  -- Reflection / capture (translated from db/seeds/question_bank.sql).
  ('What is occupying your mind most right now?',          'mind',         'open',    'morning', 1, 0.8, true, false, null),
  ('What is the one thing you must do today?',             'productivity', 'open',    'morning', 1, 0.9, true, false, null),
  ('What could overload you today?',                       'overload',     'open',    'morning', 2, 0.7, true, false, null),
  ('What do you want to feel by the end of the day?',      'emotion',      'open',    'morning', 2, 0.6, true, false, null),
  ('What are you postponing?',                             'discipline',   'open',    'any',     2, 0.7, true, false, null),
  ('Which thought keeps repeating these days?',            'shadow',       'open',    'evening', 3, 0.5, true, false, null),
  ('What was most unpleasant today?',                      'emotion',      'open',    'evening', 2, 0.6, true, false, null),
  ('What was most alive today?',                           'emotion',      'open',    'evening', 2, 0.6, true, false, null),
  ('Where did you spend the most attention?',              'mind',         'open',    'evening', 1, 0.7, true, false, null),
  ('How did you treat your body today?',                   'body',         'open',    'evening', 2, 0.6, true, false, null),
  ('Was there a moment today you lost control?',           'discipline',   'open',    'evening', 3, 0.5, true, false, null),
  ('What moved you closer to a long-term goal today?',     'goals',        'open',    'evening', 2, 0.7, true, false, null),
  ('What pattern are you noticing in yourself?',           'shadow',       'open',    'any',     3, 0.5, true, false, null),
  ('What would be worth letting go of?',                   'shadow',       'open',    'any',     3, 0.4, true, false, null),
  ('Who or what did you give attention to today?',         'social',       'open',    'evening', 1, 0.6, true, false, null),
  ('What gave you energy today?',                          'energy',       'open',    'evening', 1, 0.7, true, false, null),
  ('What took your energy today?',                         'energy',       'open',    'evening', 2, 0.7, true, false, null),
  ('What did you do out of respect for your future self?', 'meaning',      'open',    'evening', 3, 0.7, true, false, null),
  ('What did you do impulsively?',                         'discipline',   'open',    'evening', 2, 0.6, true, false, null)
on conflict do nothing;
