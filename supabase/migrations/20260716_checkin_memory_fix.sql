-- Fix checkin-derived memory writes (issue #18).
--
-- checkin/route.ts upserts memory_items with
-- ON CONFLICT (user_id, date, memory_type) — but memory_items has never had
-- a `date` column, so every "current_state" upsert from a check-in has been
-- silently failing since this code shipped (the call is wrapped in
-- try{}catch{ /* non-critical */ }, so the Postgres error was swallowed
-- on every single call).
--
-- Zero existing rows are affected by this migration: the write has never
-- once succeeded, so there is nothing to backfill.

ALTER TABLE memory_items
  ADD COLUMN IF NOT EXISTS date DATE;

-- Backs the ON CONFLICT target checkin/route.ts already uses. NULL dates
-- (every memory_items row from every other source_type) don't collide with
-- each other under standard Postgres unique-index NULL semantics, so this
-- only actually constrains the checkin current_state rows that set date.
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_items_user_date_type
  ON memory_items (user_id, date, memory_type);
