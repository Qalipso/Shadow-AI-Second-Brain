-- ============================================================
-- PENDING MIGRATIONS: 20260520 → 20260525
-- Idempotent. Run in Supabase SQL Editor in one shot.
-- ============================================================

-- ─── 20260520_labs.sql ───────────────────────────────────────────────────
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

-- ─── 20260521_labs_memory_vector.sql ───────────────────────────────────────────────────
-- Labs: memory_items vector enhancement.
-- REQUIRES: pgvector extension enabled in Supabase (Database → Extensions → vector).
-- Run AFTER 20260520_labs.sql.

ALTER TABLE memory_items
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_memory_items_embedding
  ON memory_items USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

CREATE OR REPLACE FUNCTION match_memory_items(
  query_embedding vector(1536),
  match_user_id   UUID,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  content     TEXT,
  source_type TEXT,
  importance  INTEGER,
  stability   TEXT,
  tags        TEXT[],
  created_at  TIMESTAMPTZ,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id, mi.title, mi.content, mi.source_type,
    mi.importance, mi.stability, mi.tags, mi.created_at,
    1 - (mi.embedding <=> query_embedding) AS similarity
  FROM memory_items mi
  WHERE mi.user_id = match_user_id
    AND mi.embedding IS NOT NULL
  ORDER BY mi.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── 20260522_intelligence_loop.sql ───────────────────────────────────────────────────
-- Shadow Intelligence Loop v1 — Sprint 2 Tables
-- PBI-07: memory_items type system extensions
-- PBI-09: memory_graph_nodes, memory_graph_edges
-- PBI-10: knowledge_gaps
-- PBI-11: ai_questions, ai_question_answers
-- PBI-12: daily_checkins
-- PBI-19: shadow_initiatives
-- PBI-27: Full DB for intelligence loop

-- ─── memory_items: add type system columns (PBI-07) ─────────────────────────
ALTER TABLE memory_items
  ADD COLUMN IF NOT EXISTS memory_type    TEXT NOT NULL DEFAULT 'insight'
    CHECK (memory_type IN ('profile','episodic','behavioral','goal','current_state','preference','insight','relationship')),
  ADD COLUMN IF NOT EXISTS source_object_id TEXT,
  ADD COLUMN IF NOT EXISTS confidence       NUMERIC(3,2) DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_memory_items_type ON memory_items(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_items_user_type ON memory_items(user_id, memory_type);

-- ─── memory_graph_nodes (PBI-09) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_graph_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  node_type   TEXT NOT NULL
    CHECK (node_type IN ('user_profile','value','goal','project','habit','emotion','event','pattern','risk','preference','person','place','decision','insight','current_state')),
  label       TEXT NOT NULL,
  description TEXT,
  data_json   JSONB NOT NULL DEFAULT '{}',
  importance  INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  source_type TEXT,
  source_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_user      ON memory_graph_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type      ON memory_graph_nodes(user_id, node_type);

-- ─── memory_graph_edges (PBI-09) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_graph_edges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  from_node_id UUID NOT NULL REFERENCES memory_graph_nodes(id) ON DELETE CASCADE,
  to_node_id   UUID NOT NULL REFERENCES memory_graph_nodes(id) ON DELETE CASCADE,
  edge_type    TEXT NOT NULL
    CHECK (edge_type IN ('supports','blocks','triggers','repeats_in','belongs_to','contradicts','strengthens','weakens','causes','related_to')),
  weight       NUMERIC(3,2) NOT NULL DEFAULT 0.70 CHECK (weight BETWEEN 0 AND 1),
  data_json    JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_user     ON memory_graph_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_from     ON memory_graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_to       ON memory_graph_edges(to_node_id);

-- ─── knowledge_gaps (PBI-10) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  reason       TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'ai_brain',
  area         TEXT,
  priority     INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status       TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','questioning','answered','dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user   ON knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON knowledge_gaps(user_id, status);

-- ─── ai_questions (PBI-11) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  gap_id          UUID REFERENCES knowledge_gaps(id) ON DELETE SET NULL,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'identity'
    CHECK (question_type IN ('identity','motivation','friction','pattern','context','reflection','goal','habit','emotional_state')),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','shown','answered','skipped','snoozed','dismissed')),
  shown_at        TIMESTAMPTZ,
  snoozed_until   TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_questions_user   ON ai_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_questions_status ON ai_questions(user_id, status);

-- ─── ai_question_answers (PBI-11) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_question_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  question_id     UUID NOT NULL REFERENCES ai_questions(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  memory_item_id  UUID REFERENCES memory_items(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_qa_user     ON ai_question_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_qa_question ON ai_question_answers(question_id);

-- ─── daily_checkins (PBI-12 through PBI-18) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_checkins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Current State (PBI-13) — energy/focus/body_state: 0-5; mood: -5 to +5
  energy           INTEGER CHECK (energy BETWEEN 0 AND 5),
  mood             INTEGER CHECK (mood BETWEEN -5 AND 5),
  mental_noise     INTEGER CHECK (mental_noise BETWEEN 0 AND 5),
  body_state       INTEGER CHECK (body_state BETWEEN 0 AND 5),
  focus            INTEGER CHECK (focus BETWEEN 0 AND 5),

  -- Inbox Dump (PBI-14)
  inbox_dump       TEXT,

  -- Today Focus (PBI-15)
  today_focus      TEXT,
  today_focus_custom TEXT,

  -- Habits / Souls link (PBI-16)
  habit_id_today   UUID REFERENCES habits(id) ON DELETE SET NULL,

  -- Goals link (PBI-17)
  linked_goal_id   UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- Insight (PBI-18)
  insight_text     TEXT,

  -- AI Question answered during check-in
  ai_question_id   UUID REFERENCES ai_questions(id) ON DELETE SET NULL,
  ai_question_answer TEXT,

  -- AI Brain output (PBI-25)
  today_initiative_text TEXT,
  today_initiative_json JSONB,
  ai_processed     BOOLEAN NOT NULL DEFAULT false,
  ai_processed_at  TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins(user_id, date DESC);

-- ─── shadow_initiatives (PBI-19) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shadow_initiatives (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  title            TEXT NOT NULL,
  reason           TEXT NOT NULL,
  suggested_action TEXT,
  initiative_type  TEXT NOT NULL DEFAULT 'observation'
    CHECK (initiative_type IN ('observation','question','pattern','recovery','goal','habit','memory_gap','productive_nudge','reflection_prompt')),
  linked_area      TEXT,
  source_signals   JSONB NOT NULL DEFAULT '[]',
  priority         INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  pattern_duration TEXT
    CHECK (pattern_duration IN ('micro','short','medium','long','core') OR pattern_duration IS NULL),
  status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','accepted','done','snoozed','dismissed','expired')),
  expires_at       TIMESTAMPTZ,
  snoozed_until    TIMESTAMPTZ,
  source_checkin_id UUID REFERENCES daily_checkins(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiatives_user   ON shadow_initiatives(user_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON shadow_initiatives(user_id, status);

-- ─── RLS policies ────────────────────────────────────────────────────────────
ALTER TABLE memory_graph_nodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_graph_edges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_initiatives  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_graph_nodes"  ON memory_graph_nodes  USING (user_id = auth.uid());
CREATE POLICY "users_own_graph_edges"  ON memory_graph_edges  USING (user_id = auth.uid());
CREATE POLICY "users_own_knowledge_gaps" ON knowledge_gaps    USING (user_id = auth.uid());
CREATE POLICY "users_own_ai_questions"  ON ai_questions       USING (user_id = auth.uid());
CREATE POLICY "users_own_ai_qa"         ON ai_question_answers USING (user_id = auth.uid());
CREATE POLICY "users_own_checkins"      ON daily_checkins     USING (user_id = auth.uid());
CREATE POLICY "users_own_initiatives"   ON shadow_initiatives USING (user_id = auth.uid());

-- ─── 20260522_labs_rls.sql ───────────────────────────────────────────────────
-- Labs RLS policies.
-- Static/public tables: allow SELECT for all.
-- User tables: restrict to owner (auth.uid() = user_id).

-- ─── labs_tests (public read-only) ────────────────────────────────────────
ALTER TABLE labs_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "labs_tests_select" ON labs_tests;
CREATE POLICY "labs_tests_select" ON labs_tests
  FOR SELECT USING (true);

-- ─── labs_questions (public read-only) ────────────────────────────────────
ALTER TABLE labs_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "labs_questions_select" ON labs_questions;
CREATE POLICY "labs_questions_select" ON labs_questions
  FOR SELECT USING (true);

-- ─── labs_answer_options (public read-only) ───────────────────────────────
ALTER TABLE labs_answer_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "labs_answer_options_select" ON labs_answer_options;
CREATE POLICY "labs_answer_options_select" ON labs_answer_options
  FOR SELECT USING (true);

-- ─── labs_sessions (user-scoped) ──────────────────────────────────────────
ALTER TABLE labs_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "labs_sessions_owner" ON labs_sessions;
CREATE POLICY "labs_sessions_owner" ON labs_sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── labs_answers (user-scoped) ───────────────────────────────────────────
ALTER TABLE labs_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "labs_answers_owner" ON labs_answers;
CREATE POLICY "labs_answers_owner" ON labs_answers
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── labs_results (user-scoped) ───────────────────────────────────────────
ALTER TABLE labs_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "labs_results_owner" ON labs_results;
CREATE POLICY "labs_results_owner" ON labs_results
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── profile_ai_summary (user-scoped) ─────────────────────────────────────
ALTER TABLE profile_ai_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_ai_summary_owner" ON profile_ai_summary;
CREATE POLICY "profile_ai_summary_owner" ON profile_ai_summary
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── memory_items (user-scoped) ───────────────────────────────────────────
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "memory_items_owner" ON memory_items;
CREATE POLICY "memory_items_owner" ON memory_items
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 20260523_checkin_multi_per_day.sql ───────────────────────────────────────────────────
-- Allow multiple check-ins per day (remove unique constraint on user_id+date).
-- Each check-in is a separate snapshot, ordered by created_at within the day.
ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_user_id_date_key;

-- ─── 20260523_labs_dedup.sql ───────────────────────────────────────────────────
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

-- ─── 20260524_ai_qa_checkin_fk.sql ───────────────────────────────────────────────────
-- Add checkin_id FK to ai_question_answers (referenced in POST /api/checkin)
ALTER TABLE ai_question_answers
  ADD COLUMN IF NOT EXISTS checkin_id UUID REFERENCES daily_checkins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_qa_checkin ON ai_question_answers(checkin_id);

-- ─── 20260524_labs_fix_normalized_value.sql ───────────────────────────────────────────────────
-- Fix: normalized_value was NUMERIC(4,2) which overflows at 100.00.
-- normalizeValue() maps raw=5,reverse=false → 100.00 which has 5 digits total.
-- Change to NUMERIC(5,2) to allow values 0.00–100.00.

ALTER TABLE labs_answers
  ALTER COLUMN normalized_value TYPE NUMERIC(5,2);

-- ─── 20260525_life_area_scores_rationale.sql ───────────────────────────────────────────────────
-- Add rationale and data_volume columns to life_area_scores
-- These are populated by /api/score-areas and used in the Areas UI.

ALTER TABLE life_area_scores
  ADD COLUMN IF NOT EXISTS rationale    TEXT,
  ADD COLUMN IF NOT EXISTS data_volume  INTEGER;
