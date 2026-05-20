-- Shadow Interventions
-- AI-generated micro-rituals that move user from friction into action.
-- 4 tool types: task_shatter | dopamine_menu | context_switch | interest_filter

CREATE TABLE IF NOT EXISTS interventions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('task_shatter','dopamine_menu','context_switch','interest_filter')),
  user_input          JSONB NOT NULL,
  energy_level        TEXT CHECK (energy_level IN ('low','medium','high')),
  mood                TEXT,
  friction            TEXT,
  result_json         JSONB NOT NULL,
  first_action        TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','dismissed')),
  saved_to_memory     BOOLEAN NOT NULL DEFAULT false,
  converted_to_tasks  BOOLEAN NOT NULL DEFAULT false,
  added_to_today      BOOLEAN NOT NULL DEFAULT false,
  model               TEXT,
  tokens_in           INTEGER,
  tokens_out          INTEGER,
  cost_usd            NUMERIC(10,6),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS interventions_user_created_idx
  ON interventions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS interventions_user_type_idx
  ON interventions(user_id, type, created_at DESC);

-- RLS
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interventions_owner" ON interventions;
CREATE POLICY "interventions_owner" ON interventions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
