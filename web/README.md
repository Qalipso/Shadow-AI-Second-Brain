# Shadow — AI Personal Operating System

> Shadow turns thoughts, tasks, moods and memories into a living map of you.

**Status:** Live MVP → [shadow-web-eight.vercel.app](https://shadow-web-eight.vercel.app)

One thought in. Shadow parses it into emotion, life areas, tasks and patterns — updates your Life Circle, saves a memory candidate, generates an insight with cited sources. All in one session.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Animation | Motion (motion.dev) |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| AI | OpenAI (gpt-4o-mini / gpt-4o) |
| Testing | Vitest (unit) + Playwright (E2E) |

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY

# 3. Start dev server
npm run dev          # http://localhost:3007
# or (crash-resilient with auto-restart):
npm run dev:safe
```

---

## Scripts

```bash
npm run dev          # Dev server (2GB heap)
npm run build        # Production build (3GB heap)
npm run typecheck    # TypeScript check (no emit)
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

---

## Environment variables

See `.env.example` for full list with descriptions.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_CLASSIFY_MODEL` | No | Default: gpt-4o-mini |
| `OPENAI_REPORT_MODEL` | No | Default: gpt-4o |
| `MAX_DAILY_LLM_USD` | No | Cost cap per user/day. Default: 1.50 |
| `NEXT_PUBLIC_APP_URL` | No | App base URL |
| `TOKEN_ENCRYPTION_KEY` | For Spotify | 32-char hex string |
| `SPOTIFY_*` | No | Spotify integration (optional) |

---

## Project structure

```
src/
├── app/
│   ├── (app)/          # Authenticated shell — Sidebar + ShadowOrb
│   │   ├── dashboard/  # Today cockpit
│   │   ├── inbox/      # Capture + AI parse
│   │   ├── areas/      # Life Circle map
│   │   ├── direction/  # Goals → Missions → Tasks
│   │   ├── rituals/    # Habits as orbits
│   │   ├── insights/   # AI-generated insights
│   │   ├── memory/     # Semantic memory search
│   │   ├── labs/       # Calibration modules
│   │   └── journey/    # Personal timeline
│   └── api/            # API routes
├── components/
│   ├── onboarding/     # OnboardingTour, MemoryContract
│   ├── direction/      # Direction page components
│   ├── rituals/        # Ritual orbit UI
│   ├── areas/          # Life Circle components
│   └── ...
├── lib/
│   ├── llm.ts          # OpenAI helpers
│   ├── rag.ts          # pgvector search
│   └── memory/         # Context builder for RAG
└── types/              # Zod schemas + inferred types
```

---

## Architecture notes

- **Memory-conservative:** heap capped at 2GB dev, 3GB build. No heavy UI libraries.
- **AI cost cap:** `MAX_DAILY_LLM_USD` enforced via `ai_processing_logs` table.
- **Model routing:** `gpt-4o-mini` for classification/chat, `gpt-4o` for reports/deep queries.
- **Private mode:** entries marked private are never sent to OpenAI.
- **pgvector:** `match_entries` RPC for cosine similarity search.

See [PRIVACY.md](./PRIVACY.md) for data handling details.
See [SECURITY.md](./SECURITY.md) for security policy.

---

## Memory profile

- Single sans (Geist) + display (Fraunces 400/600 only)
- No Geist Mono, no variable axes
- `NODE_OPTIONS=--max-old-space-size=2048`
