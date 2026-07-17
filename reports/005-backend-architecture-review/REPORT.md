# Session 005 — Backend Architecture Review

**Date:** 2026-07-12
**Phase:** Audit (read-only) — precedes any further write-back/governance work
**Status:** Review complete, no code changed
**Method:** 4 parallel read-only agents (data model/RLS, AI core, API surface, frontend/testing) over the repo at `798863c`, cross-checked against `ARCHITECTURE.md` / `FLOWS/` / `DECISIONS/`, plus locally executed `typecheck` / `test` / `lint` for real build-health evidence.

---

## Goal

Independent architecture review of the backend: data model + RLS, the AI/RAG core (cost ledger, rate limiting, model routing), the 75-route API surface, and whether `ARCHITECTURE.md` still describes the shipped system. Every finding below is tied to a `file:line` and was checked against the actual code, not assumed from the docs.

---

## Verdict

Solid, thoughtfully-designed solo engineering — auth is near-total, RLS is real on every user table, the server-only boundary holds, and `match_entries` is safe. But three things are weaker than documented: the cost/abuse controls (cap + rate limit) have real holes, the migration/erasure story isn't production-safe, and `ARCHITECTURE.md` has drifted into claiming features (streaming, Three.js, 80% coverage) that don't exist in code. Nothing here is unsalvageable — the Critical items are small, mechanical fixes.

---

## Real build-health evidence (executed this session, `web/`)

| Check | Result |
|---|---|
| `npm install` | 431 packages installed clean. `npm audit`: 9 vulnerabilities (1 critical, 1 high) — both in **devDependencies only** (`vitest` UI arbitrary-file-read, `vite` path traversal). Not a production runtime risk, but worth a `npm audit fix` pass. |
| `npm run typecheck` (`tsc --noEmit`) | **PASS — 0 errors.** |
| `npm run test` (vitest) | **PASS — 24/24 tests, 3 files** (`rate-limit.test.ts`, `classification.test.ts`, `sonic-profile.test.ts`). Confirms the review finding below: only 3 of 55 `src/lib/` modules have unit coverage. |
| `npm run lint` (eslint 9) | **FAILS to even run** — no `eslint.config.js` exists anywhere in the repo (confirmed via `find`, not gitignored, just absent). `CONTRIBUTING.md` states "All checks must pass (typecheck, lint, tests, build)" before merge — lint currently can't produce a result at all. |
| `npm run build` (`next build`) | Not attempted — requires Supabase/OpenAI runtime secrets not available in this review environment. |

---

## Findings, ranked

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| 1 | Critical | **Plaintext OAuth tokens** on dead-but-still-deployed legacy music routes; the live path encrypts, the legacy one doesn't. | `src/app/api/music/callback/route.ts:56-58`, `music/sync/route.ts:47` vs `music/spotify/callback/route.ts:83-90` |
| 2 | Critical | **Right-to-erasure gap.** `account/delete` clears 5 of 47 tables and never deletes `auth.users`; 13 Sprint-2 tables (psych-test answers, AI-generated personality summaries, memory graph) have **no FK on `user_id`**, so they can't cascade even once real deletion ships. | `src/app/api/account/delete/route.ts:29-39`; `supabase/migrations/20260520_labs.sql:46`, `20260522_intelligence_loop.sql` |
| 3 | Critical | **Daily cost cap doesn't cap.** `isOverDailyCap()` is a check-then-act `SELECT sum()` with no lock — concurrent requests all pass. `POST /api/embed` has **no cap and no rate limit at all**, a paid OpenAI endpoint fully unbounded. | `src/lib/cost-ledger.ts:37-40`; `src/app/api/embed/route.ts` (whole file) |
| 4 | High | **Rate limiter is illusory on serverless** — module-level in-memory `Map`, resets every cold start, not shared across instances; also unapplied to most LLM routes (`score-areas`, `reports/*`, `memory/ask`, `embed`). | `src/lib/rate-limit.ts:16-18` |
| 5 | High | **Migration history is not trustworthy.** `20260522_labs_rls.sql` and `20260603_labs_rls.sql` both create RLS for the same 8 tables, six weeks apart. 1,432 lines across `pending_migrations{,_2,_3}.sql` are verbatim duplicates of already-numbered migrations, bundled for manual paste into the Supabase SQL Editor. | `supabase/migrations/20260522_labs_rls.sql` ≈ `20260603_labs_rls.sql`; `supabase/pending_migrations*.sql` |
| 6 | High | **RLS sequencing window.** `20260520_labs.sql` creates 8 tables (incl. raw psych-test answers) with zero RLS statements; RLS is added two migrations later. If applied sequentially against a live DB, those tables were open to any authenticated caller in between — violates the project's own house rule (`DECISIONS/007-rls-everywhere.md:12`). *(Live exposure unverified — needs Supabase migration-apply timestamps to confirm.)* | `supabase/migrations/20260520_labs.sql` (no RLS statements in file) |
| 7 | High | **DB error messages leaked to clients.** Raw Supabase `error.message` returned verbatim in dozens of routes, exposing schema/constraint internals to any authenticated caller. | `src/app/api/entries/route.ts:96`, `goals/route.ts:69`, `tasks/route.ts:60` |
| 8 | Medium | **`ARCHITECTURE.md` is systematically stale.** Streaming chat/reports (claimed, refuted by two independent reads), "Three.js scene components" (no such dependency exists), "80% lib / 60% component coverage" (no coverage tool installed; 3/55 lib modules tested), rate limiter mislabeled "per-IP token bucket" (it's per-user fixed-window). | `src/app/api/shadow/chat/route.ts:119` (no `stream:true`); `package.json` deps; `vitest.config.ts` |
| 9 | Medium | **Three unlinked "memory" subsystems live simultaneously** — RAG over `entries.embedding`, flat CRUD on `memory_items`, and a typed graph (`memory_graph_*`) — with no shared contract between them. | `src/app/api/memory/{ask,items}`, `api/brain/synthesize` |
| 10 | Medium | **RAG has no similarity threshold** (always returns k-nearest, even when irrelevant) and **no instruction/data separation** — retrieved user text is spliced unescaped into the *system* prompt, a self-prompt-injection design gap. | `supabase/migrations/20260512120007_match_entries_rpc.sql`; `src/lib/rag.ts:51-61` → `src/ai/prompts/shadow-chat.ts:38` |
| 11 | Medium | **`db/README.md` + `db/schema/shadow.sql` describe a schema that was never migrated** — references migration filenames and tables (`expenses`, `food_logs`, …) that don't exist anywhere in `supabase/migrations/`, while self-labeled "Authoritative version." Active onboarding hazard. | `db/README.md:5-9`, `db/schema/shadow.sql:1-2` |
| 12 | Medium | **`/api/admin/*` routes have no actual privilege tier** — gated by the same per-user `auth.getUser()` as every other route. The `admin/` prefix will mislead the next engineer into assuming elevated auth is already enforced. | `src/app/api/admin/{reembed,rpc-test}/route.ts` |
| 13 | Low | **`npm run lint` cannot run** — no `eslint.config.js` in the repo despite ESLint 9 + `eslint-config-next` as a devDependency and a `lint` script; contradicts `CONTRIBUTING.md`'s "all checks must pass" gate. *(Found via direct execution this session.)* | confirmed via `find` + `npm run lint` output |
| 14 | Low | Missing FK integrity on the same 13 tables as #2 (independent of cascade); no shared error/response helper (72 hand-rolled try/catch blocks); `isDeepQuery()` is a substring heuristic that misfires both ways; no OpenAI timeout/retry/fallback (SDK defaults only). | `src/lib/rate-limit.ts:31` (dead `embed` config); `src/ai/prompts/shadow-chat.ts:61-81`; `src/lib/llm.ts:13-21` |

---

## What's genuinely good (verified, not assumed)

- **Server-only boundary holds.** `rag.ts`, `llm.ts`, `cost-ledger.ts`, `embeddings.ts`, `memory/context.ts` all `import "server-only"` (line 1); `OPENAI_API_KEY` + `new OpenAI()` exist only in `llm.ts:10,19`. No client-bundle secret leak found.
- **Auth is near-total & defense-in-depth.** 71/72 routes call `auth.getUser()` → 401 before any query (the one exception, `auth/signout`, is correctly exempt). Routes both filter `.eq("user_id")` *and* rely on RLS.
- **RLS is real on every user-owned table** — all 47 tables inventoried; the 5 `USING(true)` tables are deliberate reference data (`DECISIONS/007`).
- **`match_entries` pgvector RPC is safe** — no `SECURITY DEFINER`, runs under invoker RLS, filters on the verified session's own `user.id`.
- **Real input validation** (zod `safeParse` on every body-bearing route), **consistent HTTP status semantics**, **clean type hygiene** (`strict: true`, 0 `as any`, 0 `@ts-ignore`, verified via typecheck above), and an unusually complete ADR/FLOWS documentation set for a solo project.

---

## Fix-first

Land before any further write-back/governance work, since every DB change inherits their blast radius:
1. **#2 + #14** — add `REFERENCES auth.users(id) ON DELETE CASCADE` to the 13 unlinked tables, extend `account/delete` to cover all user-scoped tables.
2. **#5** — prune `pending_migrations*.sql` / `_combined.sql` / duplicate `20260603_labs_rls.sql` after confirming applied state against the live Supabase project.
3. **#1** — delete the legacy plaintext-token music routes (UI is already dead) or route them through `lib/music/crypto.ts`.
4. **#3** — replace the `SELECT sum()` check with an atomic `UPDATE … RETURNING` counter; add the same cap/rate-limit guard to `/api/embed`.
5. **#13** — add `eslint.config.js` so `npm run lint` produces a result at all.

## Blockers / not verified

- Whether the RLS sequencing window (#6) or the cost-cap race (#3) were ever hit on the live, populated database — needs Supabase migration-apply timestamps and access logs, not available from the repo alone.
- `next build` — not run (missing runtime secrets in this environment).
- Playwright E2E — not run (would need a live dev server + browser install; out of scope for a static review).

## Next-session entry point

If picking this up for remediation: start with `reports/005-backend-architecture-review/REPORT.md` findings #1–#7 (Critical/High) as the working list. Corresponding GitHub issues are filed and linked from the PR that introduces this report.
