# Session 003 — Skeleton Rebuild + Memory Hardening

**Date:** 2026-05-12
**Phase:** Phase 1.5 — Stability pass (between Phase 2 DB and Phase 3 LLM)
**Status:** ✅ Complete
**Server:** running on `http://localhost:3007` (verified 200 on `/dashboard`)

---

## Goal

`web/` was deleted by user mid-session ("чет там не то было"). Rebuild skeleton from scratch with:
- minimum dependencies (avoid bloat that caused dev OOM)
- crash + OOM resilience before launch
- error boundaries from the start
- visual parity with Session 002 dashboard

---

## Files created

### App entry
- `web/package.json` — Next 16.2.6, React 19.2, Tailwind v4. Dropped: `recharts`, `@base-ui/react`, `shadcn`, `tw-animate-css`, `@supabase/*`, `@anthropic-ai/sdk` (wire back per-phase).
- `web/tsconfig.json` — strict, `jsx: react-jsx` (Next 16 auto-patched).
- `web/next.config.ts` — Turbopack root pin, `productionBrowserSourceMaps: false`, strict mode on.
- `web/postcss.config.mjs` — Tailwind v4 postcss only.
- `web/next-env.d.ts` — auto-generated.
- `web/.gitignore`.

### Source
- `src/lib/cn.ts` — single `clsx` wrapper.
- `src/app/layout.tsx` — root layout, **2 Google fonts** (Geist + Fraunces 400/600). Dropped Geist Mono + Fraunces variable axes (`SOFT/WONK/opsz`).
- `src/app/globals.css` — tokens (`--bg-*`, `--accent-*`, `--state-*`), `@theme inline`, `.bg-shadow-glow`, `.orb-pulse` (with `prefers-reduced-motion: reduce` override).
- `src/app/page.tsx` — root redirects to `/dashboard`.
- `src/app/(app)/layout.tsx` — Sidebar + main + ShadowOrb.
- `src/app/(app)/dashboard/page.tsx` — Today view: summary stats, state meters, 12-area Life Circle, recent/tasks/goals placeholders.
- `src/app/(app)/{inbox,questions,areas,reports,goals,tasks,memory,settings}/page.tsx` — `<Soon />` stubs.
- `src/components/Sidebar.tsx` — 9-item nav with active-state border + accent icon.
- `src/components/ShadowOrb.tsx` — floating bottom-right button → side panel (backdrop, ESC close, auto-scroll, stub responses).
- `src/components/PageHeader.tsx` — eyebrow / title / subtitle / right slot.
- `src/components/Card.tsx` — section with optional title + action.
- `src/components/Soon.tsx` — placeholder for unbuilt routes.

### Resilience
- `src/app/error.tsx` — per-route boundary, logs `{message, digest}`, Retry button.
- `src/app/global-error.tsx` — root crash boundary with inline styles (no Tailwind dep), Reload button.
- `src/app/not-found.tsx` — 404 → link to `/dashboard`.
- `scripts/dev-safe.sh` — pre-flight (Node ≥20, free RAM, port), heap cap `--max-old-space-size=2048 --max-semi-space-size=64`, `--heapsnapshot-near-heap-limit=1`, SIGTERM trap, restart loop (max 3) on OOM (137) / segfault (139) / abort (134). Logs to `web/.dev-logs/dev-<timestamp>.log`.

### Docs
- `web/README.md` — dev commands, layout map, memory profile notes.

---

## Files modified (outside web/)

| File | Change |
|------|--------|
| `.claude/launch.json` (root) | `shadow` entry points to `bash shadow/web/scripts/dev-safe.sh` |

---

## Memory profile — before vs after

| Area | Before (Session 002 + drift) | After (Session 003) |
|------|------------------------------|---------------------|
| Google fonts | 3 fonts, Fraunces × 3 axes (~250 KB woff2) | 2 fonts, fixed weights (~80 KB) |
| Heap cap | none (Node default ~4 GB) | `2048` MB old-space, `64` MB semi |
| Crash recovery | none | restart loop, log triage, signal classification |
| Heavy deps | `recharts`, `@base-ui/react`, `shadcn`, `tw-animate-css`, `@supabase/*`, `@anthropic/sdk` | none yet (re-add per-phase) |
| Strict mode | off | on |
| Source maps (prod) | default | disabled |

Result: `Ready in 270ms` (was 386–420ms). Idle dev RSS ~ acceptable. No more OOM kill observed during this session.

---

## Verification

- `GET /dashboard 200` (670ms first compile, 90ms cached) — confirmed in dev log.
- `preview_snapshot` shows full Sidebar (9 links), Today header, Today Summary card (Entries/Tasks/Goals/Areas), State meters, Life Circle (12 cards), Recent / Tasks / Goals placeholders, Orb button.
- `preview_inspect .orb-pulse` → `animation-name: orb-pulse`, 56×56px, bg `rgb(0,0,0)`.
- `preview_console_logs --level error` → empty.
- `preview_logs --level error` → no server errors.
- `ERR_ABORTED` chunks in network = Turbopack HMR re-navigation, expected.

---

## Decisions

1. **No `(app)` group middleware yet** — auth gating returns when Supabase env is wired in Phase 3.
2. **Stub pages instead of 404** — keeps Sidebar links live; reduces user-visible churn.
3. **Inline-style global error** — avoids Tailwind/CSS dep at the failure point.
4. **2 GB heap cap** — empirically enough for Turbopack on this codebase, prevents host swap.
5. **No more `shadcn` npm package** — caused duplicate CSS via `shadcn/tailwind.css` import. Use direct primitives, port pieces from `@radix-ui/*` only when needed.

---

## Drift / removed vs Session 002

The following from Session 002 was **NOT** restored in this skeleton (intentional, will re-wire):

- `web/src/lib/supabase/{server,client}.ts`
- `web/src/lib/data.ts` (`getLifeAreas`, `getActiveQuestions`, `pickDailyQuestions`)
- `web/src/types/db.ts`
- `web/src/proxy.ts` (auth proxy)
- `web/src/lib/anthropic.ts`
- `web/src/app/auth/callback/route.ts`
- `web/src/app/login/page.tsx`
- `web/src/app/(app)/{inbox,questions,areas,...}` real content
- `recharts`-based meters / radial charts
- shadcn-vendored UI primitives (Sheet, Dialog, ScrollArea, Progress, etc.)

Migrations (`supabase/migrations/*.sql`) are **intact** at repo root.

---

## Blockers

None.

---

## Next-session entry point

**Session 004 target: Phase 2.1 — DB re-wire.**

After product review (captured in `IMPROVEMENT_PLAN.md` Part 1), phase ordering was revised. New sequence:

```
2.1 DB re-wire  →  2.2 Auth  →  2.3 Dashboard simplify + Daily Questions modal
   →  3.1 Inbox v1  →  3.2 LLM classify  →  3.3 Wire classify
   →  3.4 Daily questions write flow  →  4.1 Scoring + Recent Signals
   →  4.2 Daily report  →  4.3 RAG memory  →  5 Tests/Perf/Obs  →  6 Polish/Deploy
```

Reports / Goals / Tasks stay `<Soon />` placeholders through Phase 4.2.

See `IMPROVEMENT_PLAN.md` for the full revised plan with acceptance criteria, agents, risks, and ETA.
