# Session 004 — Memory Graph, Sonic Fix, Shadow Brain + Phase 2

**Date:** 2026-06-01
**Phase:** Phase 4+ — Memory visualization + AI memory layering
**Status:** ✅ Shipped to production (app.shatalov.dev)
**Server:** Vercel production + local `http://localhost:3007`

---

## Goal

Four threads in one session:
1. Fix functional bugs from QA pass (BUG-01..05).
2. Replace the placeholder Memory Graph with a live, data-driven React Flow graph.
3. Fix Spotify "connected but shows disconnected" bug.
4. Build a "Shadow Brain" AI entity that synthesizes raw captures into typed memory layers + a real knowledge graph, then extend it (Phase 2).

---

## Commits (this session)

| Hash | Summary |
|------|---------|
| `feac9a4` | BUG-01..05 — char counter, classify UX, hydration warnings |
| `7fc9e2a` | Live React Flow memory graph (replaces SVG placeholder) |
| `9a15073` | Sonic Mirror compact cards show connected state |
| `e93f13f` | Shadow Brain memory synthesizer + typed memory graph |
| `84ac44b` | Phase 2 — archetype engine, semantic edges, richer node panel |

(Prior VIS-01..08 visual fixes committed earlier in the day.)

---

## Work delivered

### A. Functional bug fixes (`feac9a4`)
- **BUG-01/02** — char counter based on `text.trim().length`; Capture button enables at exactly 8000 chars.
- **BUG-03/05** — classify retry once on 502/503 (1.5s), friendly messages on 429/other, Dismiss button, auto-clear on new input.
- **BUG-04** — `suppressHydrationWarning` on `relativeTime`/`dayLabel` in `EntryList`, `CheckInPageClient`, `MemoryTimeline`.

Files: `components/inbox/Composer.tsx`, `components/inbox/EntryList.tsx`, `components/checkin/CheckInPageClient.tsx`, `components/memory/MemoryTimeline.tsx`.

### B. Live React Flow memory graph (`7fc9e2a`)
- Installed `@xyflow/react`.
- `components/memory/MemoryGraphFlow.tsx` — radial graph: YOU center, life-area hubs in ring, entry dots orbiting, color-coded, click → detail panel. Lazy-loaded `ssr:false`.
- `components/memory/MemoryGraphZone.tsx` — wrapper, dynamic import.
- `app/(app)/memory/page.tsx` — passes real `entries` + `areas`.

### C. Sonic Mirror connection fix (`9a15073`)
- Root cause: compact cards (Insights `SonicMirrorModule`, Memory `MusicProfileCard`) read legacy `music_profiles` (never written by current OAuth flow). Full Sonic page reads `spotify_connections` (correct).
- Fix: `getMusicProfile()` falls back to synthesizing a profile from `spotify_connections` + `spotify_artist_items` when legacy table is empty.
- File: `lib/music/data.ts`.

### D. Shadow Brain memory synthesizer (`e93f13f`)
New AI entity turning raw captures into 3 memory layers:
- typed `memory_items` (8 layers)
- `memory_graph_nodes` (15 entity types, dedup by label)
- `memory_graph_edges` (10 relations, idempotent)

Files created:
- `lib/ai-brain/synthesizer.ts` — core (single-entry incremental + batch), gpt-4o, strict Zod.
- `lib/ai-brain/junk-filter.ts` — drops test/QA/injection rows before LLM.
- `ai/prompts/memory-synthesis.ts` — prompt (+ injection defense: capture text is data, never instructions) + schema version.
- `app/api/brain/synthesize/route.ts` — POST `{ entry_id? }`, auth + rate limit + cost cap.

Files modified:
- `lib/memory/graph.ts` — `createEdgeIfAbsent` (idempotent edges).
- `app/api/classify/route.ts` — auto-trigger synthesize after capture (fire-and-forget, alongside embed + score-areas).
- `components/memory/MemoryGraphFlow.tsx` + `MemoryGraphZone.tsx` — render real typed graph (cluster by node_type, relation-colored labeled edges); fall back to entry-area graph when brain empty; **Rebuild Brain** button.
- `app/(app)/memory/page.tsx` — fetch `getUserGraph`.

### E. Phase 2 (`84ac44b`)
- **2A — Archetype/metrics engine.** `getMusicProfile` fallback runs existing `analyzeProfile()` over Spotify items → scores + `sonic_archetype` + `current_sound_state` + dominant genres. (`lib/music/data.ts`)
- **2C — Semantic cross-linking.** Synthesizer embeds each new entry → `match_entries` (pgvector) → links its nodes to nodes from semantically similar past entries via `related_to` edges. (`lib/ai-brain/synthesizer.ts`)
- **2B — Richer detail panel.** Brain nodes show type tag, importance weight (●●●○○), incoming/outgoing relations; entry nodes show life area + emotion intensity. (`components/memory/MemoryGraphFlow.tsx`)

---

## Decisions

- **No schema migration** — all target tables/columns already existed (`memory_items.memory_type`, `memory_graph_nodes/edges`). Idempotency via existing `source_id` + guarded edge create.
- **Auto-after-capture trigger** chained off `/api/classify` (same pattern as embed/score-areas), incremental per entry. Batch mode behind Rebuild button.
- **Archetype = deterministic compute on read** (no new LLM, no write) — always fresh, reuses `lib/music/analysis.ts`.
- **Injection handling** — stored injection strings treated as inert data; junk filter + prompt rule keep them out of the LLM.

---

## Verified on production (Chrome)

- Memory graph renders real entry data (38 captures, 12 areas).
- Sonic cards show connected state + archetype ("Creative Chaos" / "The Chaos Alchemist").
- Rebuild Brain: produced 6 nodes · 3 links · memory items; junk rows excluded.
- Semantic edge confirmed: "Demo anxiety" →related to→ "Ship Shadow v0.2".
- Detail panel: type tag, weight dots, relations list.

---

## Blockers / known gaps

- Spotify token reports `expired` via status API (no refresh-on-read). Sonic page still serves last-synced data. Not blocking; flagged for follow-up.
- Brain graph is sparse because most stored entries are QA/test data (correctly filtered). Real usage will grow it via auto-synthesis.
- Auto-synthesis cost: 1 gpt-4o call + 1 embedding per capture. Capped by `MAX_DAILY_LLM_USD`. Watch ledger under heavy capture volume.

---

## Next-session entry point

Sonic Adventure UI (separate from Phase 2): hero with metric bars, Sonic Map zones, Party/roles. Optional: Spotify token refresh-on-read; weekly profile snapshots for the 4-week arc.

See `TEST_CHECKLIST.md` in this folder for results awaiting verification.
