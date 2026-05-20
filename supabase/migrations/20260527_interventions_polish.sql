-- Shadow Interventions polish migration.
-- 1) Add 'archived' lifecycle state.
-- 2) Add source_intervention_* columns to entries so tasks remember their origin.

-- ── 1. interventions.status: include 'archived' ───────────────────────────
ALTER TABLE interventions DROP CONSTRAINT IF EXISTS interventions_status_check;
ALTER TABLE interventions
  ADD CONSTRAINT interventions_status_check
  CHECK (status IN ('draft','active','completed','archived','dismissed'));

-- ── 2. entries: track origin when converted from an intervention ──────────
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS source_intervention_id   UUID,
  ADD COLUMN IF NOT EXISTS source_intervention_type TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes        INTEGER;

CREATE INDEX IF NOT EXISTS entries_source_intervention_idx
  ON entries(source_intervention_id);
