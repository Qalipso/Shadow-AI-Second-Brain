-- ============================================================
-- PENDING MIGRATIONS: missing columns
-- Run in Supabase SQL Editor. Idempotent (IF NOT EXISTS).
-- ============================================================

-- 1. daily_reports.headline (from 20260512120006)
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS headline TEXT;

-- 2. life_area_scores.rationale + data_volume (from 20260525)
ALTER TABLE public.life_area_scores
  ADD COLUMN IF NOT EXISTS rationale    TEXT,
  ADD COLUMN IF NOT EXISTS data_volume  INTEGER;
