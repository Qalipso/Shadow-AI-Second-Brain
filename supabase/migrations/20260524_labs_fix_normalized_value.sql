-- Fix: normalized_value was NUMERIC(4,2) which overflows at 100.00.
-- normalizeValue() maps raw=5,reverse=false → 100.00 which has 5 digits total.
-- Change to NUMERIC(5,2) to allow values 0.00–100.00.

ALTER TABLE labs_answers
  ALTER COLUMN normalized_value TYPE NUMERIC(5,2);
