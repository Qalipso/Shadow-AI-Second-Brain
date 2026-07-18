# ADR-014: Modular monolith with an enforced domain/infra boundary (not microservices)

**Status:** Proposed
**Date:** 2026-07-12
**Deciders:** @eduardshatalov

## Context

Three independent architecture reviews (backend/frontend/memory-layer — PR #1, #9, #17)
converged on the same shape of gap, in three different parts of the codebase: the code
that talks to Supabase and the code that holds business rules are not separated by any
enforced boundary, so the same kind of write or read gets reimplemented independently
wherever a feature happens to need it.

Concretely, filed and open:
- **[#22](https://github.com/Qalipso/Shadow-AI-Second-Brain/issues/22)** — 5 independent
  code paths insert into `memory_items` (`app/api/memory/items/route.ts`,
  `lib/ai-brain/synthesizer.ts`, `save-memory/route.ts`, `app/api/checkin/route.ts`,
  `lib/labs/queries.ts`), each with its own field mapping; 2 of them never set
  `memory_type`, silently misclassifying every memory they write under the DB column
  default (`'insight'`).
- **[#23](https://github.com/Qalipso/Shadow-AI-Second-Brain/issues/23)** — `source_type`
  on a memory item is whatever string the calling route passes; nothing constrains it to
  the actual set of legitimate sources.
- **[#11](https://github.com/Qalipso/Shadow-AI-Second-Brain/issues/11)** (frontend,
  companion review) — 4 incompatible client-side revalidation mechanisms: the same root
  cause on the other side of the API boundary, no shared client data layer between
  presentation and the API.

This isn't a new problem class for this codebase — **[ADR-006](./006-server-only-secrets.md)**
already drew one boundary well (server-only vs. client-safe modules, enforced by Next.js
at build time). What's missing is a second, orthogonal boundary *within* server code:
domain rules vs. infrastructure calls.

Constraints any answer has to respect: **one developer**, a portfolio-project timeline
(weeks, not quarters), Vercel serverless deploy (**[ADR-001](./001-nextjs-supabase-stack.md)**),
and moderate, single-tenant-per-request load — this is a personal AI second-brain, not a
multi-tenant SaaS under scaling pressure. The app is also already shipped and in daily use;
any answer has to be adoptable incrementally, not a stop-the-world rewrite.

## Decision

Keep the single Next.js deployable (ADR-001, ADR-004 unchanged). Add one enforced internal
boundary — **presentation → domain → infra** — in the same "boundary marker, build-time
checkable" spirit as ADR-006's `server-only` split, not a new tool or a new deploy target.

- **Presentation** (`app/`, `components/`) — routes and UI. Never calls
  `supabase.from(...)` for a write a domain module already owns.
- **Domain** (`lib/<feature>/`) — business rules, and *one write path per aggregate*,
  each defined by a typed contract: a draft type plus a pure row-shaping function,
  independent of the Supabase client so the contract is unit-testable without a DB.
- **Infra** — the actual `supabase.from(...)` call, isolated inside the one domain module
  that owns that table; never duplicated at a second call site.

**Proof of concept shipped with this ADR** (not a full migration — see Consequences):
`lib/memory/memoryItemContract.ts` (pure contract — `MemoryItemDraft`,
`MEMORY_SOURCE_TYPES`, `draftsToInsertRows`; no `server-only`; unit-tested in
`src/__tests__/lib/memory-write.test.ts`) + `lib/memory/writeMemoryItems.ts` (the one
place that inserts into `memory_items`). Four of the five call sites named in #22 now go
through it: `save-memory/route.ts`, `lib/labs/queries.ts::insertMemoryItems` (+ its caller
`labs/sessions/[id]/complete/route.ts`), `app/api/memory/items/route.ts` (the public API),
and `lib/ai-brain/synthesizer.ts`. `memory_type` is required at each draft (closing the
silent-default half of #22 for the paths that had it), `source_type` is narrowed to a
closed union of the four real values observed in application code — `intervention`,
`labs`, `inbox`, `brain_synthesis` — closing #23 at the same seam: `app/api/memory/items/route.ts`
previously accepted `source_type: z.string()` with **no restriction at all** on a
public, user-facing endpoint, the exact case #23 describes.

## Alternatives Considered

- **Leave it as a flat monolith (status quo).** Zero migration cost, but the failure
  mode is already observed and repeating: every new feature touching `memory_items` (or
  any other multi-writer table) is one more independent insert path unless someone
  remembers the other four exist. Rejected — the tax is already due, not hypothetical.
- **Microservices** (separate `memory-service`, `ai-service`, `auth-service`). Would
  genuinely make "which service owns this write" unambiguous, but: no team to own service
  boundaries or on-call, Vercel-serverless isn't built for a service mesh, and load
  doesn't justify it. The operational cost (N deploys, network-boundary latency,
  distributed tracing, service discovery) is pure overhead at this scale. Rejected: it
  solves a scaling problem this project doesn't have yet, at a cost (team size, deploy
  complexity) it can't currently afford.
- **Modular monolith, lint-enforced** (`eslint-plugin-boundaries` / `dependency-cruiser`).
  The eventual, stronger version of this same decision — but `eslint.config.js` doesn't
  currently exist in this repo (a pre-existing gap, tracked separately, not fixed by this
  ADR), so there is no ESLint to attach a boundary rule to yet. Until then, the boundary
  is enforced by convention ("one file per table that inserts into it"), weaker than
  CI-enforced but zero new tooling — matches "solution scaled to the task" better than
  standing up a lint pipeline before the linter itself is back.
- **Full DDD tactical patterns** (repositories, unit-of-work, CQRS). Rejected as
  over-engineering at this scale — the review's findings never point at a missing
  abstraction layer, they point at a missing *single write path*. A much smaller, cheaper
  fix captures nearly all of the benefit.

## Consequences

- **Positive**
  - The concrete bug class behind #22/#23 (independent writers, spoofable provenance,
    silent memory_type default) closes at its root for four of the five call sites, not
    per-call-site. The public API case (`app/api/memory/items/route.ts` accepting an
    unrestricted `source_type` string) is the most direct real-world instance of #23 —
    it's the one any outside caller could actually exploit — and is now closed by the
    same enum, not a route-specific patch.
  - `lib/ai-brain/synthesizer.ts`'s write (the one call site that already did
    `memory_type`/`confidence`/computed `stability` correctly) proves the contract isn't
    lowest-common-denominator: `MemoryItemDraft` grew one optional field (`confidence`)
    to fit it, without touching the three simpler callers.
  - The domain contract is unit-testable without a mocking framework — this repo had zero
    tests on any Supabase-touching code before now (`"server-only"` isn't resolvable
    under the current Vitest config, which is exactly why the pure/infra split matters:
    splitting the contract out of the `server-only` file is what makes it testable at all).
  - The pattern is repeatable and its next trigger is named, not vague: `entries` (2
    independent writers today, in `lib/interventions/journal.ts` and
    `app/api/interventions/[id]/to-tasks/route.ts`) and `memory_graph_edges` (1 writer
    today, in `lib/memory/graph.ts`) get the same split the day a second writer appears.
- **Negative**
  - **Partial adoption, named explicitly:** 1 of the 5 call sites in #22 —
    `app/api/checkin/route.ts` — is *not* migrated by this ADR. It has its own
    separately-tracked broken-upsert issue and is deliberately not touched here to keep
    this change's blast radius to the architecture boundary, not a bug-fix pass.
    `ARCHITECTURE.md` is exactly what got flagged for claiming things that don't exist —
    this ADR is written to not repeat that mistake.
  - Tightening `app/api/memory/items/route.ts`'s `source_type` from an unrestricted
    string to a closed enum is a real, deliberate behavior change: a request that used to
    silently succeed with an arbitrary `source_type` now gets a 400. The repo's one real
    caller (`components/inbox/ClassificationReveal.tsx`) always sends `"inbox"`, so this
    doesn't break the shipped product — but anyone hitting this public endpoint directly
    with a different value will now see a validation error where they didn't before.
  - Convention-enforced, not lint-enforced, until `eslint.config.js` exists — the same
    transitional risk ADR-006 named for the server/client boundary before Next.js's
    build-time check existed for it.
  - While migrating `labs/sessions/[id]/complete/route.ts`, found (not fixed) a separate,
    adjacent issue: the `.filter((r): r is PromiseFulfilledResult<...> => ...)` type guard
    at that call site resolves loosely enough that `tsc --noEmit` didn't flag the missing
    `memory_type` even before this fix — meaning the type safety this repo's `strict: true`
    tsconfig implies was partly illusory at this exact seam. Filed as a follow-up, not
    fixed here — a distinct bug (a type-guard construct), not an architecture-boundary
    concern.
- **Neutral**
  - No new dependency, no new deploy target, no change to ADR-001's stack or ADR-004's
    folder grouping.

## Extension points

- **`lib/ai-brain`** (the synthesizer pipeline, ~1,558 lines — already the heaviest single
  domain module) is the piece of this codebase most likely to outgrow the monolith first.
  If it ever needs independent scaling, its own cost/latency SLO, or a different runtime
  (a long-running worker instead of a serverless function), the domain/infra split
  proposed here means it can be extracted behind its existing contract without touching
  its callers. Not needed today — named so the decision isn't relitigated from scratch
  when the pressure actually shows up.
- **A second write-path table** (`entries`, `memory_graph_edges`) gets the same
  `<table>Contract.ts` + `write<Table>.ts` split the day a second independent writer
  appears for it. The trigger is concrete (a second writer), not a calendar date.
- **Lint-enforced boundaries** — once `eslint.config.js` exists, `eslint-plugin-boundaries`
  or `dependency-cruiser` upgrades this from convention to CI-enforced, matching how
  ADR-006 already enforces its boundary at build time.

## Revisit when

Team grows past one developer (ownership boundaries start to matter for real), or a
specific domain module's load/cost profile diverges enough from the rest of the app to
justify its own deploy — whichever comes first, not a fixed timeline.

## References
- [reports/005-backend-architecture-review](../reports/005-backend-architecture-review)
  (PR #1), [reports/006-frontend-architecture-review](../reports/006-frontend-architecture-review)
  (PR #9), [reports/007-memory-layer-architecture-review](../reports/007-memory-layer-architecture-review)
  (PR #17)
- Issues [#11](https://github.com/Qalipso/Shadow-AI-Second-Brain/issues/11),
  [#22](https://github.com/Qalipso/Shadow-AI-Second-Brain/issues/22),
  [#23](https://github.com/Qalipso/Shadow-AI-Second-Brain/issues/23)
- [ADR-001](./001-nextjs-supabase-stack.md), [ADR-004](./004-monorepo-layout.md),
  [ADR-006](./006-server-only-secrets.md)
- [web/src/lib/memory/memoryItemContract.ts](../web/src/lib/memory/memoryItemContract.ts),
  [web/src/lib/memory/writeMemoryItems.ts](../web/src/lib/memory/writeMemoryItems.ts)
