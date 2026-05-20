# Session 002 — Database, RLS, Page Wiring

**Date:** 2026-05-11
**Phase:** Phase 2 — Database
**Status:** ✅ Complete

---

## Goal
Author Supabase migrations (schema + RLS + seeds), add auth proxy, wire `/dashboard` `/areas` `/questions` to real DB with graceful fallbacks when env empty. Build green.

---

## Files created

### Migrations
- `supabase/config.toml` — Supabase project stub
- `supabase/migrations/20260511000001_init_schema.sql` — full schema; extends questions with `time_of_day` + `emotional_depth`; adds `ai_processing_logs`; adds `handle_new_user` trigger
- `supabase/migrations/20260511000002_rls_policies.sql` — RLS for all 17 tables
- `supabase/migrations/20260511000003_seed_life_areas.sql` — 12 areas
- `supabase/migrations/20260511000004_seed_question_bank.sql` — 20 questions w/ depth + time_of_day

### Web
- `web/src/proxy.ts` — auth proxy (Next 16 renamed `middleware` → `proxy`). Env-gated: allows access in dev when Supabase env missing
- `web/src/lib/data.ts` — `getLifeAreas`, `getActiveQuestions`, `pickDailyQuestions` (weighted random)
- `web/src/types/db.ts` — `LifeArea`, `Question` TS types

### Docs
- `db/README.md` — points to `supabase/migrations/` as source of truth

---

## Files modified

| File | Change |
|------|--------|
| `web/src/app/(app)/dashboard/page.tsx` | async server component; fetches areas + 5 weighted-random questions; Life Circle renders 12 cards |
| `web/src/app/(app)/areas/page.tsx` | fetches from DB; shows name + description + slug + order_index |
| `web/src/app/(app)/questions/page.tsx` | groups active questions by category; shows type/time/depth/weight |
| `web/.env.local.example` | grouped + commented (Supabase / Anthropic / OpenAI) |
| `web/next.config.ts` | `turbopack.root = path.resolve(__dirname)` → silences multi-lockfile warning |
| `db/schema/shadow.sql` | mirror of `20260511000001_init_schema.sql` |
| `db/seeds/question_bank.sql` | mirror of `20260511000004_seed_question_bank.sql` |

---

## DB schema (final)

17 tables:
- **reference** (read-all auth): `life_areas`, `questions`
- **owner-bound** (`user_id = auth.uid()`): `profiles`, `entries`, `tasks`, `goals`, `question_answers`, `life_area_scores`, `expenses`, `food_logs`, `emotion_logs`, `metric_logs`, `insights`, `reports`, `memory_embeddings`, `ai_processing_logs` (select-only for user)
- **derived ownership** (via `entries.user_id`): `entry_classifications`

Extensions: `pgcrypto`, `vector`.
Trigger: `on_auth_user_created` → auto-insert into `profiles`.
Indexes: per-user + time-desc on entries/tasks/answers/reports/ai_logs; `ivfflat` on `memory_embeddings.embedding`.

---

## RLS policy summary

| Table | Read | Write |
|-------|------|-------|
| `profiles` | own (`id = auth.uid()`) | own update |
| `life_areas` | any authenticated | — |
| `questions` | any authenticated, `is_active = true` | — |
| `entries` | own | own |
| `entry_classifications` | via `entries.user_id` | via `entries.user_id` |
| `tasks`, `goals`, `question_answers`, `life_area_scores`, `expenses`, `food_logs`, `emotion_logs`, `metric_logs`, `insights`, `reports`, `memory_embeddings` | own | own |
| `ai_processing_logs` | own | service role only |

`auth.role() = 'authenticated'` gates reference reads.

---

## Auth flow

1. User hits `/dashboard` (or any `/inbox /questions /areas /reports /goals /tasks /memory /settings`)
2. `proxy.ts` reads Supabase session via SSR cookies
3. No session → redirect `/login`
4. Session present → request continues
5. **Env missing → proxy short-circuits, allows access** (dev mode preserved while keys absent)

---

## Routes verified (build output)

```
○ /                  static landing
○ /_not-found        static
ƒ /areas             dynamic — fetches life_areas
ƒ /auth/callback     dynamic — OAuth code exchange
ƒ /dashboard         dynamic — fetches areas + daily questions
○ /goals             static placeholder
○ /inbox             static placeholder (Phase 3 wires)
○ /login             static — magic-link form
○ /memory            static placeholder
ƒ /questions         dynamic — fetches active questions
○ /reports           static placeholder
○ /settings          static placeholder
○ /tasks             static placeholder
ƒ Proxy (Middleware) loaded
```

Build: `Compiled successfully in 2.8s`. No warnings (lockfile fixed; `middleware` → `proxy` rename).

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | clean |
| `npx next build` | success, 12 routes generated, no warnings |
| Preview server :3007 | starts cleanly, env-empty fallback paths render |

---

## Decisions

| Topic | Decision | Reason |
|-------|----------|--------|
| Migrations location | `shadow/supabase/migrations/` | Project-wide, not web-specific |
| `db/` role | Mirror docs | Source of truth = `supabase/migrations/` |
| Auth proxy name | `proxy.ts` | Next 16 deprecates `middleware` convention |
| Env-empty behavior | Proxy allows access; data layer returns `[]` | Dev mode without Supabase keys still renders |
| Daily question selection | Server-side weighted shuffle by `frequency_weight` | Avoids Postgres `random()` RPC; deterministic enough |
| `pickDailyQuestions` location | `lib/data.ts` | Reusable across dashboard + future contextual selector |
| `questions` schema additions | `time_of_day`, `emotional_depth` | Required by Phase 2 task #9; matches `02-daily-questions.md` prompt inputs |
| `ai_processing_logs` table | New, owner-bound, select-only for user | Cost tracking + debug; writes via service role |

---

## Blockers / known issues

1. **Supabase project not yet created.** Real keys needed in `web/.env.local` before any DB row appears. Apply migrations via Supabase CLI (`supabase db push`) or paste into SQL editor in order.
2. **`auth.callback` not yet tested end-to-end** — requires real Supabase project.
3. **`profiles` row** auto-created on first `auth.users` insert via trigger — works only once migrations applied.
4. **Lint passes silently** — `npm run lint` output empty in CI capture; verified via Next build's bundled type-check.

---

## Next phase entry — Phase 3: AI Inbox

Tasks:
1. Add `web/src/lib/zod-schemas.ts` — validate classifier JSON output
2. Implement `POST /api/entries` (server route):
   - insert raw `entries` row
   - SHA-256 of raw_text → `ai_processing_logs.input_hash` for cache
   - call Claude Haiku with `ai/prompts/01-classification.md`
   - validate JSON via Zod; retry once on parse fail
   - insert `entry_classifications`
   - fan-out: `tasks`, `expenses`, `food_logs`, `emotion_logs`, `metric_logs`
   - mark `entries.processed_status = 'classified'`
3. Inbox UI: textarea form, optimistic submit, classification card with corrections, recent entries list (last 20)
4. PII strip helper (`web/src/lib/pii.ts`) — email/phone/token regex before LLM call
5. Update `/inbox/page.tsx` to wired form + history

Exit criteria: free text → classified entry → structured rows visible in Supabase + UI shows classification card with primary_type, life_areas, extracted entities.

---

## Snapshot

```
shadow/
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260511000001_init_schema.sql
│       ├── 20260511000002_rls_policies.sql
│       ├── 20260511000003_seed_life_areas.sql
│       └── 20260511000004_seed_question_bank.sql
├── web/
│   ├── next.config.ts          (turbopack.root)
│   ├── .env.local.example      (grouped)
│   └── src/
│       ├── proxy.ts            (Next 16 auth gate)
│       ├── lib/data.ts         (areas + questions fetchers)
│       ├── types/db.ts         (LifeArea, Question)
│       └── app/(app)/
│           ├── dashboard/page.tsx  (wired)
│           ├── areas/page.tsx      (wired)
│           └── questions/page.tsx  (wired)
└── reports/
    └── 002-database-rls-wiring/REPORT.md   ← this file
```

End session 002.
