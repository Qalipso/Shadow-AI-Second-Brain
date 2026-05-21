-- Sprint 7: persist ritual/habit notes field
ALTER TABLE habits ADD COLUMN IF NOT EXISTS notes text;
