# db/

Historical schema + seed documents. **Authoritative source moved to** `supabase/migrations/`.

Migration files (apply in order):
1. `20260511000001_init_schema.sql` — extensions, profiles, life_areas, questions (with time_of_day + emotional_depth), entries, classifications, tasks, goals, question_answers, life_area_scores, expenses, food_logs, emotion_logs, metric_logs, insights, reports, memory_embeddings, ai_processing_logs
2. `20260511000002_rls_policies.sql` — RLS for all tables (reference read-all, user-owned via auth.uid())
3. `20260511000003_seed_life_areas.sql` — 12 life areas
4. `20260511000004_seed_question_bank.sql` — 20 questions

Apply via Supabase CLI:
```bash
cd shadow && supabase db push
```

Or paste into Supabase SQL editor in order.
