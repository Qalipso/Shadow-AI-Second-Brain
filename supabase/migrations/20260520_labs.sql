-- Labs: Self-Knowledge Laboratory
-- Core tables (no pgvector dependency).
-- Run 20260521_labs_memory_vector.sql separately AFTER enabling pgvector.

-- ─── labs_tests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labs_tests (
  id               SERIAL PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT,
  version          TEXT NOT NULL DEFAULT '1.0',
  source_type      TEXT NOT NULL DEFAULT 'shadow',
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── labs_questions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labs_questions (
  id               SERIAL PRIMARY KEY,
  test_id          INTEGER NOT NULL REFERENCES labs_tests(id) ON DELETE CASCADE,
  question_text    TEXT NOT NULL,
  question_key     TEXT NOT NULL,
  dimension        TEXT NOT NULL,
  reverse_scored   BOOLEAN NOT NULL DEFAULT false,
  order_index      INTEGER NOT NULL DEFAULT 0,
  answer_type      TEXT NOT NULL DEFAULT 'likert5',
  metadata_json    JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── labs_answer_options ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labs_answer_options (
  id               SERIAL PRIMARY KEY,
  question_id      INTEGER NOT NULL REFERENCES labs_questions(id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  value            INTEGER NOT NULL,
  order_index      INTEGER NOT NULL DEFAULT 0
);

-- ─── labs_sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labs_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  test_id          INTEGER NOT NULL REFERENCES labs_tests(id),
  status           TEXT NOT NULL DEFAULT 'in_progress',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  duration_seconds INTEGER,
  test_version     TEXT NOT NULL DEFAULT '1.0',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labs_sessions_user ON labs_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_labs_sessions_test  ON labs_sessions(test_id);

-- ─── labs_answers ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labs_answers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES labs_sessions(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  question_id      INTEGER NOT NULL REFERENCES labs_questions(id),
  raw_value        INTEGER NOT NULL,
  normalized_value NUMERIC(4,2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labs_answers_session ON labs_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_labs_answers_user    ON labs_answers(user_id);

-- ─── labs_results ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labs_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL,
  test_id             INTEGER NOT NULL REFERENCES labs_tests(id),
  session_id          UUID NOT NULL REFERENCES labs_sessions(id) ON DELETE CASCADE,
  scores_json         JSONB NOT NULL DEFAULT '{}',
  interpretation_json JSONB NOT NULL DEFAULT '{}',
  ai_summary_text     TEXT,
  confidence_level    NUMERIC(3,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labs_results_user ON labs_results(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_labs_results_session ON labs_results(session_id);

-- ─── profile_ai_summary ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_ai_summary (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                        UUID NOT NULL UNIQUE,
  summary_text                   TEXT,
  personality_json               JSONB NOT NULL DEFAULT '{}',
  values_json                    JSONB NOT NULL DEFAULT '{}',
  current_state_json             JSONB NOT NULL DEFAULT '{}',
  communication_preferences_json JSONB NOT NULL DEFAULT '{}',
  updated_from_sources_json      JSONB NOT NULL DEFAULT '[]',
  last_generated_at              TIMESTAMPTZ,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── memory_items (no vector column — added in 20260521_labs_memory_vector.sql) ──
CREATE TABLE IF NOT EXISTS memory_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'labs',
  source_id   TEXT,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  importance  INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  stability   TEXT NOT NULL DEFAULT 'stable',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_items_user        ON memory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_source_type ON memory_items(source_type);

-- ─── Seed: labs_tests ──────────────────────────────────────────────────────
INSERT INTO labs_tests (slug, title, description, category, version, source_type, estimated_minutes) VALUES
(
  'personality-core-scan',
  'Personality Core Scan',
  'Map your core personality dimensions across the Big Five framework. Understand your natural tendencies in openness, structure, social energy, harmony, and emotional depth.',
  'personality', '1.0', 'validated', 7
),
(
  'inner-compass',
  'Inner Compass',
  'Discover what truly drives you. Map your motivational landscape across ten value domains to understand the invisible forces shaping your choices and energy.',
  'values', '1.0', 'shadow', 6
),
(
  'current-state-check',
  'Current State Check',
  'A quick calibration of your current mental and physical state. Helps Shadow adapt its responses to your real capacity right now.',
  'state', '1.0', 'shadow', 3
)
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: labs_questions ──────────────────────────────────────────────────
INSERT INTO labs_questions (test_id, question_text, question_key, dimension, reverse_scored, order_index) VALUES
-- Personality Core Scan (test 1)
(1, 'I enjoy exploring new and unconventional ideas.', 'openness_1', 'openness', false, 1),
(1, 'I find abstract concepts and theoretical discussions genuinely interesting.', 'openness_2', 'openness', false, 2),
(1, 'I prefer familiar routines over new and unpredictable experiences.', 'openness_3', 'openness', true, 3),
(1, 'I keep my environment and tasks organized and on track.', 'conscientiousness_1', 'conscientiousness', false, 4),
(1, 'I follow through on commitments even when things get difficult.', 'conscientiousness_2', 'conscientiousness', false, 5),
(1, 'I tend to procrastinate or delay starting important tasks.', 'conscientiousness_3', 'conscientiousness', true, 6),
(1, 'I feel energized and recharged after spending time with other people.', 'extraversion_1', 'extraversion', false, 7),
(1, 'I enjoy being in social situations and meeting new people.', 'extraversion_2', 'extraversion', false, 8),
(1, 'I prefer quiet time alone over busy social environments.', 'extraversion_3', 'extraversion', true, 9),
(1, 'I genuinely enjoy helping others, even at a personal cost.', 'agreeableness_1', 'agreeableness', false, 10),
(1, 'I find it natural to see situations from other people''s perspective.', 'agreeableness_2', 'agreeableness', false, 11),
(1, 'I sometimes prioritize winning an argument over finding common ground.', 'agreeableness_3', 'agreeableness', true, 12),
(1, 'I often feel anxious or worried about things that may go wrong.', 'neuroticism_1', 'neuroticism', false, 13),
(1, 'Stressful situations significantly affect my mood and performance.', 'neuroticism_2', 'neuroticism', false, 14),
(1, 'I recover quickly and move on after experiencing setbacks or criticism.', 'neuroticism_3', 'neuroticism', true, 15);

INSERT INTO labs_questions (test_id, question_text, question_key, dimension, reverse_scored, order_index) VALUES
-- Inner Compass (test 2)
(2, 'Making my own decisions — without needing approval from others — is deeply important to me.', 'autonomy_1', 'autonomy', false, 1),
(2, 'I feel most alive when I have the freedom to choose my own direction.', 'autonomy_2', 'autonomy', false, 2),
(2, 'I am driven by the desire to set and achieve challenging, meaningful goals.', 'achievement_1', 'achievement', false, 3),
(2, 'Succeeding at something difficult gives me a profound sense of satisfaction.', 'achievement_2', 'achievement', false, 4),
(2, 'Stability, safety, and predictability are foundational to my wellbeing.', 'security_1', 'security', false, 5),
(2, 'I feel significantly better when I have a reliable safety net in place.', 'security_2', 'security', false, 6),
(2, 'Expressing myself through creative work feels essential, not optional.', 'creativity_1', 'creativity', false, 7),
(2, 'I am drawn to solving problems in novel and unconventional ways.', 'creativity_2', 'creativity', false, 8),
(2, 'I crave variety and new experiences to feel truly engaged with life.', 'stimulation_1', 'stimulation', false, 9),
(2, 'A life without adventure, novelty, or excitement would feel flat and meaningless.', 'stimulation_2', 'stimulation', false, 10),
(2, 'Deep, genuine relationships with others are central to my sense of wellbeing.', 'connection_1', 'connection', false, 11),
(2, 'I feel most alive when I am truly and openly connecting with someone.', 'connection_2', 'connection', false, 12),
(2, 'Being of service to others — contributing to their growth or wellbeing — gives me meaning.', 'care_1', 'care', false, 13),
(2, 'I feel a strong sense of responsibility toward the people around me.', 'care_2', 'care', false, 14),
(2, 'Recognition, respect, and being seen as competent matter to me.', 'status_1', 'status', false, 15),
(2, 'How others perceive my success or achievements influences how I feel about myself.', 'status_2', 'status', false, 16),
(2, 'Enjoying life — comfort, pleasure, and having fun — is a genuine priority for me.', 'pleasure_1', 'pleasure', false, 17),
(2, 'I believe that feeling good and experiencing joy are important life goals.', 'pleasure_2', 'pleasure', false, 18),
(2, 'I need to feel that my life and work contribute to something larger and more meaningful.', 'meaning_1', 'meaning', false, 19),
(2, 'Being part of a purpose beyond personal gain is essential to how I define a good life.', 'meaning_2', 'meaning', false, 20);

INSERT INTO labs_questions (test_id, question_text, question_key, dimension, reverse_scored, order_index) VALUES
-- Current State Check (test 3)
(3, 'My physical energy level feels sufficient for what I need to do today.', 'energy_1', 'energy', false, 1),
(3, 'I feel physically drained and running on empty right now.', 'energy_2', 'energy', true, 2),
(3, 'I feel emotionally balanced and stable at this moment.', 'emotional_state_1', 'emotional_state', false, 3),
(3, 'I am carrying unresolved emotional tension or stress right now.', 'emotional_state_2', 'emotional_state', true, 4),
(3, 'I feel genuinely well-rested and recovered from recent demands.', 'recovery_1', 'recovery', false, 5),
(3, 'I have been pushing through without real rest for too long.', 'recovery_2', 'recovery', true, 6),
(3, 'My mind feels clear, focused, and able to engage with complex things.', 'cognitive_load_1', 'cognitive_load', false, 7),
(3, 'I feel overwhelmed by the number of things competing for my attention.', 'cognitive_load_2', 'cognitive_load', true, 8),
(3, 'Overall, I feel good about where I am in life right now.', 'wellbeing_1', 'wellbeing', false, 9),
(3, 'I am struggling to find motivation, joy, or a sense of forward movement today.', 'wellbeing_2', 'wellbeing', true, 10);

-- ─── Seed: labs_answer_options ─────────────────────────────────────────────
DO $$
DECLARE
  q RECORD;
BEGIN
  FOR q IN SELECT id FROM labs_questions WHERE test_id = (SELECT id FROM labs_tests WHERE slug = 'personality-core-scan') LOOP
    INSERT INTO labs_answer_options (question_id, label, value, order_index) VALUES
      (q.id, 'Strongly disagree', 1, 1),
      (q.id, 'Disagree',          2, 2),
      (q.id, 'Neutral',           3, 3),
      (q.id, 'Agree',             4, 4),
      (q.id, 'Strongly agree',    5, 5);
  END LOOP;

  FOR q IN SELECT id FROM labs_questions WHERE test_id = (SELECT id FROM labs_tests WHERE slug = 'inner-compass') LOOP
    INSERT INTO labs_answer_options (question_id, label, value, order_index) VALUES
      (q.id, 'Not at all like me', 1, 1),
      (q.id, 'Slightly like me',   2, 2),
      (q.id, 'Somewhat like me',   3, 3),
      (q.id, 'Quite like me',      4, 4),
      (q.id, 'Very much like me',  5, 5);
  END LOOP;

  FOR q IN SELECT id FROM labs_questions WHERE test_id = (SELECT id FROM labs_tests WHERE slug = 'current-state-check') LOOP
    INSERT INTO labs_answer_options (question_id, label, value, order_index) VALUES
      (q.id, 'Not at all',    1, 1),
      (q.id, 'Slightly',      2, 2),
      (q.id, 'Moderately',    3, 3),
      (q.id, 'Quite a bit',   4, 4),
      (q.id, 'Completely',    5, 5);
  END LOOP;
END;
$$;
