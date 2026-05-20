-- ─── Soul Core ──────────────────────────────────────────────────────────────
-- Souls represent accumulated life energy gathered by meaningful user actions.
-- They only accumulate (never spent). current_souls resets after 7 days of
-- silence. lifetime_souls, history, and best_cycle_souls are permanent.

-- ─── user_soul_state ─────────────────────────────────────────────────────────

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

-- ─── soul_events ─────────────────────────────────────────────────────────────

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
  -- Idempotency: one soul award per (user, source). Nulls are not equal in
  -- Postgres unique constraints, so reset events (null source) are not blocked.
  UNIQUE (user_id, source_type, source_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS soul_events_user_occurred
  ON public.soul_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS soul_events_user_source
  ON public.soul_events (user_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS user_soul_state_user
  ON public.user_soul_state (user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_soul_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soul_events     ENABLE ROW LEVEL SECURITY;

-- user_soul_state: owner full access (server API writes on behalf of user)
CREATE POLICY "soul_state: owner full access"
  ON public.user_soul_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- soul_events: owner can read + server can insert via authenticated session
CREATE POLICY "soul_events: owner select"
  ON public.soul_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "soul_events: owner insert"
  ON public.soul_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No client-side UPDATE/DELETE: soul_events is an immutable ledger.
-- All writes happen through controlled server API routes.

-- ─── Auto-update trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_user_soul_state_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_soul_state_updated_at
  BEFORE UPDATE ON public.user_soul_state
  FOR EACH ROW EXECUTE FUNCTION update_user_soul_state_updated_at();
