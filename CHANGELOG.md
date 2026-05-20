# Changelog

All notable changes to Shadow are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Comprehensive repo documentation: `ARCHITECTURE.md`, `DECISIONS/` (10 ADRs), `FLOWS/` (7 flow docs), `ROADMAP.md`, `CONTRIBUTING.md`
- Hidden action hero + lifecycle buttons on completed intervention cards
- Labs UI overhaul: dramatic hero section, brighter SelfKnowledgeIndex ring, bolder TestCard hover state + ambient bloom

### Changed
- Font stack: Geist + **Playfair Display** (display) + **Inter** (body fallback) for Cyrillic support
- `<html lang="ru">` for proper hyphenation
- ToolPanel "New intervention +" link → button that resets form state via `skipNextHydrate` ref

### Fixed
- Intervention form state persisting across "New intervention +" clicks
- Checkbox selections persisting after convert-to-tasks
- Completed intervention cards showing irrelevant action buttons

---

## [0.7.0] — 2026-05-19 — Sonic Mirror

### Added
- Spotify OAuth (PKCE) connection
- Periodic sync of recent + top tracks/artists
- Audio features analysis (valence, energy, danceability, tempo)
- Sonic archetype detection
- Emotional anchors (user-tagged song-feeling pairs)
- `/insights/sonic` page with full module breakdown
- Encrypted refresh token storage (AES-GCM)

---

## [0.6.0] — 2026-05-18 — Labs

### Added
- Labs section with self-knowledge tests (Big 5, values, current state)
- TestCard grid with category accents
- SelfKnowledgeIndex progress ring
- TestTaker wizard with Likert scale questions
- Results view with radar chart + LLM-generated narrative
- Persona injection: completed test narratives feed into chat context

---

## [0.5.0] — 2026-05-17 — Interventions + ShadowOrb

### Added
- Four intervention tools: task_shatter, dopamine_menu, context_switch, interest_filter
- ToolPanel + ResultCard component pair
- StateInputPanel with energy/mood/friction chips (localStorage-persisted)
- StuckRightNowPanel dashboard widget
- ShadowOrb floating chat with RAG-backed responses
- Streaming SSE responses for chat + reports
- Cost cap enforcement (MAX_DAILY_LLM_USD)

---

## [0.4.0] — 2026-05-16 — Direction + Protocols

### Added
- Missions and tasks with deadline + blocker fields
- Rituals with strength tracking
- HabitGrid for protocol execution
- ShadowReading: AI-generated direction insight
- TaskDetailDrawer + MissionDetailDrawer with save state machine

---

## [0.3.0] — 2026-05-15 — Memory Hardening

### Added
- `buildMemoryContext` orchestrator in `lib/memory/context.ts`
- Parallel RAG fetches (similar + today + scores)
- Memory block builder for prompt injection
- AskShadow page for direct memory queries
- MemoryTimeline component

### Changed
- All chat + report endpoints route through `buildMemoryContext`
- Embeddings now stored on `entries.embedding` directly (no separate table)

---

## [0.2.0] — 2026-05-13 — Classification + Wheel + Check-in

### Added
- Auto-classification pipeline on every entry
- 12 Life Areas seeded + Life Circle visualization
- Daily check-in wizard with state sliders + AI questions
- Daily report generation
- Weekly review skeleton
- Initiatives generation from check-in synthesis

---

## [0.1.0] — 2026-05-11 — Foundation

### Added
- Next.js 16 + Supabase scaffold
- Auth flow (magic link)
- Inbox with Composer + EntryList
- `entries` table + RLS
- pgvector extension enabled
- Basic dashboard with placeholder widgets
- Sidebar navigation + responsive shell

---

## Version Bump Process

1. Update this changelog with the new section
2. Run `npm version <major|minor|patch>` in `web/`
3. Tag the release: `git tag v0.X.0`
4. Push: `git push --tags`
5. Deploy via Vercel (automatic on `main`)
