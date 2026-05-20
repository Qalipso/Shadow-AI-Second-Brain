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
