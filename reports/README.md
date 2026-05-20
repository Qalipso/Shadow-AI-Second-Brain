# Session Reports

Numbered folders preserve full execution history.

Convention: `NNN-short-slug/` where N = zero-padded sequence.
Each session ends with `REPORT.md` describing:
- date, duration estimate
- phase(s) touched
- files created/modified
- agents/skills used
- decisions made
- blockers
- next-session entry point

Sequence:
- 001-foundation-skeleton — Phase 0 finalize + Phase 1 kickoff
- 002-database-rls-wiring — Phase 2 migrations, RLS, auth proxy, wired pages
- 003-skeleton-rebuild-memory-hardening — Phase 1.5 stability pass: web/ rebuilt from scratch with minimal deps, error boundaries, dev-safe.sh OOM-resilient launcher. Includes `IMPROVEMENT_PLAN.md` covering Phases 2.1 → 6.
