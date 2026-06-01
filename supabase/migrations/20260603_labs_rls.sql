-- RLS for labs and memory tables created in 20260520_labs.sql
-- Reference tables (global read, service-role write)
-- Personal tables (full CRUD per user)

-- ── Reference tables: authenticated read-only ─────────────────────────────
ALTER TABLE public.labs_tests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs_answer_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS labs_tests_read          ON public.labs_tests;
DROP POLICY IF EXISTS labs_questions_read      ON public.labs_questions;
DROP POLICY IF EXISTS labs_answer_options_read ON public.labs_answer_options;

CREATE POLICY labs_tests_read
  ON public.labs_tests FOR SELECT TO authenticated USING (true);

CREATE POLICY labs_questions_read
  ON public.labs_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY labs_answer_options_read
  ON public.labs_answer_options FOR SELECT TO authenticated USING (true);

-- ── Personal tables: user owns their rows ────────────────────────────────
ALTER TABLE public.labs_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs_answers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_ai_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_items      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS labs_sessions_select ON public.labs_sessions;
DROP POLICY IF EXISTS labs_sessions_insert ON public.labs_sessions;
DROP POLICY IF EXISTS labs_sessions_update ON public.labs_sessions;
DROP POLICY IF EXISTS labs_sessions_delete ON public.labs_sessions;

CREATE POLICY labs_sessions_select ON public.labs_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY labs_sessions_insert ON public.labs_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY labs_sessions_update ON public.labs_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY labs_sessions_delete ON public.labs_sessions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS labs_answers_select ON public.labs_answers;
DROP POLICY IF EXISTS labs_answers_insert ON public.labs_answers;
DROP POLICY IF EXISTS labs_answers_delete ON public.labs_answers;

CREATE POLICY labs_answers_select ON public.labs_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.labs_sessions s
      WHERE s.id = labs_answers.session_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY labs_answers_insert ON public.labs_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.labs_sessions s
      WHERE s.id = labs_answers.session_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY labs_answers_delete ON public.labs_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.labs_sessions s
      WHERE s.id = labs_answers.session_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS labs_results_select ON public.labs_results;
DROP POLICY IF EXISTS labs_results_insert ON public.labs_results;
DROP POLICY IF EXISTS labs_results_update ON public.labs_results;

CREATE POLICY labs_results_select ON public.labs_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY labs_results_insert ON public.labs_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY labs_results_update ON public.labs_results
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS profile_ai_summary_select ON public.profile_ai_summary;
DROP POLICY IF EXISTS profile_ai_summary_insert ON public.profile_ai_summary;
DROP POLICY IF EXISTS profile_ai_summary_update ON public.profile_ai_summary;

CREATE POLICY profile_ai_summary_select ON public.profile_ai_summary
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profile_ai_summary_insert ON public.profile_ai_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY profile_ai_summary_update ON public.profile_ai_summary
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS memory_items_select ON public.memory_items;
DROP POLICY IF EXISTS memory_items_insert ON public.memory_items;
DROP POLICY IF EXISTS memory_items_update ON public.memory_items;
DROP POLICY IF EXISTS memory_items_delete ON public.memory_items;

CREATE POLICY memory_items_select ON public.memory_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY memory_items_insert ON public.memory_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY memory_items_update ON public.memory_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY memory_items_delete ON public.memory_items
  FOR DELETE USING (auth.uid() = user_id);
