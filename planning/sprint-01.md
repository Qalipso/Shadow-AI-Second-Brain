# Sprint 01 — Foundation + Inbox (7 days)

Goal: usable AI Inbox writing classified entries to Supabase.

## Day 1 — Spec
- [ ] Finalize docs/PRD.md
- [ ] Lock MVP scope
- [ ] Approve db/schema/shadow.sql
- [ ] Approve design/brief/design-brief.md
Agents: planner, architect, uiux-pro-max-designer

## Day 2 — Infra
- [ ] `pnpm create next-app web` (TS, App Router, Tailwind)
- [ ] Supabase project, env wiring
- [ ] Run schema + seeds
- [ ] Magic-link auth working
Agents: build-error-resolver, database-reviewer

## Day 3 — Inbox UI
- [ ] /inbox route
- [ ] Textarea + submit
- [ ] Entries list (today)
Agents: magic-ui-component-gen
Skills: 21st-dev-magic, frontend-patterns

## Day 4 — Classification
- [ ] POST /api/entries
- [ ] Claude Haiku call w/ 01-classification.md
- [ ] Zod schema + retry
- [ ] Persist classification + extracted entities
Agents: architect, tdd-guide, security-reviewer
Skills: claude-api, regex-vs-llm-structured-text, content-hash-cache-pattern

## Day 5 — Dashboard skeleton + Questions
- [ ] /dashboard route
- [ ] Today summary card
- [ ] Recent entries card
- [ ] Daily questions modal (5 random from bank)
- [ ] Save answers
Agents: magic-ui-component-gen, uiux-pro-max-designer

## Day 6 — Daily report v0 + embeddings
- [ ] Server route to generate daily report (Sonnet)
- [ ] Persist to reports table
- [ ] Background embed job for entries
Agents: architect, database-reviewer

## Day 7 — Dogfood + review
- [ ] Use Shadow all day
- [ ] Log bugs
- [ ] Code review pass
- [ ] Decide sprint 02 scope
Agents: code-reviewer, refactor-cleaner
