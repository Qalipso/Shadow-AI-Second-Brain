-- Shadow MVP — initial schema (Postgres + pgvector)
-- Authoritative version. db/schema/shadow.sql mirrors this.

create extension if not exists "pgcrypto";
create extension if not exists vector;

------------------------------------------------------------------------------
-- profiles (mirrors auth.users)
------------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------------------
-- reference tables
------------------------------------------------------------------------------
create table if not exists life_areas (
  id smallint primary key,
  slug text unique not null,
  name text not null,
  description text,
  order_index smallint not null
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text,
  life_areas smallint[],
  question_type text,             -- morning | evening | checkin | reflect
  time_of_day text,               -- morning | midday | evening | any
  emotional_depth smallint default 1,  -- 1=surface, 2=middle, 3=deep/shadow
  frequency_weight smallint default 5,
  is_active boolean default true,
  created_at timestamptz default now()
);

------------------------------------------------------------------------------
-- user-owned core
------------------------------------------------------------------------------
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  raw_text text not null,
  input_type text default 'text',
  source text default 'web',
  mood_score smallint,
  energy_score smallint,
  stress_score smallint,
  processed_status text default 'pending',
  created_at timestamptz default now()
);
create index if not exists entries_user_created_idx on entries (user_id, created_at desc);

create table if not exists entry_classifications (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid unique references entries(id) on delete cascade,
  primary_type text,
  secondary_types text[],
  life_areas smallint[],
  tags text[],
  extracted jsonb,
  ai_confidence numeric,
  correction_status text default 'none',
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_entry_id uuid references entries(id) on delete set null,
  title text not null,
  description text,
  status text default 'open',
  priority smallint default 3,
  due_date date,
  life_areas smallint[],
  created_at timestamptz default now()
);
create index if not exists tasks_user_status_idx on tasks (user_id, status, due_date);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  time_horizon text,
  target_date date,
  status text default 'active',
  life_areas smallint[],
  progress_score smallint,
  created_at timestamptz default now()
);

create table if not exists question_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  question_id uuid references questions(id) on delete set null,
  answer_text text,
  mood_score smallint,
  energy_score smallint,
  extracted_life_areas smallint[],
  created_at timestamptz default now()
);
create index if not exists answers_user_created_idx on question_answers (user_id, created_at desc);

create table if not exists life_area_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  life_area_id smallint references life_areas(id),
  period_start date,
  period_end date,
  score smallint,
  trend text,
  confidence numeric,
  created_at timestamptz default now()
);
create index if not exists area_scores_user_period_idx on life_area_scores (user_id, period_start);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_entry_id uuid references entries(id) on delete set null,
  amount numeric not null,
  currency text default 'USD',
  category text,
  description text,
  logged_at timestamptz default now()
);

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_entry_id uuid references entries(id) on delete set null,
  description text,
  estimated_calories int,
  protein numeric,
  carbs numeric,
  fat numeric,
  quality_score smallint,
  logged_at timestamptz default now()
);

create table if not exists emotion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_entry_id uuid references entries(id) on delete set null,
  emotion text,
  intensity smallint,
  valence smallint,
  context text,
  logged_at timestamptz default now()
);

create table if not exists metric_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_entry_id uuid references entries(id) on delete set null,
  metric_type text,
  value numeric,
  unit text,
  life_area_id smallint,
  logged_at timestamptz default now()
);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text,
  description text,
  insight_type text,
  life_areas smallint[],
  source_entries uuid[],
  confidence numeric,
  usefulness_rating smallint,
  created_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  report_type text,                         -- daily | weekly | monthly
  period_start date,
  period_end date,
  summary text,
  life_area_scores jsonb,
  key_patterns jsonb,
  recommendations jsonb,
  risks jsonb,
  created_at timestamptz default now()
);
create index if not exists reports_user_type_period_idx on reports (user_id, report_type, period_start desc);

create table if not exists memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_type text,                         -- entry | report | insight | goal
  source_id uuid,
  content text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists memory_embeddings_ivf on memory_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists memory_embeddings_user_type_idx on memory_embeddings (user_id, source_type);

create table if not exists ai_processing_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  operation text not null,                  -- classify | report_daily | report_weekly | embed | insight
  model text,
  source_id uuid,
  input_hash text,
  prompt_tokens int,
  completion_tokens int,
  latency_ms int,
  status text default 'success',            -- success | error | retry
  error_message text,
  created_at timestamptz default now()
);
create index if not exists ai_logs_user_op_idx on ai_processing_logs (user_id, operation, created_at desc);
