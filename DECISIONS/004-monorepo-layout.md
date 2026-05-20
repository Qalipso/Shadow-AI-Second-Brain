# ADR-004: Monorepo with feature-grouped components

**Status:** Accepted
**Date:** 2026-05-12

## Context
Shadow has a Next.js web app + SQL migrations + prompt files + design docs + planning artifacts. We want:
- Single source of truth for related changes (schema change + UI change + prompt change in one commit)
- One CI pipeline
- Shared TypeScript types between app code and AI prompt scaffolding

Components inside `web/src/components/` could be grouped by:
- **Type** (`buttons/`, `cards/`, `forms/`)
- **Feature** (`inbox/`, `direction/`, `interventions/`, `labs/`)
- **Atomic design** (`atoms/`, `molecules/`, `organisms/`)

## Decision
Single monorepo with **feature-grouped** components.

```
shadow/
├── web/           Next.js app (only deployable artifact)
├── supabase/      Migrations
├── ai/            Prompt versions (markdown source of truth)
├── docs/          Product docs
└── DECISIONS/     ADRs

web/src/components/
├── inbox/         Composer, EntryList, ClassificationReveal
├── direction/     DirectionView, TaskDetailDrawer, MissionDetailDrawer
├── interventions/ ToolPanel, ResultCard, StateInputPanel
├── labs/          LabsView, TestCard, SelfKnowledgeIndex
└── fx/            Shared visual primitives (BorderBeam, ShimmerButton)
```

## Alternatives Considered
- **Polyrepo (`shadow-web`, `shadow-db`, `shadow-prompts`)** — Coordination overhead, version drift between repos
- **Atomic design grouping** — Breaks down when components are highly feature-specific (a Composer is not a "molecule" reusable across features)
- **Type-based grouping (`buttons/`, `forms/`)** — Forces unrelated components into one folder; navigation becomes guesswork

## Consequences
- **Positive**
  - PR shows complete change: migration + API route + UI in one diff
  - Feature folders make codebase navigable by domain
  - Easy to extract a feature later (move folder + its API routes)
- **Negative**
  - Shared primitives still need a home (`fx/`, `components/Card.tsx` at root) — slight inconsistency
  - Large monorepo can be intimidating for new contributors
- **Neutral**
  - `web/` is the only thing Vercel builds; other dirs are static documentation

## References
- [docs/information-architecture.md](../docs/information-architecture.md)
