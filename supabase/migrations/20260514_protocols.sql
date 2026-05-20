-- LifeOS Protocols — Habit Tracker
-- Migration: 20260514_protocols.sql

-- habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'binary',        -- binary|measurable|timer|avoidance|ritual
  sphere_slugs TEXT[] NOT NULL DEFAULT '{}',  -- refs life_areas.slug values
  schedule JSONB NOT NULL DEFAULT '{}',
  -- schedule shape: { type: daily|weekly|specific_days|times_per_week, daysOfWeek?: string[], timesPerWeek?: number, timeWindow?: { start?: string, end?: string } }
  target_value NUMERIC,
  target_unit TEXT,                           -- minutes|steps|pages|glasses|sessions|custom
  minimum_version TEXT,
  ideal_version TEXT,
  why TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',  -- easy|medium|hard
  priority TEXT NOT NULL DEFAULT 'medium',    -- low|medium|high
  evidence_types TEXT[] DEFAULT '{manual}',   -- manual|note|timer|metric|ai
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time TEXT,                         -- "HH:MM"
  is_active BOOLEAN DEFAULT true,
  -- cached analytics (updated on each log save)
  strength_score NUMERIC(5,2) DEFAULT 0,      -- 0-100
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,     -- 0-100
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- habit_logs table (one row per habit per day max)
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

-- Indexes
CREATE INDEX IF NOT EXISTS habits_user_active ON habits (user_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS habit_logs_user_date ON habit_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS habit_logs_habit_date ON habit_logs (habit_id, log_date DESC);

-- RLS for habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habits: owner full access"
  ON habits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for habit_logs
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_logs: owner full access"
  ON habit_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on habits
CREATE OR REPLACE FUNCTION update_habits_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_habits_updated_at();

CREATE OR REPLACE FUNCTION update_habit_logs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER habit_logs_updated_at
  BEFORE UPDATE ON habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_habit_logs_updated_at();
