-- Remove duplicate labs_questions (keep lowest id per test_id+question_key).
-- Remove duplicate labs_answer_options (keep lowest id per question_id+value).
-- Then add UNIQUE constraints to prevent future duplicates.

-- Step 1: delete duplicate questions (keep lowest id per test+key)
DELETE FROM labs_questions
WHERE id NOT IN (
  SELECT MIN(id)
  FROM labs_questions
  GROUP BY test_id, question_key
);

-- Step 2: delete duplicate answer_options (keep lowest id per question+value)
DELETE FROM labs_answer_options
WHERE id NOT IN (
  SELECT MIN(id)
  FROM labs_answer_options
  GROUP BY question_id, value
);

-- Step 3: add unique constraints
ALTER TABLE labs_questions
  ADD CONSTRAINT uq_labs_questions_test_key UNIQUE (test_id, question_key);

ALTER TABLE labs_answer_options
  ADD CONSTRAINT uq_labs_answer_options_question_value UNIQUE (question_id, value);

-- Step 4: patch seed inserts to be safe on re-run
-- (Already handled by constraints above for future runs.)
