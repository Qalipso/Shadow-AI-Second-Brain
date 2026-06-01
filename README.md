# Shadow — AI Second Brain

> An external cognitive layer that absorbs chaotic life input, structures it, links it to long-term memory, surfaces patterns, and guides decisions.

**Not** a task manager. **Not** a journal. **Not** a habit tracker. **Not** a Notion clone.

Shadow is an interface to your own *shadow* — hidden patterns, overloads, desires, repeating mistakes, direction.

---

## Vision

Most tools store what you tell them. Shadow tries to *understand* it.

The long-term bet: a personal cognitive layer that grows a structured model of who you are — your values, goals, projects, people, emotional loops, risks — from the messy stream of daily life, and reflects it back when it matters. Not another place to file things; a system that remembers, connects, and notices on your behalf.

**Goal:** reduce the cognitive cost of self-management to near-zero at the point of capture, and convert scattered input into compounding self-knowledge over time.

**Principles of the vision:**
- **Effortless in, structured out** — you dump raw thought; Shadow does the organizing.
- **Memory that compounds** — every capture enriches a typed memory + knowledge graph, not a flat log.
- **Reflection, not surveillance** — patterns are surfaced as hypotheses to consider, never verdicts. Inferred ≠ confirmed.
- **You own the model** — your data, your graph, deletable and exportable; secrets never leave the server.

---

## Status

`MVP` · single-user · text-first · dogfooded daily

| Module | Status |
|--------|--------|
| Inbox (AI capture) | ✅ Live |
| Auto-classification | ✅ Live |
| 12 Life Areas wheel | ✅ Live |
| Daily check-in | ✅ Live |
| Daily report | ✅ Live |
| Weekly review | ✅ Live |
| RAG memory (pgvector) | ✅ Live |
| Shadow Brain (memory synthesizer) | ✅ Live |
| Memory Graph (typed knowledge graph) | ✅ Live |
| ShadowOrb chat | ✅ Live |
| Interventions (4 tools) | ✅ Live |
| Labs (self-knowledge tests) | ✅ Live |
| Direction (missions/tasks) | ✅ Live |
| Rituals | ✅ Live |
| Sonic Mirror (Spotify) | ✅ Live |
| Voice capture | ⏳ Backlog |
| Mobile app | ⏳ Backlog |
| Multi-user | ⏳ Backlog |

---

## What It Does

```
You write anything → Shadow classifies → Shadow stores → Shadow remembers → Shadow asks back
```

### Capture
One textarea. Type whatever's in your head. No fields, no tags, no folders. Shadow parses it into structured entities (task, mood, idea, observation, decision, blocker, win) and routes to the right life area.

### Memory
Every entry is embedded (`text-embedding-3-small`) and stored in `pgvector`. ShadowOrb queries semantic similarity + time decay to bring back relevant past context when answering questions.

### Shadow Brain — memory synthesizer
A dedicated AI entity that runs after each capture (and on demand). It turns raw entries into three layers of durable memory:
- **Typed memory items** — 8 layers: `profile · behavioral · preference · relationship · goal · current_state · insight · episodic`
- **Graph nodes** — 15 entity types (values, goals, projects, people, habits, emotions, patterns, risks…), deduplicated by label
- **Graph edges** — 10 relation types (`supports · blocks · triggers · causes · belongs_to · contradicts · related_to`…)

It also cross-links new memory to semantically similar past entries via pgvector, so connections form across time that a single pass can't see. A junk/injection filter keeps test noise and prompt-injection strings out of the model, and everything inferred is tagged as a hypothesis (`inferred`) vs user-confirmed fact.

### Memory Graph
An interactive React Flow visualization of the knowledge graph above — typed nodes clustered by kind, relation-colored labeled edges, click any node to inspect its type, weight, and connections. Falls back to a capture-by-life-area view before the brain has synthesized anything.

### Patterns
Daily report at end of day. Weekly review every Sunday. Surfaces:
- What dominated your week
- Areas that lit up vs went dark
- Repeating mistakes
- Suggested next moves

### Interventions
Four AI-powered "stuck unsticking" tools:
- **Task Paralysis Shatter** — breaks frozen tasks into tiny steps
- **Dopamine Menu** — energy-matched activity buffet
- **Context Switch** — physical/sensory/mental transition ritual
- **Interest Filter** — turns boring work into themed quest

### Labs
Structured self-knowledge modules (Big 5 personality, values, current state). Feeds AI personalization layer.

### Sonic Mirror
Spotify integration. Reads your listening as emotional signal. Detects mood shifts, repeats, dominant genres → injects into Shadow's understanding of your state.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind v4 + custom design tokens |
| Database | Postgres (Supabase) |
| Vector store | pgvector + `text-embedding-3-small` |
| Auth | Supabase Auth (email + magic link) |
| LLM routing | `gpt-4o-mini` (default), `gpt-4o` (deep) |
| Animation | Framer Motion |
| Graph UI | React Flow (`@xyflow/react`) |
| Fonts | Geist + Fraunces |
| Testing | Vitest (unit) + Playwright (E2E) |
| Deploy | Vercel |

---

## Repository Layout

```
shadow/
├── web/                  Next.js application
│   ├── src/app/          App Router pages + API routes
│   ├── src/components/   Feature-grouped React components
│   ├── src/lib/          Server-only utilities, RAG, LLM, Supabase
│   ├── src/ai/prompts/   System prompts per pipeline
│   └── tests/            Vitest + Playwright suites
├── supabase/             Migrations + config
├── db/                   Schema documentation + seeds
├── ai/                   Prompt versions + RAG architecture
├── docs/                 PRD, personas, IA, user flows, metrics
├── design/               Tokens, design brief
├── Branding/             Positioning, messaging, audience, page architecture
├── planning/             Roadmap, sprints, backlog, events tracking
├── reports/              Phase implementation reports
├── case-study/           Portfolio output
├── DECISIONS/            Architecture decision records (ADRs)
├── FLOWS/                Sequence diagrams + user flow walkthroughs
├── ARCHITECTURE.md       System design overview
├── ROADMAP.md            Sprint planning + horizons
├── CHANGELOG.md          Release notes
├── CONTRIBUTING.md       Dev setup + conventions
└── README.md             You are here
```

---

## Quick Start

### Prerequisites
- Node.js 20+ (use `nvm`)
- Supabase CLI
- OpenAI API key
- Spotify API credentials (optional, for Sonic Mirror)

### Setup
```bash
cd shadow/web
npm install

# Copy and fill env
cp .env.local.example .env.local
# Required:
#   NEXT_PUBLIC_SUPABASE_URL=
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=
#   SUPABASE_SERVICE_ROLE_KEY=
#   OPENAI_API_KEY=
#   MAX_DAILY_LLM_USD=1.50
```

### Database
```bash
cd shadow/supabase
supabase db push                 # apply migrations
psql -f db/seeds/life_areas.sql  # seed 12 life areas
```

### Dev
```bash
cd shadow/web
npm run dev    # http://localhost:3007
```

### Test
```bash
npm run test         # vitest
npm run test:e2e     # playwright
npm run typecheck    # tsc --noEmit
```

---

## Documentation Map

| Document | What's inside |
|----------|---------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System overview, data flow, module breakdown |
| [DECISIONS/](./DECISIONS/) | Why we chose each piece of the stack (ADRs) |
| [FLOWS/](./FLOWS/) | Sequence diagrams for capture, RAG chat, interventions |
| [ROADMAP.md](./ROADMAP.md) | Phase plan, sprint goals, post-MVP horizons |
| [CHANGELOG.md](./CHANGELOG.md) | Release notes per sprint |
| [docs/PRD.md](./docs/PRD.md) | Full product requirements doc |
| [docs/personas.md](./docs/personas.md) | Target user archetypes |
| [docs/user-flows.md](./docs/user-flows.md) | End-to-end user journeys |
| [docs/information-architecture.md](./docs/information-architecture.md) | Page + nav structure |
| [docs/metrics.md](./docs/metrics.md) | What we measure + targets |
| [docs/risks-tradeoffs.md](./docs/risks-tradeoffs.md) | Known risks, mitigations |
| [docs/competitive-landscape.md](./docs/competitive-landscape.md) | Adjacent tools + differentiation |
| [ai/rag/memory-architecture.md](./ai/rag/memory-architecture.md) | RAG pipeline design |
| [ai/prompts/](./ai/prompts/) | All system prompts (versioned) |
| [Branding/PositioningDoc.md](./Branding/PositioningDoc.md) | Positioning statement |
| [Branding/messaging.md](./Branding/messaging.md) | Voice, tone, copy library |

---

## Core Principles

1. **Capture over categorize** — user types freely, AI organizes
2. **One textarea is the UI** — minimize cognitive load at entry point
3. **Memory > storage** — every entry becomes a queryable vector
4. **Reflection > tracking** — daily/weekly mirrors surface patterns
5. **Cost-aware AI** — model routing + hard daily cap per user
6. **Server-only secrets** — RAG, LLM, embeddings never imported in client
7. **Immutable data** — new objects, never mutate

---

## License

MIT — see [LICENSE](./LICENSE).
