-- Allow multiple check-ins per day (remove unique constraint on user_id+date).
-- Each check-in is a separate snapshot, ordered by created_at within the day.
ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_user_id_date_key;
