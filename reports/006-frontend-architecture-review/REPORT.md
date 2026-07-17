# Session 006 — Frontend Architecture Review

**Date:** 2026-07-12
**Phase:** Audit (read-only) — companion to session 005 (backend)
**Status:** Review complete, no code changed
**Method:** 4 parallel read-only agents (rendering/routing/state, design system, frontend-backend contract, performance/bundle) over `web/src` at `798863c`, plus a real `npm run build` executed directly (the performance agent's tool set had no shell access, so its build attempt was not run — this session ran it and folded the real output back in).

---

## Goal

Companion review to [session 005](../005-backend-architecture-review/REPORT.md), covering the client layer: routing/rendering/state architecture, design-system consistency, the frontend-backend type contract, and bundle/performance health. Every finding is tied to a `file:line` and checked against the actual code.

---

## Verdict

The design intent is coherent — real primitives (`Card`, `Modal`, `Drawer`, `Toast`), a real ADR-compliant Cyrillic font system, a real shared type layer (`db.ts` — Zod schema as source of truth). But adoption trails design everywhere, and there is no shared client data/state layer at all. That single gap is the root cause behind four incompatible revalidation mechanisms, 13+ duplicated loading-state triples, and per-feature reinvented forms — the same "design is right, enforcement is partial" shape as the backend review.

---

## Real build evidence (executed this session)

| Check | Result |
|---|---|
| `npm run build` (`next build`, Turbopack) | **Succeeded.** `✓ Compiled successfully in 3.7s`, `✓ Finished TypeScript in 5.5s` — 0 errors. |
| Route classification | **64 of 66 routes are dynamic (ƒ)** — only `/` and `/_not-found` are static. Every `(app)` feature route is server-rendered on demand; zero static-generation benefit anywhere. Consistent with `dynamic = "force-dynamic"` found on every sampled page. |
| Bundle weight | `.next/static` totals **2.3MB**; JS chunks alone total **1.8MB uncompressed across 51 files**. Largest single chunks: 228K, 180K, 136K×2, 112K. Next.js 16's Turbopack build does not print the classic per-route First-Load-JS table (no `@next/bundle-analyzer` installed), so exact per-route attribution of these chunks is `[Not verified]` — the aggregate figures above are real, individual-chunk-to-library attribution is not. |

---

## Findings, ranked

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| 1 | Critical | **No shared `<Button>` primitive exists anywhere** — every button in the app is hand-rolled inline Tailwind/`style`. | `grep "export.*function Button\|export const Button"` → 0 matches; e.g. `src/components/direction/cards.tsx:22-27` |
| 2 | High | **No shared client data/state layer.** Four incompatible revalidation mechanisms coexist with no rule for which to use: `router.refresh()` (13 sites), manual local `useState` splice (habits/tasks/goals), manual re-fetch after mutation, and an untyped global `window.dispatchEvent` pub-sub (~15 sites, no central registry of listeners). | `src/components/direction/TaskDetailDrawer.tsx:93-100` vs `src/components/checkin/CheckInPageClient.tsx:34-39` vs `src/components/inbox/Composer.tsx:235` |
| 3 | High | **A second, incompatible design-token layer** (`src/styles/design-tokens.css`, near-black/pure-white palette) is consumed by exactly one component — `EmptyState.tsx` — shared across **7 feature pages** (direction, tasks, reports, journey, areas, memory, insights), so those empty states visually clash with the rest of the app's warm-dark palette. | `src/styles/design-tokens.css:9-39`; `src/components/EmptyState.tsx:16,21` |
| 4 | High | **9 distinct hand-rolled modal implementations** vs. 1 shared `Modal.tsx` (2 consumers) — each reimplements its own focus-trap/backdrop/`role="dialog"` independently. | `src/components/direction/CreateGoalModal.tsx:227-237`, `src/components/protocols/CreateProtocolModal.tsx:118-121`, 6 more |
| 5 | High | **`CheckInWizard.tsx` locally redeclares `Habit`/`Goal` types** instead of importing the shared, Zod-derived types from `@/types/db` — real drift risk, since the data it actually fetches (`/api/habits`, `/api/goals`) *is* schema-validated server-side using those exact schemas. | `src/components/checkin/CheckInWizard.tsx:20-21,83-90` |
| 6 | High | **Zero client-side runtime validation** of API responses (`grep safeParse src/components` → 0 hits) despite Zod already being a dependency and used for every server response shape in `db.ts`. A server-side field rename/removal produces no client-side signal until a runtime crash. | `src/types/db.ts` (server-only usage) vs any of the 5 sampled fetch sites |
| 7 | High | **`getCurrentUser()` called 3+ times per request** — independently by `proxy.ts` (route gating), 17+ `page.tsx` files (data-scoping), and `UserPill.tsx` (mounted on every page) — with no request-level dedup, unlike its sibling `getSoulState` which IS wrapped in React's `cache()`. | `src/lib/auth.ts:13` vs `src/lib/souls/soulCore.ts:93` |
| 8 | Medium | **`TasksView.tsx` has no error state at all** — a failed/malformed `/api/tasks` response is swallowed by `.catch(() => ({}))` and renders as a silently-empty task list. | `src/components/tasks/TasksView.tsx:26-40` |
| 9 | Medium | **`design/tokens/tokens.json` is orphaned** — zero code consumers anywhere in `web/src`; `globals.css`'s `:root` block was hand-copied from it once and has since diverged (gained `--bg-elev3`, `--shadow-*`, `--cell-*` families with no token equivalent). | `design/tokens/tokens.json` vs `src/app/globals.css:6-46` |
| 10 | Medium | **Raw Tailwind `text-zinc-*` (569 uses across 80 files) outnumbers the actual token utilities `text-muted`/`text-subtle` (256 uses across 113 files)** more than 2:1 — often mixed in the same component. | `src/components/dashboard/RecentSignals.tsx:159` (token) vs `:166` (`text-zinc-600`, raw) |
| 11 | Medium | **Every route is dynamic** (64/66, confirmed by the real build above) — reasonable for a single-user dogfooded MVP where nearly everything is personalized, but worth naming as a deliberate-or-not tradeoff rather than leaving implicit. | `build_output.txt` (this session) |
| 12 | Medium | **`motion` wraps every route eagerly**, not code-split — `PageTransition` wraps all `(app)` route children on every navigation. By contrast, `@xyflow/react` (the heaviest single dependency, used only by the memory graph) IS correctly isolated behind `next/dynamic(ssr:false)`. | `src/components/fx/PageTransition.tsx:2` via `src/app/(app)/layout.tsx:5,20` |
| 13 | Low | Dead duplicate component `src/components/direction/drawer/TaskDetailDrawer.tsx` (thin re-export wrapper around the real implementation, zero importers found); 4 independent hand-rolled form-handling patterns with no shared hook; 12 raw `<img>` tags for Spotify thumbnails (`src/components/sonic/*`) with no `images.remotePatterns` configured in `next.config.ts`. | `src/components/direction/drawer/TaskDetailDrawer.tsx`; `next.config.ts` (no `images` block) |

---

## What's genuinely good (verified, not assumed)

- **Auth gating is centralized correctly.** `src/proxy.ts` is the single source of truth for route protection (17 protected prefixes, redirect-on-fail via `lib/auth.ts:11-12`'s own documented design). The redundant `getCurrentUser()` calls (#7) are a performance issue for data-scoping, not a security gap — this is a distinct, lower-stakes finding than anything in the backend review.
- **`db.ts`'s Zod-schema-as-type pattern is a genuinely good foundation**, imported 75× across the codebase. The gap is adoption at the fetch boundary (#5, #6), not the pattern itself.
- **Task/Goal/Mission/Ritual detail drawers share real behavioral infrastructure** (`useSaveState`, `SaveBar`) — genuinely reused, not reinvented per drawer, despite a confusing duplicate `drawer/` adapter-file layer (#13).
- **Font ADR-010 (Cyrillic support) is fully and correctly implemented** — wired in `layout.tsx`, used in 89 files / 256 occurrences. No compliance gap found.
- **The one client component that's actually computationally expensive (memory graph layout) is properly memoized** (`useMemo`/`useCallback` throughout `MemoryGraphFlow.tsx`), and `@xyflow/react` is correctly isolated behind a dynamic import. The two things that would matter most both passed.
- **Build is clean**: 0 TypeScript errors, successful production compile (verified this session, not assumed from a prior pass).

---

## Fix-first

1. **#2 (shared client data/state layer)** is the highest-leverage fix — it's the root cause behind #6, #8, and the form-pattern fragmentation in #13. Introducing SWR/React Query, or at minimum generalizing the existing `useEntries.ts` pattern, collapses four inconsistent mechanisms into one.
2. **#1 (Button primitive) + #4 (Modal consolidation)** — cheap, mechanical, stops further call sites from adding a 10th modal or another one-off button.
3. **#3 (dead token layer on `EmptyState`)** — one-line repoint to `globals.css` vars, removes a visible cross-page visual inconsistency.
4. **#5 (`CheckInWizard` type drift)** — import from `@/types/db` instead of redeclaring; a five-minute fix with real drift protection payoff.

## Blockers / not verified

- Exact per-route First-Load-JS byte cost (Next 16 Turbopack doesn't print it without `@next/bundle-analyzer`, not installed) — aggregate chunk totals (1.8MB) are real; per-route/per-library attribution is not.
- Whether `CheckInWizard`'s save path dispatches the `shadow:answers:changed` event that `StateMeters` listens for — grepped but not fully traced.
- 7 of the ~24 feature page bodies (`questions`, `reports`, `rituals`, `settings`, `direction`, `journey`, `insights`) were only grepped for `getCurrentUser`, not fully read for data-fetching-pattern classification.

## Next-session entry point

Working list for remediation: findings #1–#7 (Critical/High) here, plus #1–#7 (Critical/High) in [session 005](../005-backend-architecture-review/REPORT.md). Corresponding GitHub issues are filed and linked from the PR that introduces this report.
