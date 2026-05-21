-- Sprint 6B: persist previously-buffered drawer fields
-- Goals: free-text notes
ALTER TABLE goals ADD COLUMN IF NOT EXISTS notes text;

-- Missions: outcome (deliverable), deadline, free-text notes
ALTER TABLE missions ADD COLUMN IF NOT EXISTS outcome  text;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS notes    text;

-- Tasks: notes, next physical action, blocker
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes       text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocker     text;
