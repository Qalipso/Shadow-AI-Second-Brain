-- Add FK cascade on user_id for 13 tables missing it (issue #3).
--
-- account/delete/route.ts deletes only 5 of 47 user-scoped tables and does
-- not yet delete the auth.users row itself ("Auth record remains until
-- admin deletion is wired" — route.ts:39), so nothing currently triggers
-- these constraints in production. This migration only adds the safety net
-- for when real account deletion ships; it does NOT wire that deletion
-- logic itself — that stays a separate, later decision, not bundled here.
--
-- These 13 tables hold personality-test answers, AI-generated psychological
-- summaries, and the user's memory graph:
-- labs_sessions, labs_answers, labs_results, profile_ai_summary,
-- memory_items, memory_graph_nodes, memory_graph_edges, knowledge_gaps,
-- ai_questions, ai_question_answers, daily_checkins, shadow_initiatives,
-- interventions.
--
-- Added NOT VALID: this checks NO existing rows at ADD-CONSTRAINT time (an
-- instant, non-blocking metadata change) and starts enforcing the
-- constraint for all NEW writes immediately. Historical data is NOT
-- verified as orphan-free by this migration — that cannot be done without
-- live database access, which this session does not have. Run
-- VALIDATE CONSTRAINT (commented block at the bottom) once you've confirmed
-- against the real database, or drop+recreate as a normal (validating)
-- constraint if you already know the data is clean.

ALTER TABLE labs_sessions
  ADD CONSTRAINT labs_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE labs_answers
  ADD CONSTRAINT labs_answers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE labs_results
  ADD CONSTRAINT labs_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE profile_ai_summary
  ADD CONSTRAINT profile_ai_summary_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE memory_items
  ADD CONSTRAINT memory_items_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE memory_graph_nodes
  ADD CONSTRAINT memory_graph_nodes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE memory_graph_edges
  ADD CONSTRAINT memory_graph_edges_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE knowledge_gaps
  ADD CONSTRAINT knowledge_gaps_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ai_questions
  ADD CONSTRAINT ai_questions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ai_question_answers
  ADD CONSTRAINT ai_question_answers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE daily_checkins
  ADD CONSTRAINT daily_checkins_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE shadow_initiatives
  ADD CONSTRAINT shadow_initiatives_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE interventions
  ADD CONSTRAINT interventions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

-- Run after confirming no orphaned user_id values exist on the live DB
-- (e.g. `SELECT user_id FROM <table> WHERE user_id NOT IN (SELECT id FROM auth.users)`
-- for each table above returns zero rows):
--
-- ALTER TABLE labs_sessions          VALIDATE CONSTRAINT labs_sessions_user_id_fkey;
-- ALTER TABLE labs_answers           VALIDATE CONSTRAINT labs_answers_user_id_fkey;
-- ALTER TABLE labs_results           VALIDATE CONSTRAINT labs_results_user_id_fkey;
-- ALTER TABLE profile_ai_summary     VALIDATE CONSTRAINT profile_ai_summary_user_id_fkey;
-- ALTER TABLE memory_items           VALIDATE CONSTRAINT memory_items_user_id_fkey;
-- ALTER TABLE memory_graph_nodes     VALIDATE CONSTRAINT memory_graph_nodes_user_id_fkey;
-- ALTER TABLE memory_graph_edges     VALIDATE CONSTRAINT memory_graph_edges_user_id_fkey;
-- ALTER TABLE knowledge_gaps         VALIDATE CONSTRAINT knowledge_gaps_user_id_fkey;
-- ALTER TABLE ai_questions           VALIDATE CONSTRAINT ai_questions_user_id_fkey;
-- ALTER TABLE ai_question_answers    VALIDATE CONSTRAINT ai_question_answers_user_id_fkey;
-- ALTER TABLE daily_checkins         VALIDATE CONSTRAINT daily_checkins_user_id_fkey;
-- ALTER TABLE shadow_initiatives     VALIDATE CONSTRAINT shadow_initiatives_user_id_fkey;
-- ALTER TABLE interventions          VALIDATE CONSTRAINT interventions_user_id_fkey;
