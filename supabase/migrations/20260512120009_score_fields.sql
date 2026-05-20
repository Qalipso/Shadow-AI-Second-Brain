-- Extend life_area_scores with period tracking + AI rationale.
-- Safe to run even if columns already exist (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.life_area_scores
  ADD COLUMN IF NOT EXISTS period_type  text    DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end   date,
  ADD COLUMN IF NOT EXISTS rationale    text,
  ADD COLUMN IF NOT EXISTS data_volume  integer DEFAULT 0;
