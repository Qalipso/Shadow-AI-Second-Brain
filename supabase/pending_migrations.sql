-- ============================================================
-- PENDING MIGRATIONS: 20260513 → 20260519
-- Idempotent: all CREATE POLICY / CREATE TRIGGER guarded
-- Run in Supabase SQL Editor in one shot.
-- ============================================================

-- ─── 20260513_gamification ──────────────────────────────────

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

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_gamification' and policyname = 'Users manage own gamification'
  ) then
    create policy "Users manage own gamification"
      on public.user_gamification for all
      using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 20260514_protocols ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'binary',
  sphere_slugs TEXT[] NOT NULL DEFAULT '{}',
  schedule JSONB NOT NULL DEFAULT '{}',
  target_value NUMERIC,
  target_unit TEXT,
  minimum_version TEXT,
  ideal_version TEXT,
  why TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  priority TEXT NOT NULL DEFAULT 'medium',
  evidence_types TEXT[] DEFAULT '{manual}',
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time TEXT,
  is_active BOOLEAN DEFAULT true,
  strength_score NUMERIC(5,2) DEFAULT 0,
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('done', 'partial', 'skipped', 'missed', 'failed', 'recovered')),
  value NUMERIC,
  note TEXT,
  mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 10),
  energy_after INTEGER CHECK (energy_after BETWEEN 1 AND 10),
  reason_if_skipped TEXT,
  reason_if_failed TEXT,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS habits_user_active ON habits (user_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS habit_logs_user_date ON habit_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS habit_logs_habit_date ON habit_logs (habit_id, log_date DESC);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'habits' and policyname = 'habits: owner full access'
  ) then
    CREATE POLICY "habits: owner full access"
      ON habits FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'habit_logs' and policyname = 'habit_logs: owner full access'
  ) then
    CREATE POLICY "habit_logs: owner full access"
      ON habit_logs FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  end if;
end $$;

CREATE OR REPLACE FUNCTION update_habits_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION update_habit_logs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS habits_updated_at ON habits;
CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_habits_updated_at();

DROP TRIGGER IF EXISTS habit_logs_updated_at ON habit_logs;
CREATE TRIGGER habit_logs_updated_at
  BEFORE UPDATE ON habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_habit_logs_updated_at();

-- ─── 20260515_soul_core ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_soul_state (
  user_id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_souls                INTEGER NOT NULL DEFAULT 0,
  lifetime_souls               INTEGER NOT NULL DEFAULT 0,
  cycle_souls                  INTEGER NOT NULL DEFAULT 0,
  best_cycle_souls             INTEGER NOT NULL DEFAULT 0,
  cycle_started_at             TIMESTAMPTZ DEFAULT now(),
  last_qualifying_activity_at  TIMESTAMPTZ,
  reset_count                  INTEGER NOT NULL DEFAULT 0,
  created_at                   TIMESTAMPTZ DEFAULT now(),
  updated_at                   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.soul_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('award', 'reset', 'milestone')),
  source_type  TEXT CHECK (source_type IN (
    'habit_log', 'task', 'daily_review', 'life_circle', 'inbox', 'goal', 'weekly_review'
  )),
  source_id    UUID,
  amount       INTEGER NOT NULL DEFAULT 0,
  reason       TEXT,
  metadata     JSONB DEFAULT '{}',
  occurred_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS soul_events_user_occurred ON public.soul_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS soul_events_user_source   ON public.soul_events (user_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS user_soul_state_user      ON public.user_soul_state (user_id);

ALTER TABLE public.user_soul_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soul_events     ENABLE ROW LEVEL SECURITY;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'user_soul_state' and policyname = 'soul_state: owner full access'
  ) then
    CREATE POLICY "soul_state: owner full access"
      ON public.user_soul_state FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'soul_events' and policyname = 'soul_events: owner select'
  ) then
    CREATE POLICY "soul_events: owner select"
      ON public.soul_events FOR SELECT
      USING (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'soul_events' and policyname = 'soul_events: owner insert'
  ) then
    CREATE POLICY "soul_events: owner insert"
      ON public.soul_events FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  end if;
end $$;

CREATE OR REPLACE FUNCTION update_user_soul_state_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS user_soul_state_updated_at ON public.user_soul_state;
CREATE TRIGGER user_soul_state_updated_at
  BEFORE UPDATE ON public.user_soul_state
  FOR EACH ROW EXECUTE FUNCTION update_user_soul_state_updated_at();

-- ─── 20260516_direction ─────────────────────────────────────

alter table public.goals
  add column if not exists description       text,
  add column if not exists why               text,
  add column if not exists linked_life_areas text[] default '{}',
  add column if not exists goal_type         text check (goal_type in ('outcome','identity','recovery','skill','project','experiment')),
  add column if not exists clarity_score     smallint check (clarity_score between 0 and 10),
  add column if not exists energy_score      smallint check (energy_score between 0 and 10),
  add column if not exists progress          smallint default 0 check (progress between 0 and 100),
  add column if not exists deadline          date,
  add column if not exists updated_at        timestamptz default now();

create table if not exists public.missions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  goal_id           uuid references public.goals(id) on delete set null,
  title             text not null,
  description       text,
  status            text not null default 'active'
                      check (status in ('active','paused','completed','blocked','abandoned')),
  progress          smallint default 0 check (progress between 0 and 100),
  linked_life_areas text[] default '{}',
  blocker           text,
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null
);

create index if not exists missions_user_idx on public.missions (user_id, status);
create index if not exists missions_goal_idx on public.missions (goal_id);

alter table public.tasks
  add column if not exists description         text,
  add column if not exists goal_id             uuid references public.goals(id) on delete set null,
  add column if not exists mission_id          uuid references public.missions(id) on delete set null,
  add column if not exists energy_cost         smallint check (energy_cost between 0 and 10),
  add column if not exists linked_life_areas   text[] default '{}',
  add column if not exists created_from_inbox  boolean default false,
  add column if not exists updated_at          timestamptz default now();

alter table public.goals enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'goals' and policyname = 'goals_owner'
  ) then
    create policy goals_owner on public.goals
      for all using (user_id = auth.uid());
  end if;
end $$;

alter table public.missions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'missions' and policyname = 'missions_owner'
  ) then
    create policy missions_owner on public.missions
      for all using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists goals_updated_at    on public.goals;
drop trigger if exists missions_updated_at on public.missions;
drop trigger if exists tasks_updated_at    on public.tasks;

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create trigger missions_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ─── 20260517_fix_habit_strength_default ────────────────────

update public.habits h
set strength_score = 0
where h.strength_score = 50
  and not exists (
    select 1 from public.habit_logs l where l.habit_id = h.id
  );

alter table public.habits
  alter column strength_score set default 0;

-- ─── 20260518_sonic_mirror ──────────────────────────────────

CREATE TABLE IF NOT EXISTS music_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider       text NOT NULL DEFAULT 'spotify',
  access_token   text,
  refresh_token  text,
  token_expires_at timestamptz,
  connected_at   timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  top_artists_short  jsonb DEFAULT '[]',
  top_artists_medium jsonb DEFAULT '[]',
  top_artists_long   jsonb DEFAULT '[]',
  top_tracks_short   jsonb DEFAULT '[]',
  top_tracks_medium  jsonb DEFAULT '[]',
  top_tracks_long    jsonb DEFAULT '[]',
  recent_tracks      jsonb DEFAULT '[]',
  dominant_genres    jsonb DEFAULT '[]',
  repeat_score      numeric(5,2) DEFAULT 0,
  exploration_score numeric(5,2) DEFAULT 0,
  intensity_score   numeric(5,2) DEFAULT 0,
  nostalgia_score   numeric(5,2) DEFAULT 0,
  focus_score       numeric(5,2) DEFAULT 0,
  sonic_archetype     text,
  current_sound_state text,
  ai_summary          text,
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS music_insights (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period           text NOT NULL DEFAULT 'weekly',
  title            text,
  description      text,
  linked_life_areas jsonb DEFAULT '[]',
  linked_mood      text,
  confidence       numeric(4,3) DEFAULT 0.7,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emotional_anchors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id         text NOT NULL,
  track_name       text NOT NULL,
  artist_name      text NOT NULL,
  album_art_url    text,
  user_meaning     text,
  detected_pattern text,
  linked_life_areas jsonb DEFAULT '[]',
  play_count       integer DEFAULT 1,
  first_seen_at    timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id)
);

ALTER TABLE music_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_insights   ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_anchors ENABLE ROW LEVEL SECURITY;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'music_profiles' and policyname = 'music_profiles_own') then
    CREATE POLICY "music_profiles_own" ON music_profiles FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'music_insights' and policyname = 'music_insights_own') then
    CREATE POLICY "music_insights_own" ON music_insights FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'emotional_anchors' and policyname = 'emotional_anchors_own') then
    CREATE POLICY "emotional_anchors_own" ON emotional_anchors FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

CREATE INDEX IF NOT EXISTS idx_music_profiles_user    ON music_profiles    (user_id);
CREATE INDEX IF NOT EXISTS idx_music_insights_user    ON music_insights    (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_anchors_user ON emotional_anchors (user_id);

-- ─── 20260519_spotify_connect ───────────────────────────────

CREATE TABLE IF NOT EXISTS spotify_connections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'connected',
  spotify_user_id     text,
  spotify_display_name text,
  access_token_enc    text NOT NULL,
  refresh_token_enc   text,
  token_expires_at    timestamptz NOT NULL,
  scopes              text[] DEFAULT '{}',
  connected_at        timestamptz DEFAULT now(),
  last_synced_at      timestamptz,
  error_message       text,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS spotify_artist_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_artist_id text NOT NULL,
  name              text NOT NULL,
  genres            text[] DEFAULT '{}',
  popularity        integer DEFAULT 0,
  image_url         text,
  spotify_url       text,
  period            text NOT NULL,
  rank              integer NOT NULL,
  fetched_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, spotify_artist_id, period)
);

CREATE TABLE IF NOT EXISTS spotify_track_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_track_id  text NOT NULL,
  name              text NOT NULL,
  artist_names      text[] DEFAULT '{}',
  album_name        text,
  image_url         text,
  spotify_url       text,
  duration_ms       integer DEFAULT 0,
  popularity        integer DEFAULT 0,
  period            text NOT NULL,
  rank              integer NOT NULL,
  played_at         timestamptz,
  fetched_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, spotify_track_id, period)
);

CREATE TABLE IF NOT EXISTS music_snapshots (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider             text NOT NULL DEFAULT 'spotify',
  repeated_artists     jsonb DEFAULT '[]',
  repeated_tracks      jsonb DEFAULT '[]',
  dominant_genres      jsonb DEFAULT '[]',
  short_vs_long_shift  text DEFAULT 'stable',
  created_at           timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS music_meaning_labels (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type    text NOT NULL,
  item_id      text NOT NULL,
  item_name    text NOT NULL,
  artist_name  text,
  label        text NOT NULL,
  user_note    text,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_type, item_id, label)
);

CREATE TABLE IF NOT EXISTS sonic_reflections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text,
  summary           text,
  patterns          jsonb DEFAULT '[]',
  possible_meanings jsonb DEFAULT '[]',
  linked_life_areas jsonb DEFAULT '[]',
  confidence        text DEFAULT 'low',
  user_question     text,
  input_label_count integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE spotify_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_artist_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_track_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_meaning_labels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sonic_reflections     ENABLE ROW LEVEL SECURITY;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'spotify_connections' and policyname = 'sc_own') then
    CREATE POLICY "sc_own" ON spotify_connections FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'spotify_artist_items' and policyname = 'sai_own') then
    CREATE POLICY "sai_own" ON spotify_artist_items FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'spotify_track_items' and policyname = 'sti_own') then
    CREATE POLICY "sti_own" ON spotify_track_items FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'music_snapshots' and policyname = 'ms_own') then
    CREATE POLICY "ms_own" ON music_snapshots FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'music_meaning_labels' and policyname = 'mml_own') then
    CREATE POLICY "mml_own" ON music_meaning_labels FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'sonic_reflections' and policyname = 'sr_own') then
    CREATE POLICY "sr_own" ON sonic_reflections FOR ALL USING (auth.uid() = user_id);
  end if;
end $$;

CREATE INDEX IF NOT EXISTS idx_sc_user     ON spotify_connections  (user_id);
CREATE INDEX IF NOT EXISTS idx_sai_user    ON spotify_artist_items (user_id, period, rank);
CREATE INDEX IF NOT EXISTS idx_sti_user    ON spotify_track_items  (user_id, period, rank);
CREATE INDEX IF NOT EXISTS idx_ms_user     ON music_snapshots      (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mml_user    ON music_meaning_labels (user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_sr_user     ON sonic_reflections    (user_id, created_at DESC);
