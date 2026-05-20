-- Phase 4.1A: Many-to-many entries → life areas + scores extensions
-- Allows one entry to relate to multiple life areas.
-- Keeps entries.life_area_id as primary area for backward compat.

------------------------------------------------------------------------------
-- junction: entry_life_areas
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entry_life_areas (
  entry_id     uuid     NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  life_area_id smallint NOT NULL REFERENCES public.life_areas(id),
  is_primary   boolean  DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (entry_id, life_area_id)
);

CREATE INDEX IF NOT EXISTS entry_areas_area_idx
  ON public.entry_life_areas (life_area_id);
CREATE INDEX IF NOT EXISTS entry_areas_entry_idx
  ON public.entry_life_areas (entry_id);

-- RLS: users can only see junction rows for their own entries
ALTER TABLE public.entry_life_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own entry areas"
  ON public.entry_life_areas FOR ALL
  USING (entry_id IN (SELECT id FROM public.entries WHERE user_id = auth.uid()))
  WITH CHECK (entry_id IN (SELECT id FROM public.entries WHERE user_id = auth.uid()));

-- Backfill: copy existing entries.life_area_id into junction table
INSERT INTO public.entry_life_areas (entry_id, life_area_id, is_primary)
SELECT id, life_area_id, true
FROM public.entries
WHERE life_area_id IS NOT NULL
ON CONFLICT DO NOTHING;

------------------------------------------------------------------------------
-- extend life_area_scores for period-based scoring
------------------------------------------------------------------------------
ALTER TABLE public.life_area_scores
  ADD COLUMN IF NOT EXISTS period_type  text    DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end   date,
  ADD COLUMN IF NOT EXISTS rationale    text,
  ADD COLUMN IF NOT EXISTS data_volume  integer DEFAULT 0;

-- Drop old unique constraint and replace with period-aware one
-- (old: unique(user_id, life_area_id, computed_at))
-- We keep computed_at for backward compat but add period columns.
-- No constraint change needed — computed_at still works as discriminator.
