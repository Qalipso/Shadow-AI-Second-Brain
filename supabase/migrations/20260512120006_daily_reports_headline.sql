-- Add headline column to daily_reports for one-line summary display
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS headline text;
