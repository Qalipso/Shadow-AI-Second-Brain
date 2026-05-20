# Shadow Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser (Next.js)                        │
│  ┌─────────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Inbox       │  │ Check-in │  │ ShadowOrb   │  │ Direction  │ │
│  │ Composer    │  │ Wizard   │  │ Chat        │  │ Tasks      │ │
│  └─────────────┘  └──────────┘  └─────────────┘  └────────────┘ │
└────────────────────┬─────────────────────────────────────────────┘
                     │ HTTP (App Router)
┌────────────────────┴─────────────────────────────────────────────┐
│                     Next.js Server (Route Handlers)               │
│  ┌─────────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ /api/       │  │ /api/    │  │ /api/shadow/│  │ /api/      │ │
│  │ entries     │  │ classify │  │ chat        │  │ embed      │ │
│  └──────┬──────┘  └────┬─────┘  └──────┬──────┘  └─────┬──────┘ │
│         │              │                │                │       │
│         └──────────────┴───────┬────────┴────────────────┘       │
│                                │                                  │
│           ┌────────────────────┴─────────────────────┐           │
│           │       Server-Only Library Layer          │           │
│           │  lib/llm.ts      lib/rag.ts              │           │
│           │  lib/embeddings  lib/memory/context.ts   │           │
│           │  lib/cost-ledger lib/supabase/server.ts  │           │
│           └────────────────────┬─────────────────────┘           │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
              ┌──────────────────┼─────────────────┐
              │                  │                 │
       ┌──────┴──────┐   ┌──────┴──────┐  ┌─────┴─────┐
       │   OpenAI    │   │  Supabase    │  │  Spotify  │
       │             │   │  Postgres    │  │   API     │
       │ - gpt-4o    │   │  + pgvector  │  │           │
       │ - gpt-4o-   │   │  + RLS       │  │           │
       │   mini      │   │              │  │           │
       │ - embed-3   │   │              │  │           │
       └─────────────┘   └──────────────┘  └───────────┘
```

---

## Module Breakdown

### 1. Capture Layer
**Entry point:** `src/components/inbox/Composer.tsx`

User types free text → on submit:
1. Optimistic local entry render (`lib/entries/local.ts`)
2. `POST /api/entries` writes to `entries` table
3. Fire-and-forget `POST /api/classify` (returns structured entities)
4. Fire-and-forget `POST /api/embed` (stores vector in `entries.embedding`)

No tags, no categories, no manual fields. LLM does the structuring.

### 2. Classification Pipeline
**Prompt:** `ai/prompts/01-classification.md` · `src/ai/prompts/classification.ts`
**Route:** `src/app/api/classify/route.ts`

Input: raw text + recent context
Output:
```json
{
  "entity_type": "task | mood | idea | observation | decision | blocker | win",
  "life_areas": ["work", "health", ...],
  "sentiment": -1.0 to 1.0,
  "urgency": 0-10,
  "suggested_action": "..."
}
```

Model: `gpt-4o-mini` (cost-efficient default).

### 3. RAG Memory Engine
**Doc:** `ai/rag/memory-architecture.md`
**Core:** `src/lib/rag.ts` + `src/lib/memory/context.ts`

```
buildMemoryContext(query, userId, opts) returns:
  ├── similar       ← pgvector cosine search via match_entries RPC
  ├── todayEntries  ← all entries from today
  ├── scores        ← latest life_area_scores
  └── block         ← formatted prompt block ready to inject
```

Three queries run **in parallel**, each best-effort (catch → []).
Used by:
- `/api/shadow/chat` (ShadowOrb)
- `/api/reports/daily` (daily report)
- `/api/reports/weekly` (weekly review)
- `/api/score-areas` (life area scoring)

### 4. Model Routing
**Lib:** `src/lib/llm.ts`

| Use case | Model | Why |
|----------|-------|-----|
| Classification | `gpt-4o-mini` | High volume, low complexity |
| Quick chat | `gpt-4o-mini` | Sub-second latency, cheap |
| Deep chat | `gpt-4o` | Multi-step reasoning, memory synthesis |
| Daily report | `gpt-4o` | Pattern detection across many entries |
| Area scoring | `gpt-4o` | Calibration requires careful reasoning |
| Interventions | `gpt-4o` | High-quality creative output |
| Labs analysis | `gpt-4o` | Personality interpretation |

Deep query detection: `isDeepQuery()` heuristic in `ai/prompts/shadow-chat.ts` checks for words like *why*, *pattern*, *across*, *last week*.

### 5. Cost Ledger
**Lib:** `src/lib/cost-ledger.ts`

Every LLM call writes to `ai_processing_logs` table:
- input/output tokens
- model
- USD cost (calculated from token counts)
- user_id, timestamp

Hard cap: `MAX_DAILY_LLM_USD` env (default $1.50/user/day). Exceeded → API returns 402 + UI shows "Shadow needs rest" message until next day.

### 6. Life Areas Wheel
**Seed:** `db/seeds/life_areas.sql`
**Component:** `src/components/dashboard/LifeCircle.tsx`

12 fixed life areas: Work, Health, Money, Relationships, Family, Creativity, Learning, Identity, Joy, Body, Spirituality, Direction.

Each entry classified → linked via `entry_life_areas` (many-to-many).
Daily aggregation → `life_area_scores` table (0-100 per area).

### 7. Interventions
**Pages:** `src/app/(app)/interventions/[tool]/page.tsx`
**Tools:** task_shatter · dopamine_menu · context_switch · interest_filter
**Components:** `ToolPanel` (input form) + `ResultCard` (output)

State lifecycle: `draft → active → completed | archived | dismissed`

Completed cards hide action hero + lifecycle buttons (only quest content + final unlock remain).

### 8. Labs
**Pages:** `src/app/(app)/labs/[slug]/`
**Lib:** `src/lib/labs/scoring.ts`

Structured tests (Big 5, values, current state). Each session:
1. User answers Likert scale questions
2. `POST /api/labs/sessions/[id]/complete` → score calculated
3. LLM generates personalized narrative (`ai/prompts/labs-analysis.ts`)
4. Results page + radar chart

Feeds into Shadow's persona context.

### 9. Sonic Mirror
**Pages:** `src/app/(app)/insights/sonic/`
**Lib:** `src/lib/music/spotify.ts`

OAuth flow (PKCE) → store encrypted refresh token → periodic sync of top tracks/artists. Emotional analysis layer maps audio features (valence, energy, tempo) to emotional state. Surfaces in dashboard as ambient signal.

---

## Data Flow: Capture → Memory → Recall

```
1. User types: "Tired today. Couldn't focus on the proposal. Skipped gym."
2. Composer creates local entry (optimistic).
3. POST /api/entries → row in `entries` table.
4. Background:
   ├── POST /api/classify
   │   → entity_type: "mood + blocker"
   │   → life_areas: ["body", "work"]
   │   → sentiment: -0.4
   │   → INSERT entry_life_areas (entry_id, life_area_id) x 2
   ├── POST /api/embed
   │   → embed via text-embedding-3-small
   │   → UPDATE entries SET embedding = $1
   └── score-areas job (next day) reduces body + work scores

5. Two days later, user opens ShadowOrb: "почему мне последнее время хреново?"
6. ShadowOrb pipeline:
   ├── isDeepQuery() → true → route to gpt-4o
   ├── buildMemoryContext(query, userId)
   │   ├── embed query
   │   ├── match_entries RPC → top 8 similar
   │   ├── fetch today entries
   │   └── fetch life_area_scores
   ├── Build prompt with memory block + shadow persona
   └── stream gpt-4o response

7. Response cites: "Three entries this week mention fatigue + skipped gym.
   Your body score dropped from 72 to 58. Work overload pattern repeating
   from October. Suggest: tomorrow morning, before laptop, 20-min walk."
```

---

## Security

| Concern | Mitigation |
|---------|-----------|
| Secrets in client | `lib/rag.ts`, `lib/llm.ts`, `lib/memory/context.ts` marked `server-only` |
| Row leakage | RLS policies on every table, scoped to `auth.uid()` |
| Cost runaway | `MAX_DAILY_LLM_USD` enforced in `lib/cost-ledger.ts` |
| Spotify token theft | Refresh tokens encrypted with `lib/music/crypto.ts` |
| Rate limiting | `lib/rate-limit.ts` per-IP token bucket on classify/chat |
| XSS | React escaping + DOMPurify on any markdown rendering |
| Auth | Supabase magic link only; no password storage |

---

## Performance

- **Streaming responses** for chat, reports, interventions (LLM tokens as they arrive)
- **Parallel queries** in `buildMemoryContext` (3 fetches concurrently)
- **Optimistic UI** for inbox capture (no waiting on server)
- **Dynamic imports** with `ssr: false` for Three.js scene components
- **Edge runtime** considered for `/api/embed` (deferred — pgvector RPC needs Node runtime)
- **Token caching** on classification prompts (system prompt is static)

---

## Testing Strategy

| Layer | Tool | What we test |
|-------|------|--------------|
| Unit | Vitest | `lib/*` pure functions (scoring, time, classification helpers, rate-limit) |
| Integration | Vitest + Supabase test client | RLS policies, RPC calls, embedding round-trip |
| E2E | Playwright | Auth flow, capture → classify → dashboard render, check-in wizard |

Coverage target: 80% on `src/lib/`, 60% on components, critical E2E flows always green.

---

## Key Tradeoffs

See [DECISIONS/](./DECISIONS/) for full ADRs. Quick summary:

| Tradeoff | Choice | Why |
|----------|--------|-----|
| Build vs. buy memory | Build (pgvector) | Cheap, owned, scales to millions of entries |
| Realtime vs. polling | Polling | Simpler, sufficient for single-user MVP |
| SSE vs. WebSocket | SSE (streaming) | Read-only chat, simpler |
| Monorepo vs. polyrepo | Monorepo | Shared types, single CI, faster iteration |
| Tailwind vs. CSS-in-JS | Tailwind v4 + custom tokens | Speed of iteration, tokens for theming |
| OpenAI vs. Claude | OpenAI primary | Function-calling maturity, JSON mode |
| Supabase vs. raw Postgres | Supabase | Auth + RLS + Edge functions out of box |

---

## Future Architecture Notes

- **Multi-user:** RLS already in place; needs subscription billing + invite flow
- **Mobile:** React Native shell calling existing API routes; offline-first capture queue
- **Voice:** Whisper API for transcription → existing classification pipeline
- **Plugin system:** Allow user to add custom classifiers / interventions via skill registry
- **Federation:** Encrypted backup → user-owned storage (Tigris/R2/iCloud)
