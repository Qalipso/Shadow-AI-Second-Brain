# ADR-005: Single textarea as primary capture surface

**Status:** Accepted
**Date:** 2026-05-11

## Context
Existing tools (Notion, Obsidian, Todoist, Apple Reminders) force the user to *decide* what kind of thing they're recording before recording it:
- Pick a database
- Pick a tag
- Pick a project
- Fill required fields
- Save

This decision tax is the reason people stop using personal knowledge tools after 2 weeks. Brain capacity is finite.

## Decision
**One textarea.** No tags, no categories, no folder picker. User types freely. LLM does structuring after submit.

```
┌─────────────────────────────────┐
│  What's in your head?           │
│  ─────────────────────────────  │
│  [                           ]  │
│  [                           ]  │
│                          [→]   │
└─────────────────────────────────┘
```

After submit:
- Local optimistic render → entry shown immediately
- Background classify → entity type, life areas, sentiment surface as soft chips
- Background embed → searchable from next query

User can later correct the AI's classification via a small dropdown, but is never blocked at capture time.

## Alternatives Considered
- **Tabs (Task / Note / Mood / Idea)** — Same decision tax in disguise
- **Quick-action buttons + textarea** — Buttons get ignored; textarea wins
- **Voice-first** — Future addition (ADR pending) but typing is universal baseline
- **Slash commands (`/task buy milk`)** — Power-user feature; not the default surface

## Consequences
- **Positive**
  - Capture time goes from ~10s (decide + fill fields) to ~2s (just type)
  - Users capture 3-5x more entries → more memory → better RAG
  - Zero training required
- **Negative**
  - LLM classification can be wrong → user must trust and verify
  - "Where did my task go?" — task list page needs to surface tasks from any source clearly
  - Free-text only first → no built-in structured fields (cost, due date) until classifier extracts them
- **Neutral**
  - Visually minimal but requires significant backend (classification + embed pipelines)

## References
- [docs/PRD.md §6 Core flow](../docs/PRD.md)
- [src/components/inbox/Composer.tsx](../web/src/components/inbox/Composer.tsx)
