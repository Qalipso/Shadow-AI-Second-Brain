-- Add rationale and data_volume columns to life_area_scores
-- These are populated by /api/score-areas and used in the Areas UI.

ALTER TABLE life_area_scores
  ADD COLUMN IF NOT EXISTS rationale    TEXT,
  ADD COLUMN IF NOT EXISTS data_volume  INTEGER;
