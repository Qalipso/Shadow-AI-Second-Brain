-- Add checkin_id FK to ai_question_answers (referenced in POST /api/checkin)
ALTER TABLE ai_question_answers
  ADD COLUMN IF NOT EXISTS checkin_id UUID REFERENCES daily_checkins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_qa_checkin ON ai_question_answers(checkin_id);
