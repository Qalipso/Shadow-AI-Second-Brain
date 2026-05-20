# Shadow — Session Brief (2026-05-12)

Quick-start doc for new chat sessions. Covers architecture, file map, DB state, and next phase.

---

## What is Shadow

AI-powered personal life analytics dashboard ("second memory"). User captures life fragments (thoughts, tasks, emotions, expenses), Shadow classifies them via LLM, distributes across 12 life areas, tracks mood/energy/stress, generates daily reports.

**Core ritual:** Open app → answer 5 daily questions → capture thoughts in Inbox → see Life Circle state.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16.2.6, React 19.2, TypeScript 5.6 |
| Styling | Tailwind CSS v4 (`@theme inline`), CSS variables, dark-only palette |
| DB | Supabase (remote, ref: `jklnnmhttsvbizxrwiyg`) with RLS |
| Auth | Supabase Auth (email+password, magic link, signup) |
| LLM | OpenAI (gpt-4o-mini for classify, gpt-4o for reports/scoring) |
| Validation | Zod at all boundaries |
| Dev | Turbopack, `dev-safe.sh` with OOM protection, NODE_OPTIONS heap caps |

---

## Project Root

```
/home/edu/Automatization-AI/shadow/
├── web/                      # Next.js app
│   ├── src/
│   │   ├── app/              # Pages + API routes
│   │   ├── components/       # UI components
│   │   ├── lib/              # Data fetchers, hooks, utils
│   │   ├── ai/prompts/       # LLM prompt templates
│   │   ├── types/            # Zod schemas + TS types
│   │   └── proxy.ts          # Next 16 middleware (auth guard)
│   ├── scripts/dev-safe.sh   # Dev launcher with crash recovery
│   ├── .env.local            # Supabase + OpenAI keys (never commit)
│   └── package.json
├── supabase/
│   ├── config.toml
│   └── migrations/           # 5 applied migrations
└── reports/
    └── 003-skeleton-rebuild-memory-hardening/
        ├── REPORT.md
        └── IMPROVEMENT_PLAN.md   # Master plan (Phases 1.5-6)
```

---

## File Map (59 source files)

### Pages (src/app/)
| Path | Type | Description |
|------|------|-------------|
| `(app)/dashboard/page.tsx` | async server | Main dashboard: Hero + State + Life Circle + Signals + Capture |
| `(app)/inbox/page.tsx` | server | PageHeader + InboxView |
| `(app)/areas/page.tsx` | async server | 12 life area cards from DB |
| `(app)/questions/page.tsx` | async server | Questions grouped by category |
| `(app)/settings/page.tsx` | server | CheckInPrefs + placeholder cards |
| `(app)/reports/page.tsx` | server | `<Soon />` placeholder |
| `(app)/goals/page.tsx` | server | `<Soon />` placeholder |
| `(app)/tasks/page.tsx` | server | `<Soon />` placeholder |
| `(app)/memory/page.tsx` | server | `<Soon />` placeholder |
| `(app)/layout.tsx` | async server | Sidebar + ShadowOrb + UserPill shell |
| `login/page.tsx` | server | Login page (3 modes: password/signup/magic) |
| `login/LoginForm.tsx` | client | useActionState per mode, client-side nav |
| `login/actions.ts` | server actions | signIn, signUp, sendMagicLink |
| `auth/callback/route.ts` | route handler | OAuth/magic-link code exchange |
| `page.tsx` | server | Root `/` redirect to `/dashboard` |
| `error.tsx` | client | Error boundary |
| `global-error.tsx` | client | Root error boundary |
| `not-found.tsx` | server | 404 page |

### API Routes (src/app/api/)
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/entries` | POST, GET | Create entry + list with life_areas join |
| `/api/classify` | POST | LLM classification pipeline (auth → cost cap → OpenAI → Zod → update entry → insert task → log) |
| `/api/answers` | POST, GET | Bulk insert question_answers + list by date |
| `/api/state-today` | GET | Mood/energy/stress from answers + cognitive_load from tasks |
| `/api/auth/signout` | POST | Sign out → redirect /login |

### Components (src/components/)
| Component | Type | Description |
|-----------|------|-------------|
| `dashboard/CheckInHero.tsx` | client | CTA vs "structured" badge based on answered_count |
| `dashboard/DailyCheckIn.tsx` | client | 5-step modal, progress, Skip/Replace/Next, localStorage draft, posts /api/answers |
| `dashboard/StateMeters.tsx` | client | Live mood/energy/stress bars + cognitive load from /api/state-today |
| `dashboard/RecentSignals.tsx` | client | Last 5 entries via useEntries hook, pills for type/area/emotion |
| `dashboard/InboxShortcut.tsx` | client | Quick capture → sessionStorage → /inbox |
| `inbox/InboxView.tsx` | client | Composer + EntryList + filter chips |
| `inbox/Composer.tsx` | client | Autosize textarea, Cmd+Enter, POST /api/entries + /api/classify chain |
| `inbox/EntryList.tsx` | client | Day-grouped entries, expand, pills, status badges |
| `settings/CheckInPrefs.tsx` | client | localStorage-backed check-in preferences |
| `Modal.tsx` | client | Focus trap, ESC, backdrop blur, body scroll lock |
| `Sidebar.tsx` | server | 9-item nav, aria-current, footer slot |
| `UserPill.tsx` | async server | Auth state display + logout |
| `PageHeader.tsx` | server | Eyebrow + title + subtitle + right slot |
| `Card.tsx` | server | Titled card container |
| `ShadowOrb.tsx` | client | Floating orb (placeholder) |
| `Soon.tsx` | server | Coming soon placeholder |

### Lib (src/lib/)
| File | Description |
|------|-------------|
| `data.ts` | `getLifeAreas()`, `getActiveQuestions()`, `getDashboardCounts()` — env-aware, Zod-validated |
| `llm.ts` | OpenAI singleton, MODELS map, PRICING, `estimateCostUsd()` |
| `cost-ledger.ts` | `isOverDailyCap()`, `todaysCostUsd()`, `recordLlmCall()` — daily $1.50 cap |
| `pick.ts` | Deterministic weighted random question picker (Mulberry32 + Efraimidis-Spirakis) |
| `check-in.ts` | localStorage helpers for draft, completion marker, settings |
| `time.ts` | `relativeTime()`, `localDateKey()`, `dayLabel()` |
| `seed-fallback.ts` | 12 areas + 8 questions for dev mode (no Supabase) |
| `auth.ts` | `getCurrentUser()` helper |
| `cn.ts` | clsx utility |
| `supabase/env.ts` | `getSupabaseEnv()`, `hasSupabase()` |
| `supabase/server.ts` | `createSupabaseServerClient()` |
| `supabase/client.ts` | `createSupabaseBrowserClient()` |
| `entries/types.ts` | InboxEntry, CreateEntryInput Zod schemas |
| `entries/local.ts` | localStorage CRUD, dispatches `shadow:entries:changed` |
| `entries/useEntries.ts` | Client hook: fetch /api/entries with localStorage fallback |
| `entries/classification.ts` | ClassificationResultSchema, `parseClassificationResponse()` |

### Types (src/types/)
| File | Exports |
|------|---------|
| `db.ts` | Zod schemas + TS types: LifeArea, Question, Entry, QuestionAnswer, Task, Goal, LifeAreaScore, AiProcessingLog |

### AI Prompts (src/ai/prompts/)
| File | Description |
|------|-------------|
| `classification.ts` | SYSTEM_PROMPT + `buildUserPrompt()` for entry classification. Strict JSON schema output. |

---

## Database (Supabase)

### Tables
| Table | Type | Description |
|-------|------|-------------|
| `profiles` | personal | Auto-created via `handle_new_user` trigger |
| `life_areas` | global | 12 areas (health, career, finance, relationships, etc.) |
| `question_bank` | global | 3 state questions (mood/energy/stress) + 20 reflection questions |
| `entries` | personal | Raw captures + classified fields (summary, entry_type, life_area_id, emotion) |
| `question_answers` | personal | Daily check-in answers (value_text or value_numeric) |
| `tasks` | personal | AI-extracted tasks from entries |
| `goals` | personal | Future use |
| `life_area_scores` | personal | Future: 1-10 scores per area |
| `daily_reports` | personal | Future: AI-generated daily reports |
| `ai_processing_logs` | personal | LLM call audit trail (model, tokens, cost, latency) |
| `user_settings` | personal | Future: per-user preferences |

### Migrations Applied
1. `20260512120000_init_schema.sql` — 11 tables + pgvector + pgcrypto + trigger
2. `20260512120001_rls_policies.sql` — RLS on all tables
3. `20260512120002_seed_life_areas.sql` — 12 areas with color_hint
4. `20260512120003_seed_question_bank.sql` — 23 questions (3 state + 20 reflection)
5. `20260512120004_reference_tables_anon_read.sql` — Anon read for life_areas + question_bank

### Current Data
- 1 user (quadwailt@gmail.com), email confirmed
- 1 profile (trigger works)
- 2+ entries (some processed with classification)
- 12 life_areas, 22+ question_bank rows
- ai_processing_logs tracking LLM costs

### Connection
```
# Remote Supabase
URL: https://jklnnmhttsvbizxrwiyg.supabase.co
Dashboard: https://supabase.com/dashboard/project/jklnnmhttsvbizxrwiyg

# Direct DB (for psql/migrations)
postgresql://postgres:<password>@db.jklnnmhttsvbizxrwiyg.supabase.co:5432/postgres

# Push migrations
supabase db push --db-url "postgresql://..."
```

---

## Auth Flow

1. `proxy.ts` guards protected routes → redirect to `/login`
2. Login supports: email+password, signup, magic link
3. Server actions return `{next: "/dashboard"}` (NOT `redirect()` — breaks useActionState)
4. Client navigates via `router.replace(next)` + `router.refresh()`
5. Auth callback at `/auth/callback` handles magic link code exchange

---

## Classification Pipeline

```
User types in Composer
  → POST /api/entries (creates unprocessed entry)
  → POST /api/classify { entry_id }
    → Auth check
    → Daily cost cap check ($1.50/day)
    → Fetch entry (RLS)
    → OpenAI gpt-4o-mini (JSON mode, temperature=0)
    → Zod validate ClassificationResult
    → Resolve life_area_slug → life_area_id
    → Update entry (summary, type, area, emotion, status=processed)
    → Insert task if extracted_task present
    → Log to ai_processing_logs
  → Client dispatches shadow:entries:changed event
  → UI refreshes (RecentSignals, EntryList, StateMeters)
```

---

## Event Bus

Custom DOM events for cross-component reactivity:
- `shadow:entries:changed` — after entry create/classify
- `shadow:answers:changed` — after daily check-in submit

Components listen via `window.addEventListener()` in useEffect.

---

## Design System

Dark-only palette defined in globals.css:
- `--bg-base: #0B0B10` → `--bg-elev3: #23232F` (4 elevation levels)
- `--accent-warm: #C9A36A` (gold), `--accent-cool: #6D7BFF` (blue)
- `--state-danger: #E36161`, `--state-success: #6FBF8A`, `--state-warning: #E0B25C`
- Fonts: Geist Sans (body), Fraunces (headings/numbers)
- Animations: fade-in, fade-up, scale-in, backdrop-in, shimmer, stagger (12 children)
- Utilities: card-hover, skeleton, scroll-thin, focus-visible, orb-pulse

---

## Dev Commands

```bash
cd /home/edu/Automatization-AI/shadow/web
npm run dev          # Turbopack dev (port 3007)
npm run dev:safe     # With OOM protection + crash recovery
npm run build        # Production build
npm run lint         # ESLint
```

---

## Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1.5 | Skeleton rebuild + memory hardening | Done |
| 2.1 | DB re-wire (live life_areas + questions) | Done |
| 2.2 | Auth + user ownership (RLS, proxy, login) | Done |
| 2.3 | Dashboard simplification + Daily Questions modal | Done |
| 3.1 | Inbox v1 (raw capture, persist) | Done |
| 3.2 | LLM classification endpoint (OpenAI, not Anthropic) | Done |
| 3.3 | Wire Inbox → classification + entry persistence | Done |
| 3.4 | Daily questions write flow + State meters | Done |

---

## Next Phase: 4.1 — Life Circle Scoring + Recent Signals Upgrade

**Goal:** Replace `—` on Life Circle cards with real 1-10 scores.

### Tasks
1. `src/ai/prompts/area-scoring.ts` — scoring prompt
2. Batch job (on-demand button + nightly cron): per user, read last 7 days entries + answers → call gpt-4o → write `life_area_scores`
3. Dashboard reads today's scores; absent → "—" + "Score in 24h"
4. Card upgrades: score number, trend arrow (up/down/flat), status badge (active/neglected/overloaded)
5. Click area → `/areas/[slug]` detail with linked entries
6. Recent Signals adds "Today's pattern" insight (top-trending area or biggest swing)

### After 4.1
- Phase 4.2 — Daily report generator (200-400 word Shadow-voiced report)
- Phase 4.3 — RAG memory (embeddings, similar entries, "Ask Shadow")
- Phase 5 — Tests (80% coverage), perf budget, observability
- Phase 6 — Polish, deploy, case study

---

## Known Gotchas

1. **Next 16 proxy vs middleware**: `middleware.ts` renamed to `proxy.ts`, `export function middleware` → `export async function proxy`
2. **useActionState + redirect()**: Calling `redirect()` inside server action wrapped with `useActionState` throws "Unexpected response". Return `{next}` and navigate client-side.
3. **Hooks order in DailyCheckIn**: All hooks must be before conditional returns (React rules of hooks).
4. **Supabase anon key format**: Uses `sb_publishable_*` prefix (not `eyJ*` JWT format).
5. **RLS on reference tables**: `life_areas` and `question_bank` need explicit anon read policy.
6. **OpenAI (not Anthropic)**: Pivoted mid-build. Uses `openai` SDK, `response_format: { type: "json_object" }`.

---

## Full Plan

See `/home/edu/Automatization-AI/shadow/reports/003-skeleton-rebuild-memory-hardening/IMPROVEMENT_PLAN.md` for the complete phase sequence, acceptance criteria, and product philosophy.
