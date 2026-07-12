# Session 007 — Memory-Layer Architecture Review

**Date:** 2026-07-12
**Phase:** Audit (read-only) — third companion to sessions 005 (backend) and 006 (frontend)
**Status:** Review complete, no code changed
**Method:** 4 parallel read-only agents (data model & pipeline, Shadow Brain synthesizer, memory API contract, graph UI consumption) over the "memory" subsystem — `entries.embedding`/`memory_items`/`memory_graph_{nodes,edges}` schema, `lib/ai-brain/*` (1,558 lines, unread by both prior reviews), 5 memory-writing API routes, and the memory/graph UI. Every claim is file:line-verified.

---

## Goal

Both prior reviews flagged "three unlinked memory subsystems" as a Medium finding without going deep. This session goes deep: is the memory subsystem's data model sound, does the AI synthesis pipeline (never read in depth before) actually do what `reports/004-memory-graph-sonic-brain/REPORT.md` claims, do the 5 memory-writing API routes share a contract, and does the frontend correctly and transparently surface what the backend builds?

---

## Verdict

The memory subsystem was over-built and under-integrated. A real, DB-enforced typed graph exists (15 node types, 10 edge types, double-gated by matching Zod schemas — genuinely solid engineering, not marketing copy) — but the AI itself never reads the graph back into any prompt. Five independent code paths write to `memory_items` with no shared contract, at least one of them (checkin) is confirmed broken by a schema mismatch and silently swallows its own errors, and an entire UI panel (`MemorySearch`) was fully built and never wired up. The graph, the memory-search panel, and the AI's own citations all exist as artifacts nobody downstream actually consumes.

---

## Findings, ranked

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| 1 | Critical | **Checkin-derived memory writes are silently and permanently broken.** `src/app/api/checkin/route.ts:144-156` upserts on `onConflict: "user_id,date,memory_type"` — but `memory_items` has no `date` column in any migration, and the insert omits `title`, which is `NOT NULL`. Wrapped in `try{}catch{ // non-critical }` — the error is swallowed every time, with zero visible signal. | `checkin/route.ts:141,144-159` vs `supabase/migrations/20260520_labs.sql:105-117` |
| 2 | Critical | **A second, fully ungated LLM cost surface** (independent of the one found in session 005). `POST /api/profile/ai-summary/regenerate` makes real gpt-4o + gpt-4o-mini calls with no `isOverDailyCap` and no rate limit — its own sibling route (`brain/synthesize`) enforces both. Its logged cost is also a hardcoded estimate (`estimateCostUsd(MODELS.daily_report, 1500, 600)`), not real token usage. | `regenerate/route.ts:1-8` (imports omit both guards) vs `brain/synthesize/route.ts:47-65` |
| 3 | High | **The entire memory graph is never fed back into any AI prompt.** `buildMemoryContext`/`buildAIBrainContext` read only `entries` (via `match_entries`) + `life_area_scores` — grep across `lib/ai-brain/*` and `lib/memory/context.ts` finds zero references to `memory_graph_nodes`/`edges` outside the file that writes them. A 15-type/10-relation typed graph, a dedicated React Flow visualization, and real DB constraints — built, but decorative from the AI's own perspective. | `lib/ai-brain/context.ts:199`, `lib/memory/context.ts:63-144` |
| 4 | High | **Batch-mode synthesis has no idempotency.** Two back-to-back `POST /api/brain/synthesize` calls (empty body) pull the same up-to-14 entries both times, insert duplicate `memory_items` rows, and double LLM spend. Single-entry mode *is* correctly guarded — pre-checks `source_id` before calling OpenAI at all. | `lib/ai-brain/synthesizer.ts:144-153` (no exclusion filter), `:238-241` (plain insert) |
| 5 | High | **No shared memory-write helper — 5 independent insert paths**, each with its own field mapping and dedup strategy: `memory/items` POST, the synthesizer, `interventions/save-memory`, `checkin`, `labs`. `memory_type` silently defaults to `'insight'` for 2 of the 5 (items-POST, save-memory never set it). | `memory/items/route.ts:45-58`, `synthesizer.ts:226-241`, `interventions/[id]/save-memory/route.ts:165-183`, `checkin/route.ts:113-156`, `lib/labs/queries.ts:173-181` |
| 6 | High | **Provenance is spoofable.** `source_type` — the only signal distinguishing user- vs. AI-authored memory — is unrestricted free-text on the user-facing `POST /api/memory/items`; nothing stops a client from claiming `source_type: "brain_synthesis"`. | `memory/items/route.ts:13` |
| 7 | High | **No DB-level dedup on graph nodes/edges** — a SELECT-then-INSERT pattern with no `UNIQUE` constraint, despite the exact right pattern (`UNIQUE(user_id, source_type, source_id)`) already being used elsewhere in this same codebase (`soul_core.sql:37`). Race-prone under concurrent synthesis. Compounded by the node-dedup key excluding `node_type` (`graph.ts:38-40`) — a label re-emitted later under a different type never updates the type, only `data_json`. | `lib/memory/graph.ts:34-46,96-106` |
| 8 | High | **`AskShadow.tsx` discards its own source citations.** The API returns `cited_entries` (which entries grounded the answer) and the client even types it — the render never shows it. Users see LLM prose + a confidence % with no way to verify what memory it actually drew from. | `AskShadow.tsx:80-96` vs `api/memory/ask/route.ts:185` |
| 9 | High | **`MemorySearch.tsx` is fully implemented but never rendered anywhere** — not imported by the memory page, not linked from anywhere in the app. A dead panel; its semantic-search capability (distinct from `ask`'s conversational RAG) is unreachable by any user. | `MemorySearch.tsx:94` (only self-reference in a repo-wide grep) |
| 10 | Medium | **`brain/synthesize` has two undocumented triggers sharing one endpoint** — a manual "Rebuild Brain" button (batch) and a silent fire-and-forget call after *every* classify (`void fetch(...)`, errors invisibly discarded). | `MemoryGraphZone.tsx:55-58` vs `api/classify/route.ts:319` |
| 11 | Medium | **One LLM call is invisible to the cost ledger** (single-entry mode's cross-linking embedding) — silently under-counts every future cap check; plus **junk-filter false positives permanently exclude legitimate entries** with zero user-visible signal (patterns like `/\btest\s+(message\|entry)\b/i` match ordinary language). | `synthesizer.ts:281,307-309`; `junk-filter.ts:16-17` |
| 12 | Medium | **Graph type→visual mapping has real collisions** (15 node types render as 12 distinct colors, 10 edge types as 6 — worst case a 3-way collision) with no shape/icon fallback; two structurally different graphs (clustered vs. raw-entry fallback) render depending on synthesis state with no in-canvas indicator of which mode you're viewing. | `MemoryGraphFlow.tsx:46,58/53,59/50,60` (node) · `:194-196` (edge) |
| 13 | Low | `MemoryItemsSection.tsx` bypasses its own `GET /api/memory/items` route (direct Supabase query, divergent field set) and duplicates the auth lookup; 3 dead files (`initiatives.ts`/`patterns.ts`/`context.ts`'s consumer) duplicate logic the *live*, properly cost-capped route (`checkin/generate-initiative`) already reimplemented independently; "Rebuild Brain" has no confirmation dialog beyond an in-flight disable guard. | `MemoryItemsSection.tsx:41-55`; `lib/ai-brain/initiatives.ts:87` (never called) |

---

## What's genuinely good (verified, not assumed)

- **The "8 layers / 15 entity types / 10 relations" claim is real and DB-enforced** — `CHECK` constraints on `memory_type`/`node_type`/`edge_type` in the migrations, mirrored exactly by Zod enums in the synthesizer, so LLM output is double-gated (Zod at write time, `CHECK` at DB time). This refutes the working skepticism the review agents were briefed with — it's not marketing copy.
- **Single-entry synthesis idempotency is correctly guarded** — pre-checks `source_id` existence before making any OpenAI call at all, so a double-click/retry on incremental synthesis is genuinely safe.
- **`ask` vs `search` is a legitimate, non-redundant split** — both retrieve from the same `match_entries` RPC, but `search` returns raw ranked matches while `ask` synthesizes a cited answer. Confirmed clean boundary, not duplication (independent of #9's dead-UI finding — the API-level split is sound even though one of its two frontend consumers isn't wired up).
- **RLS backstops `memory_items`** regardless of any route-layer bug — owner-scoped, DB-enforced.
- **No direct OpenAI client construction anywhere in `ai-brain/*`** — the `lib/llm.ts` wrapper discipline holds even in this deep, previously-unread code.
- **The one client component doing real computation (graph layout, `MemoryGraphFlow.tsx`) is properly memoized** — confirmed by session 006 and not re-litigated here.

---

## Fix-first

1. **#2 (ungated `regenerate` route)** — same bug class as session 005's `/api/embed` finding; add the identical guard block used in `brain/synthesize/route.ts:47-65`. The only finding here with a live, unbounded real-money exposure.
2. **#1 (broken checkin upsert)** — schema fix (add the missing column + a real unique index, populate `title`), and stop swallowing the error. Currently silently failing on every checkin.
3. **#3 (graph never consumed)** is an architecture decision, not a bug to patch reflexively — either wire the graph into `buildMemoryContext` so the AI actually uses what it built, or consciously scope it down to a visualization-only feature and stop growing it as if it feeds intelligence.
4. **#5 (no shared write helper)** is the same root-cause shape as session 006's "no shared frontend data layer" finding — one `lib/memory/write.ts` collapses 5 ad hoc paths into one.

## Blockers / not verified

- Whether an answered `ai_question_answers` row ever becomes a new `entries` row (would close the knowledge-gap → question → entry → gap feedback-loop question definitively) — not found in the files read this session.
- `src/ai/prompts/memory-synthesis.ts` prompt content — not read; prompt-injection resistance of the synthesis call itself (distinct from the chat-prompt injection risk found in session 005) is unverified at the prompt-text level.
- Whether the checkin upsert's schema mismatch (#1) has ever been observed live (no live DB in this read-only pass) — the finding is schema-and-code-level, unambiguous from DDL alone, but not a captured stack trace.

## Next-session entry point

Working list for remediation across all three sessions: #1–#7 (005, backend) + #1–#7 (006, frontend) + #1–#9 (007, this session, 2 Critical/7 High). Corresponding GitHub issues are filed and linked from the PR that introduces this report.
