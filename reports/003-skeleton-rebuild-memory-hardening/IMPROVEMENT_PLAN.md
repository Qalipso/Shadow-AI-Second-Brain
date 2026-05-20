## 1.1 Product / UX Observations After Skeleton Review

### Current impression

The current Shadow interface already has the correct conceptual foundation, but the dashboard feels slightly overloaded, especially inside the `Today` area.

There are too many blocks competing for attention at the same level. This weakens the core feeling of Shadow as a calm personal operating system.

Shadow should not feel like a generic analytics admin panel. It should feel like a focused daily ritual:

1. Open Shadow.
2. Answer 5 guided questions.
3. Capture thoughts into Inbox.
4. See Life Circle state.
5. Continue with the day.

The first experience should be more intentional and less dashboard-heavy.

---

## Dashboard simplification direction

### Problem

The current dashboard has too many visible modules at once. `Today`, `Recent Entries`, stats, questions, life areas, and placeholder blocks can make the page feel visually dense.

The user should not feel that Shadow is another overloaded productivity app.

### Desired dashboard hierarchy

The Dashboard should prioritize:

1. **Daily Check-in modal / card**
   - 5 questions should be visually prominent.
   - On first open of the day/session, Shadow should show a modal or focused panel:
     “Answer 5 questions to structure today.”
   - This should become the main daily ritual.

2. **Life Circle**
   - The 12-area Life Circle is the core concept.
   - It should remain one of the main visual anchors.
   - It should show the user’s current life balance and data coverage.

3. **AI Inbox shortcut**
   - A simple input area or CTA:
     “Drop anything into Shadow.”
   - The full Inbox experience should live on the Inbox page.

4. **Today State**
   - Mood / energy / stress / cognitive load.
   - Keep it compact.

5. **Recent signals, not raw Recent Entries**
   - Replace or redesign `Recent Entries`.
   - Do not show a generic list of raw notes on the dashboard.
   - Instead show a more useful block:
     - “Recent Signals”
     - “Unprocessed Signals”
     - “Latest Captures”
     - “Today’s Patterns”
   - Each item should be summarized, tagged by life area, and visually small.
   - Full browsing belongs in Inbox / Memory, not Dashboard.

### Dashboard rule

Dashboard should answer:

- What is going on with me today?
- What does Shadow need from me?
- What area of life is active or neglected?
- What should I capture or answer next?

Dashboard should not try to show everything.

---

## Daily Questions First-Open Experience

### Product decision

When the user opens Shadow for the first time in a day or session, the app should show a focused check-in panel with 5 questions.

This can be:
- modal
- centered card
- slide-over
- dashboard hero block

For MVP, use a modal or dominant hero card.

### Requirements

The 5-question check-in should:

- be visually obvious
- feel like the start of the day/session
- be easy to complete
- allow skip
- allow replace question
- show progress: 1/5, 2/5, etc.
- save answers per user
- later feed mood, energy, stress, Life Circle and reports

### Suggested copy

Title:
“Structure today”

Subtitle:
“Answer 5 questions so Shadow can understand your current state.”

CTA:
“Start check-in”

Completion message:
“Today is now structured. Shadow will use this context across your dashboard.”

---

## Inbox Product Direction

### Core idea

Inbox should become one of the most important parts of Shadow.

It should not be just a small input field.

It should be a large capture space where the user can drop raw life information without thinking about structure.

### MVP Inbox

For the next practical version:

- large writing area
- calm dark interface
- placeholder examples
- submit button
- classification preview
- recent captures
- filters by life area and type
- saved entries per user

Example placeholder:
“Write anything: a thought, task, fear, expense, food, idea, plan, emotion, or event.”

### Future Inbox

Later Inbox should support:

- text
- photos
- screenshots
- audio messages
- voice notes
- food photos
- expense screenshots
- documents
- links
- calendar context

### Inbox metaphor

Inbox is not “notes”.
Inbox is the raw entrance into Shadow.

It is the place where life enters the system.

---

## Auth + Personal Database Direction

### Product decision

Shadow must know which user owns which data.

Because Shadow stores personal life data, every entry, answer, task, goal, report, memory and score must be user-bound.

### Near-term auth requirement

For local dogfooding, add simple authentication:

- email + password login, or
- magic link if already easier with Supabase

The important requirement is not the method itself, but that Shadow can identify the current user and save data to the correct user-owned rows.

### Data ownership rule

Every personal table must include `user_id`.

User-owned data:

- entries
- question_answers
- tasks
- goals
- reports
- insights
- memory_embeddings
- life_area_scores
- ai_processing_logs
- user_settings

Global data:

- life_areas
- question_bank

### MVP requirement

After login, the app should know:

- who the user is
- where to save entries
- where to save question answers
- which dashboard data belongs to this user
- which future memory belongs to this user

---

## Life Circle Priority

The Life Circle is the main conceptual model of Shadow.

It should remain visible and central.

The product is built around collecting information from the user’s life and distributing it across the 12 life areas.

The Life Circle is not just a chart. It is the user’s life map.

### Near-term Life Circle behavior

Before scoring is implemented:

- show all 12 areas
- show placeholders for score
- show data coverage
- show how many entries are linked to each area
- show confidence level if data exists

After scoring:

- show score 1–10
- trend vs yesterday/week
- active / neglected / overloaded state
- click into area detail

---

## Reports, Goals, and Tasks Priority

### Decision

For now, do not prioritize full Reports, Goals, and Tasks pages.

They should stay in the product structure, but the next sessions should focus on:

1. database
2. auth
3. daily questions
4. Inbox
5. capture persistence
6. classification
7. Life Circle

### Reports

Reports should wait until there is enough real user data.

Do not build report UI too early.

### Goals

Goals are important, but can remain lightweight until entries/questions/classification work.

### Tasks

Tasks should first appear as AI-extracted objects from entries.

Do not build a complex task manager yet.

---

## Settings Direction

Settings can be improved earlier because Shadow handles personal data and user preferences.

### MVP Settings ideas

Add settings sections:

1. Profile
   - name
   - email
   - timezone
   - language

2. Check-in Preferences
   - questions per day
   - preferred check-in time
   - show questions on first open
   - allow random questions
   - allow deep questions

3. Memory Settings
   - enable/disable memory
   - exclude private entries from memory
   - memory retention mode
   - delete all memories

4. Privacy
   - export data
   - delete entries
   - delete account later
   - private mode

5. AI Behavior
   - tone: analytical / soft / direct / reflective
   - report length
   - insight depth
   - confidence visibility

6. Appearance
   - dark mode
   - compact dashboard
   - expanded dashboard
   - reduce visual effects

7. Data Categories
   - enable/disable tracking:
     - money
     - food
     - emotions
     - health/body
     - relationships
     - goals
     - tasks

### Settings principle

Settings should communicate trust.

The user should feel:
“I control what Shadow remembers and how deeply it analyzes me.”

---

## Product Philosophy Addition

Shadow is a system for collecting, storing, structuring, and accessing the information a person willingly shares about their life.

It is a voluntary personal data layer.

The user gives Shadow fragments of life:

- thoughts
- emotions
- decisions
- tasks
- events
- goals
- expenses
- food
- habits
- people
- patterns
- fears
- ideas

Shadow stores and distributes this information across multiple structures:

- timeline
- Life Circle
- memory
- reports
- dashboard
- future graph/network view

The long-term product direction is to become a structured access layer for the user’s mind and life.

Shadow should help answer:

- What am I thinking about repeatedly?
- What am I avoiding?
- What part of life is overloaded?
- What part of life is neglected?
- What patterns are forming?
- What did I want last week/month?
- What should I remember?
- What is changing in me?

Shadow is not only storage.

Shadow is access to stored self-context.

---

## Feature Backlog by Horizon

### Build soon

These features should be considered for the next short-term sessions.

1. First-open daily questions modal
   - 5 questions on app open
   - progress state
   - save answers
   - skip/replace question

2. Dashboard simplification
   - reduce number of Today blocks
   - make Life Circle and Check-in primary
   - replace raw Recent Entries with Recent Signals

3. Real Supabase database
   - live life_areas
   - live questions
   - user-owned entries
   - user-owned question answers

4. Auth
   - login/password or magic link
   - user session
   - protected dashboard
   - user_id on personal data

5. Inbox v1
   - large text capture area
   - save entry
   - recent captures
   - classification preview later

6. User Settings v1
   - profile
   - check-in preferences
   - memory toggle placeholder
   - privacy/data export placeholder
   - AI tone placeholder

7. Life Circle v1
   - 12 areas from DB
   - clickable cards
   - count entries by area
   - placeholder score
   - empty states

8. Recent Signals
   - summarized recent captures
   - life area pill
   - type pill
   - confidence later

---

### Build after core loop works

These features should wait until DB + auth + Inbox + questions are stable.

1. LLM classification
   - classify raw entries
   - extract life areas
   - extract emotion/task/expense/food/goal
   - Zod validation
   - AI processing logs

2. Entry persistence after classification
   - raw entry
   - structured result
   - linked life areas
   - linked task if extracted

3. Daily state meters
   - mood
   - energy
   - stress
   - cognitive load

4. Daily report
   - based on entries + questions
   - 200–400 words
   - specific insights
   - confidence level

5. Life Circle scoring
   - daily score
   - weekly score
   - data confidence
   - active/neglected/overloaded status

6. Inbox filters
   - by type
   - by life area
   - by date
   - by unresolved / processed

7. Memory timeline
   - chronological view
   - search
   - filters
   - private toggle

---

### Future features

These are valuable but should not distract from the MVP.

1. Audio input
   - record voice note
   - transcribe
   - classify as entry

2. Photo input
   - food photos
   - object/context photos
   - image-to-entry summary

3. Screenshot parsing
   - expenses
   - conversations
   - notes
   - receipts

4. Ask Shadow
   - semantic questions over memory
   - “What was I worried about last week?”
   - “What lowered my energy recently?”

5. RAG memory
   - embeddings
   - similar entries
   - memory-aware reports
   - related past patterns

6. Graph view
   - people
   - goals
   - habits
   - emotions
   - projects
   - life areas as connected network

7. Calendar integration
   - events
   - planning
   - time blocks
   - overload detection

8. Health integration
   - steps
   - sleep
   - workouts
   - energy correlation

9. Finance integration
   - manual first
   - bank import later if safe
   - spending patterns

10. Telegram / mobile capture
   - send message to Shadow from phone
   - voice note to Shadow
   - quick capture widget

11. Predictive overload detection
   - detects too many open loops
   - warns before burnout-like overload
   - suggests simplification

12. Weekly/monthly personal map
   - how life areas changed
   - what repeated
   - what was neglected
   - what gained energy

---

## Updated Near-Term Priority

The next build priorities should be:

1. Simplify Dashboard UX.
2. Make Daily Questions visually central.
3. Connect real database.
4. Add auth/user ownership.
5. Build Inbox as a real capture space.
6. Keep Life Circle central.
7. Defer Reports, Goals, and Tasks until capture + questions + DB are stable.

The main goal is not to build many pages.

The main goal is to make Shadow feel alive when opened:

- it asks questions
- it accepts raw life input
- it stores personal data
- it shows the Life Circle
- it starts building a memory of the user

---

# Part 2 — Phase Sequence (revised after product review)

The implementation plan below replaces the earlier phase ordering. It is sequenced to honour the product directive: **make the daily ritual real before building any reporting or analytics surface**.

## Phase order at a glance

```
Phase 1.5 (DONE) — Skeleton rebuild + memory hardening
   ↓
Phase 2.1 — DB re-wire (live life_areas + question_bank)
   ↓
Phase 2.2 — Auth + user ownership (RLS, user_id on every personal row)
   ↓
Phase 2.3 — Dashboard simplification + Daily Questions modal (UX pass)
   ↓
Phase 3.1 — Inbox v1 (raw capture, persist, no LLM yet)
   ↓
Phase 3.2 — LLM classification endpoint (server-side, no UI)
   ↓
Phase 3.3 — Wire Inbox + Orb → classification + entry persistence
   ↓
Phase 3.4 — Daily questions write flow + State meters
   ↓
Phase 4.1 — Life Circle scoring + Recent Signals block
   ↓
Phase 4.2 — Daily report generator
   ↓
Phase 4.3 — RAG memory (embeddings, similar entries, memory view)
   ↓
Phase 5 — Tests, perf budget, observability
   ↓
Phase 6 — Polish, deploy, case study
```

Reports / Goals / Tasks remain `<Soon />` placeholders through **Phase 4.2**.

---

## Phase 2.1 — DB re-wire

**Goal:** `/dashboard`, `/areas`, `/questions` read from Supabase.

### Tasks
1. `npm i @supabase/ssr @supabase/supabase-js`.
2. Recreate `src/lib/supabase/{server,client}.ts`.
3. Recreate `src/types/db.ts` — `LifeArea`, `Question`, `Entry`, `QuestionAnswer`, `Task`, `Goal`, `LifeAreaScore`, `AiProcessingLog`.
4. Recreate `src/lib/data.ts` — `getLifeAreas()`, `getActiveQuestions()`, `pickDailyQuestions(questions, n, seed)` (deterministic, seed = today's local date + user_id).
5. Convert `(app)/dashboard/page.tsx`, `(app)/areas/page.tsx`, `(app)/questions/page.tsx` to async server components.
6. Drop `<Soon />` from `areas` and `questions`.
7. `web/.env.local.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Acceptance
- Dashboard renders 12 named areas from DB.
- `/questions` lists active questions grouped by category.
- Empty-env fallback still works (shows "—").
- Zod-validate at Supabase boundary. No `any`.
- `npm run build` green.

### Agents / skills
- `database-reviewer` for query review.
- `coding-standards` + `frontend-patterns`.

---

## Phase 2.2 — Auth + user ownership

**Goal:** Real users, RLS enforced, every personal row carries `user_id`.

### Tasks
1. Recreate `src/proxy.ts` (Next 16 `middleware` → `proxy`):
   - Protected prefixes: `/dashboard /inbox /questions /areas /reports /goals /tasks /memory /settings`.
   - Env-empty → pass-through (dev).
   - Env-present + no user → redirect `/login`.
2. `src/app/login/page.tsx` — magic link **and** email+password (dark-themed, branded).
3. `src/app/auth/callback/route.ts` — OAuth/magic-link exchange.
4. `handle_new_user` trigger confirms it seeds `user_settings` for new user.
5. `user_id` requirement audit on every personal table; `life_areas`, `question_bank` stay global.

### Acceptance
- Cold visit `/dashboard` without auth → `/login`.
- Magic link → callback → `/dashboard` populated, session persists.
- Manual cross-user test: user B cannot read user A's rows.

### Agents / skills
- `security-reviewer` immediate after auth lands.
- `database-reviewer` for RLS audit.

### Risks
- Cookie roundtrip semantics in Next 16 `proxy` vs old `middleware` — test with hard reload + cross-tab.

---

## Phase 2.3 — Dashboard simplification + Daily Questions modal

**Goal:** Replace the current dense dashboard with the **focused daily ritual** described in Part 1. Pure UX. No new backend.

### Tasks

#### A. Restructure dashboard

New section order on `(app)/dashboard/page.tsx`:

1. **Hero / Check-in CTA** — if no answers today → big card "Structure today — 5 questions" → opens modal. Else compact "Today is structured · 12:34" badge.
2. **Today State** — compact 3 meters (mood / energy / stress) + 1 cognitive load number. Single row.
3. **Life Circle** — 12 cards keep, each now shows name, area dot, score-or-`—`, entries-linked count today, coverage micro-bar.
4. **Recent Signals** (replaces Recent Entries) — last 5 captures, each ≤ 90 chars, `entry_type` + `life_area` pill + relative time. Click → `/inbox` filtered.
5. **AI Inbox shortcut** — small input "Drop anything into Shadow." → submit focuses Orb (or routes to `/inbox`).

Remove from dashboard: "Active tasks", "Active goals", "Today summary" stat block, "Insight of the day".

Above-the-fold target: ≤ 4 visual modules at 1440px.

#### B. Daily Questions modal — `DailyCheckIn.tsx`

- Opens on first dashboard load per local day if `user_settings.show_questions_on_first_open !== false` AND no `question_answers` for today.
- Centered modal, max-width 520px, backdrop blur, ESC closes (saves draft as "skipped").
- Step counter `1/5 … 5/5` + progress bar.
- Per step: question text + textarea (≥ 3 rows) OR 1–10 slider for `is_state_question`.
- Buttons: **Skip** / **Replace this question** (picks next by weight from same category) / **Next**.
- Final step **Finish** writes `question_answers` rows. Toast: "Today is now structured."
- `localStorage` draft survives reload.

#### C. Copy (verbatim from Part 1)
- Title: "Structure today"
- Subtitle: "Answer 5 questions so Shadow can understand your current state."
- CTA: "Start check-in"
- Completion: "Today is now structured. Shadow will use this context across your dashboard."

#### D. Settings hook (minimal)

Add to `/settings`:
- "Show daily questions on first open" toggle → `user_settings.show_questions_on_first_open`.
- "Questions per day" 3/5/7 (default 5).

### Acceptance
- Fresh-day load → modal opens automatically.
- Skip / Replace / Finish all work.
- Reload after Finish → modal does not reopen.
- Above-the-fold ≤ 4 modules.
- Recent Signals replaces Recent Entries; Tasks/Goals cards removed from dashboard.
- `npm run build` green; no `any`.

### Agents / skills
- `uiux-pro-max-designer` for spacing + hierarchy audit.
- `magic-ui-component-gen` if modal primitive needed.
- `code-reviewer` after merge.

### Why this phase comes before LLM
Locks in daily ritual shape with deterministic data first. Phase 3.x AI features then snap into UX that already works.

---

## Phase 3.1 — Inbox v1 (raw capture)

**Goal:** Inbox becomes a real capture space. Persists raw entries. **No classification yet.**

### Tasks
1. `(app)/inbox/page.tsx` — drop `<Soon />`. Layout:
   - Top: large autosize `textarea` (min 160px, dark glass) with placeholder: "Write anything: a thought, task, fear, expense, food, idea, plan, emotion, or event."
   - Submit button + Cmd/Ctrl+Enter.
   - Below: last 50 captures grouped by day (Today / Yesterday / earlier).
   - Each: text snippet ≤ 200 chars + expand, relative time, raw badge.
2. `src/app/api/entries/route.ts` POST `{text}` → inserts `entries` row with `user_id`, `raw_text`, `status='unprocessed'`, `created_at`.
3. Optimistic append, rollback on error.
4. Filters: `status`, date range.

### Acceptance
- Submit → row appears ≤ 200ms.
- Supabase `entries` row has correct `user_id`.
- Recent Signals on dashboard reflects the entry (text-only).

### Notes
- No life area / no emotion / no extracted task yet — wires in 3.3.
- Keeps Inbox simple to test the **capture habit** in real use.

---

## Phase 3.2 — LLM classification endpoint

**Goal:** Server-side classification. Pure API. No UI changes.

### Tasks
1. `npm i @anthropic-ai/sdk zod`.
2. `src/lib/anthropic.ts` — singleton, model = `claude-haiku-4-5-20251001` for classification.
3. `src/ai/prompts/classification.ts` — load from `ai/prompts/01-classification.md`.
4. `src/app/api/classify/route.ts` POST `{entry_id}` (read the row to guarantee ownership). Zod-validated response:
   ```ts
   {
     summary: string;
     entry_type: "thought" | "task" | "feeling" | "question" | "event" | "expense" | "food";
     life_area_slug: string | null;
     emotion: { primary: string; intensity: number /* 1..10 */ } | null;
     suggested_followup: string | null;
     extracted_task: { title: string; due?: string } | null;
   }
   ```
5. 422 on parse fail (surface, don't auto-fix).
6. Insert `ai_processing_logs`: model, latency_ms, tokens_in, tokens_out, cost_usd.
7. Daily cost cap `MAX_DAILY_LLM_USD=1.50` → 429 when exceeded.

### Acceptance
- `curl POST /api/classify -d '{"entry_id":"…"}'` returns valid JSON.
- 422 on Zod fail (unit test, mocked Anthropic).
- `ai_processing_logs.cost_usd` populated.
- p95 latency < 2s.

### Agents / skills
- `claude-developer-platform` auto-trigger.
- `claude-api` for streaming reference.

---

## Phase 3.3 — Wire Inbox + Orb → classification

**Goal:** Submitted entries get classified, structured fields fill in, dashboard reflects it.

### Tasks
1. After `POST /api/entries` returns → client → `POST /api/classify` with the new `entry_id`. Patch entry: `status='processed'` + structured columns.
2. Inbox list item gains area pill, entry_type pill, emotion pill, extracted-task chip.
3. Orb gets the same flow: send → `/api/classify` streaming reply → persist.
4. Recent Signals on dashboard now uses `summary` (from classifier) not raw text.
5. If `extracted_task` present → insert `tasks` row with `user_id`, `linked_entry_id` (not rendered — Tasks page still `<Soon />`).

### Acceptance
- New entry: typed → list raw → ≤ 2s pills materialize.
- Orb: user msg → Shadow streams summary → entry visible on dashboard with area + emotion.
- `tasks` rows created for extracted tasks.
- Optimistic UI rolls back on classify 422.

### Risks
- Streaming + persistence ordering — persist only after final chunk.
- Classifier drift — version prompt + Zod schema (`classification@v1.json` in repo).

---

## Phase 3.4 — Daily questions write flow + State meters

**Goal:** Answers from check-in modal feed mood / energy / stress / cognitive load.

### Tasks
1. Migration (if not present): `question_answers (user_id, question_id, value_text, value_numeric, created_at)`.
2. `DailyCheckIn` (built in 2.3) starts persisting on Finish.
3. Three seed questions tagged `is_state_question=true` with `state_key ∈ ('mood','energy','stress')`.
4. Dashboard `State` meters compute today's values from `question_answers` (server component).
5. Cognitive load = `count(tasks.status='open' AND priority>='high')` for user today — simple v1.
6. Tag-revalidate at local midnight: `revalidateTag('state-today')` + `unstable_cache` 1h TTL.

### Acceptance
- Finish check-in → dashboard State row populated.
- Mood answered `7/10` → mood meter at 70%.
- Reload after midnight (local) → meters reset to "—".

---

## Phase 4.1 — Life Circle scoring + Recent Signals upgrade

**Goal:** Replace `—` on Life Circle cards with real 1–10 scores.

### Tasks
1. `src/ai/prompts/area-scoring.ts` from `ai/prompts/06-life-area-scoring.md`.
2. Batch job (on-demand button + nightly cron): per user, read last 7 days of entries + answers, call Sonnet, write `life_area_scores (user_id, area_id, score, confidence, computed_at)`.
3. Dashboard reads today's row; absent → "—" + "Score in 24h".
4. Card upgrades: score number, trend arrow vs yesterday (▲/▼/→), status badge (`active` / `neglected` / `overloaded` from entry volume vs median area volume).
5. Click area → `/areas/[slug]` shows linked entries (read-only).
6. Recent Signals adds 1 "Today's pattern": top-trending area or biggest swing vs week.

### Acceptance
- Manually trigger scoring → cards fill with numbers + arrows.
- "Neglected" badge on areas with 0 entries / 7d when others have ≥ 3.
- Click area card → detail page renders linked entries.

### Cost guardrail
- Sonnet ≈ $0.015 per user-day. Cache by `(user_id, date)`.

---

## Phase 4.2 — Daily report generator

**Goal:** Button produces a 200–400 word Shadow-voiced report.

### Tasks
1. `src/ai/prompts/daily-report.ts` from `ai/prompts/04-daily-report.md`.
2. `src/app/api/reports/daily/route.ts` POST → today's entries + answers + scores → Sonnet (system prompt cached) → write `daily_reports (user_id, date, body, confidence, ai_log_id)`.
3. `(app)/reports/page.tsx` — drop `<Soon />`. List past reports + "Generate today's report" CTA.
4. Confidence indicator on report card (low / med / high).

### Acceptance
- After ≥ 3 entries today, Generate → 200–400 word report in 5–10s.
- Reload `/reports` → persists.
- Same-day re-generate is cached unless `?force=1`.

---

## Phase 4.3 — RAG memory

**Goal:** Shadow recalls past entries. `/memory` becomes the timeline + search.

### Tasks
1. Migration: `create extension if not exists vector; alter table entries add column embedding vector(1536);`.
2. On classify-success: compute embedding (Voyage `voyage-3-lite`) and store.
3. `src/lib/rag.ts` — `searchSimilarEntries(text, k=5, user_id)` using `embedding <#> $1`.
4. Classification prompt gets a `<memory>` block with top-k matches.
5. `(app)/memory/page.tsx` — drop `<Soon />`. Timeline + semantic search.
6. "Ask Shadow" textarea at top of `/memory`: free-form query → answer using top-k as context → answer + cited entries.

### Acceptance
- "what was I anxious about last week" → cites ≥ 1 entry with date.
- p95 retrieval < 200ms with 1k entries.
- Settings toggle "exclude private entries from memory" filters them out.

### Risks
- Vector cost. `voyage-3-lite` ≈ $0.02 / 1M tokens → negligible at < 1k entries/user.

---

## Phase 5 — Tests, perf budget, observability

### 5a. Tests (target 80%)
- Unit: `data.ts`, `pickDailyQuestions`, `rag.ts`, Zod schemas, `DailyCheckIn` reducer.
- Integration: `/api/classify`, `/api/entries`, `/api/reports/daily` (record/replay against Anthropic).
- E2E (Playwright via `e2e-runner`): check-in, capture, score+report, memory query.

### 5b. Perf budget
- LCP < 1.5s on `/dashboard` cold.
- TTI < 2s.
- First-load JS on `/dashboard` < 200 KB.
- Dev RSS < 1.5 GB sustained.

### 5c. Observability
- Structured server logs (request id, user id hash, route, latency, ok/err).
- LLM ledger helper: `select date_trunc('day', created_at), sum(cost_usd) from ai_processing_logs where user_id=$1 group by 1 order by 1 desc`.
- `/api/health` → `{ok, db, llm, version}`.
- Wire Sentry (or Logflare) into `error.tsx` + `global-error.tsx`. No entry text in payload — `digest` + user id hash only.

---

## Phase 6 — Polish + deploy + case study

### Tasks
1. UI polish — `uiux-pro-max-designer` audit: spacing, type scale, WCAG AA, empty states, dark accents.
2. Settings page filled out per Part 1 — Profile / Check-in / Memory / Privacy / AI Behavior / Appearance / Data Categories.
3. Brand imagery via `nano-banana-image-gen`: OG card, 404 illustration, favicon set.
4. Deploy: Vercel + env (Supabase, Anthropic, Voyage, cost cap). Region pin via `vercel.json`.
5. Domain: `shadow.<your-domain>`.
6. `case-study/shadow-case-study.md` — fill from session reports + screenshots.

### Acceptance
- Public URL reachable, Lighthouse ≥ 90 across all 4 categories.
- Case study renders hero, problem, approach, key decisions, screenshots, metrics.

---

# Part 3 — Cross-cutting & operational

## A. Type safety
- `supabase gen types typescript --linked > src/types/supabase.ts`. Replace hand-rolled DB types.
- Enable `noUncheckedIndexedAccess` once codebase > 30 files (post Phase 3).

## B. Cost discipline
- Single source of truth: `src/lib/llm/route.ts` exports `chooseModel(task)` returning `{model, max_tokens, cache_system}`.
- Prompt caching for daily report + area scoring system prompts.

## C. Memory guardrails (continuing Session 003 work)
- `src/instrumentation.ts` — `process.on("uncaughtException"|"unhandledRejection")` → structured log + non-fatal.
- `INSPECT=1 npm run dev:safe` → enables `--inspect`.
- `LOW_MEM=1 npm run dev:safe` → forces webpack instead of Turbopack (when Phase 4+ deps land).

## D. Accessibility
- Sidebar: `aria-current="page"` on active link.
- Orb panel: focus trap + return-focus on close.
- Meters: `role="meter"` + `aria-valuenow/min/max`.
- Check-in modal: focus-trap, `aria-modal`, ESC restore focus.

## E. i18n readiness
- Wrap user-facing strings in `t()` no-op now → swap for `next-intl` in Phase 6. Russian first non-English locale.

## F. Privacy / trust
- Settings toggle "exclude private entries from memory" — surface in 4.3, polish in 6.
- "Export data" button — `{user_id}.shadow.json` of all user-owned rows. Implement in 6.
- "Delete all memories" — drops embeddings only, keeps entries. Implement in 4.3.

---

# Part 4 — Quick wins (do anytime, < 1h each)

| # | Win | File(s) | Why |
|---|-----|---------|-----|
| 1 | `aria-current` on Sidebar active link | `Sidebar.tsx` | a11y |
| 2 | Focus trap in ShadowOrb panel | `ShadowOrb.tsx` | a11y, keyboard |
| 3 | Persist Orb messages to `localStorage` (until 3.3) | `ShadowOrb.tsx` | continuity |
| 4 | `instrumentation.ts` with `process.on` handlers | new file | crash logging |
| 5 | Replace inline `<hr>` with `Separator` component | `Card.tsx`, dashboard | consistency |
| 6 | Pre-commit hook: `next lint` + `tsc --noEmit` | `.husky/pre-commit` | CI parity |
| 7 | Favicon + apple-touch-icon set | `public/` | branding |
| 8 | `viewport` + `themeColor` in root metadata | `layout.tsx` | mobile polish |
| 9 | `loading.tsx` per route group | `(app)/loading.tsx` | perceived perf |
| 10 | Phase screenshots into case-study draft | docs only | portfolio |

---

# Part 5 — Risks & open questions

1. **Next 16 `proxy` vs `middleware`** — cookie roundtrip not identical. Verify with Supabase recipe before relying.
2. **Turbopack memory drift** — fallback path (`LOW_MEM=1`) is ready.
3. **LLM cost** — ~50 entries/day + 1 report ≈ $0.50/day. Cache aggressively.
4. **Single-user assumption** — RLS audit in 2.2. Public deploy waits for Phase 6.
5. **Mobile-first** — current layout is desktop-first; decide in Phase 6 if mobile is v1.
6. **Question replacement loop** — risk of repetition. Track shown questions per user-day in `question_answers` + a `question_shown_log` shadow row when "Replace" is used.

---

# Part 6 — Definition of "MVP done"

- User logs in → `/dashboard` opens with check-in modal → answers 5 questions → modal closes → State meters fill.
- User opens Inbox → drops a thought → entry classified within 2s → area + emotion + (optional) task pills appear.
- User opens dashboard → sees Life Circle with scores + trends + Recent Signals.
- User hits "Generate daily report" → reads a 200–400 word Shadow-voiced report.
- User asks Memory "what was I avoiding last week" → answer with cited entries.
- All on real DB, real LLM, with cost ledger.
- Lighthouse ≥ 90.
- 80% unit + integration coverage.
- One screenshot per phase in case study.

ETA from current point: **6–8 focused sessions**.

Phase-to-session estimate:
- 2.1 + 2.2 → 1 session
- 2.3 (UX pass) → 1 session
- 3.1 + 3.2 → 1 session
- 3.3 + 3.4 → 1 session
- 4.1 + 4.2 → 1 session
- 4.3 → 1 session
- 5 → 1 session
- 6 → 1 session

---

# Part 7 — Immediate next-session entry point

**Session 004 target:** Phase 2.1 (DB re-wire). Output: `reports/004-db-rewire/REPORT.md`.

Pre-flight before starting Session 004:
- Confirm Supabase project exists + migrations from `supabase/migrations/*.sql` are applied (Session 002 work).
- Have `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` ready in `.env.local`.
- Confirm `npm run dev:safe` still launches cleanly on the current skeleton.
