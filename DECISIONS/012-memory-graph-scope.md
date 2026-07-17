# ADR-012: Memory graph is visualization-only, for now

**Status:** Accepted
**Date:** 2026-07-16
**Deciders:** @eduardshatalov

## Context
The memory-layer architecture review (`reports/007-memory-layer-architecture-review/REPORT.md`,
issue #20) found a real, DB-enforced typed graph — `memory_graph_nodes` / `memory_graph_edges`,
15 node types, 10 edge types, `CHECK` constraints mirrored exactly by Zod enums in the synthesizer
(double-gated: Zod at write time, `CHECK` at DB time) — plus a dedicated React Flow visualization
at `/memory`.

But `buildMemoryContext` (`src/lib/memory/context.ts`) and `buildAIBrainContext`
(`src/lib/ai-brain/context.ts`) only ever read `entries` (via `match_entries`) and
`life_area_scores`. A repo-wide grep across `lib/ai-brain/*` and `lib/memory/context.ts` for
`memory_graph_nodes|memory_graph_edges` finds zero references outside the file that writes the
graph (`ai-brain/synthesizer.ts`) and the file that reads it back for UI display
(`lib/memory/graph.ts` → `MemoryGraphZone`). The graph is real infrastructure — built, but
decorative from the AI's own perspective. It informs nothing the model says.

Two ways to close that gap:
1. **Wire it into AI context** — pull relevant nodes/edges into `buildMemoryContext` so synthesis
   and chat actually use what's been built.
2. **Scope it down deliberately** — keep it as a user-facing visualization, stop growing its
   type/relation taxonomy as if it feeds intelligence, and say so explicitly instead of leaving
   the gap implicit.

## Decision
Option 2, for now. The memory graph is a **visualization-only** feature. It is not fed into any
LLM prompt, and no code should assume it is.

## Alternatives Considered
- **Wire a minimal slice into `buildMemoryContext`** (top-N most-relevant nodes/edges for the
  current query) — rejected for this pass: real prompt-engineering work, a genuine token-cost
  increase on every graph-consuming call, and its own correctness risk (irrelevant graph context
  degrading answers) that needs its own eval pass before shipping, not a drive-by fix alongside
  8 unrelated issues.
- **Leave it undocumented** (status quo) — rejected: `ARCHITECTURE.md` didn't mention the graph
  at all before this ADR, so a reader had no way to know its scope was undecided rather than
  intentional.

## Consequences
- **Positive:** the gap between "what's built" and "what the AI actually uses" is now a stated
  decision, not a silent one. `ARCHITECTURE.md` §3 now says so directly.
- **Negative:** the graph's 15 node types / 10 edge types keep costing write-side complexity
  (synthesizer prompt, Zod validation, `CHECK` constraints) without paying that back in AI
  behavior. If that taxonomy keeps growing under this ADR, that growth itself becomes suspect —
  revisit this decision rather than let it silently expand.
- **Neutral:** the React Flow visualization at `/memory` is unaffected and remains the graph's
  only real consumer.

## References
- `reports/007-memory-layer-architecture-review/REPORT.md`
- [Qalipso/Shadow-AI-Second-Brain#20](https://github.com/Qalipso/Shadow-AI-Second-Brain/issues/20)
- `src/lib/memory/context.ts`, `src/lib/ai-brain/context.ts`, `src/lib/memory/graph.ts`
