# ADR-013: SWR for shared server-data state; keep the rest as-is

**Status:** Accepted, partial rollout
**Date:** 2026-07-16
**Deciders:** @eduardshatalov

## Context
The frontend architecture review (`reports/006-frontend-architecture-review/REPORT.md`, issue #11)
found four different, incompatible mechanisms handling "the UI needs to reflect a mutation," with
no rule for which to use:

1. `router.refresh()` — 13 sites.
2. Manual local `useState` splice via callback prop (`TaskDetailDrawer.tsx` → `TasksView.tsx`).
3. Manual re-fetch after mutation (`InitiativesWidget.tsx`, `CheckInPageClient.tsx`).
4. A global, untyped `window.dispatchEvent(new CustomEvent(...))` pub-sub — ~15-18 files dispatch
   or listen to ad-hoc event names with no central registry of who listens to what.

Only one pattern was actually shared: `lib/entries/useEntries.ts`, reused by 8 consumers. Three of
those consumers (`GoalsView`, `TasksView`, `DirectionView`) independently re-implemented the *same*
`fetch("/api/goals")` / `fetch("/api/tasks")` / `fetch("/api/missions")` calls — three separate
network requests for identical data, with zero consistency between them: editing a goal from
`DirectionView` didn't show up in `GoalsView` until its own next mount.

## Decision
Adopt **SWR** as the one shared primitive for data that's fetched via a GET API route and needs
cross-component consistency. `lib/entries/useEntries.ts` and the new `lib/direction/useDirectionData.ts`
(`useGoals`/`useMissions`/`useTasks`) are now SWR-backed. Mutations call `mutate()` with an updater
function and `revalidate: false` — this preserves the existing instant-optimistic-update UX (no
extra round trip) while writing to the *shared* cache, so the update is visible in every consumer
immediately, not just the component that made the call.

**This is a partial rollout, not a full migration** — see Consequences.

## Alternatives Considered
- **TanStack Query** — more powerful (built-in mutation lifecycle, devtools) but a heavier API
  surface and steeper migration for an app this size; rejected in favor of the smaller primitive
  that's the closest fit to the one pattern (`useEntries.ts`) that was already working.
- **Generalize `useEntries.ts`'s hand-rolled pattern instead of adding a dependency** — rejected:
  it doesn't solve cross-component cache sharing (the actual bug found in Goals/Tasks/Direction)
  without reinventing a chunk of what SWR already does correctly.
- **Migrate all 4 mechanisms in one pass** — rejected as too large for one PR. Scoped to the
  concrete, demonstrable case (Goals/Missions/Tasks triple-fetch) plus generalizing the one
  hook the issue named directly, rather than rewriting ~35 files' revalidation logic at once.

## Consequences
- **Positive:** `GoalsView`, `TasksView`, `DirectionView` now share one fetch per resource instead
  of three independent ones. A goal edited in any of the three is now consistent everywhere,
  immediately — this was a real bug before this ADR, not just duplicated network calls.
- **Positive:** `useEntries.ts`'s 8 consumers get the same benefit for free — the four
  `useEntries(200)` callers (`EntryList`, `AreasView`, `AreaCard`, `AreaGallery`) now share one
  cached fetch instead of four independent ones.
- **Negative / scope left open:** `router.refresh()` (13 sites), the manual-re-fetch pattern
  (`InitiativesWidget.tsx`, `CheckInPageClient.tsx`), and the `window.dispatchEvent` pub-sub
  (~15-18 files, various unrelated event names — check-in state, mood/area state, settings) are
  **untouched by this ADR**. They are not necessarily wrong for what they do (a lot of that pub-sub
  traffic isn't "shared server data" at all — it's local UI-open/close signaling, which SWR doesn't
  replace). Migrate case-by-case as those specific views get touched, not as a blanket follow-up.
- **Neutral:** one new dependency (`swr`, MIT license, ~5KB gzipped, zero transitive runtime deps
  beyond `dequal`/`use-sync-external-store`).

## References
- `reports/006-frontend-architecture-review/REPORT.md`
- [Qalipso/Shadow-AI-Second-Brain#11](https://github.com/Qalipso/Shadow-AI-Second-Brain/issues/11)
- `src/lib/entries/useEntries.ts`, `src/lib/direction/useDirectionData.ts`
