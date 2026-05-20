# ADR-001: Next.js 16 + Supabase as the base stack

**Status:** Accepted
**Date:** 2026-05-11

## Context
Shadow needs:
- Full-stack TypeScript with shared types between client/server
- Server-rendered pages for fast first paint and SEO (later for landing)
- Auth out of the box
- Postgres with vector search
- Row-level security so MVP can scale to multi-user without refactor
- Cheap hosting until we have paying users

## Decision
Use **Next.js 16 (App Router) + Supabase**.

- Next.js handles SSR, API routes, auth callbacks, streaming responses
- Supabase provides Postgres, Auth, Storage, RLS, Edge Functions (kept in reserve)
- Deploy to Vercel for Next.js, Supabase Cloud for DB

## Alternatives Considered
- **Remix + Neon + Clerk** — More opinionated routing but auth split across services; Neon lacks first-party vector at the time
- **SvelteKit + Supabase** — Smaller ecosystem; team familiarity with React tips the scale
- **Custom Express + Postgres** — Faster initial bootstrap but no SSR, no auth UI, no edge runtime
- **Convex** — Lovely DX but proprietary backend; can't move off it later

## Consequences
- **Positive**
  - One language end-to-end
  - RLS pushes auth concerns into the DB layer (less bug surface in API code)
  - Streaming API routes match LLM token streaming use case
  - Auth callbacks + magic link work in 30 minutes
- **Negative**
  - Vendor lock-in to Supabase auth flow (mitigated: stays in `lib/supabase/`)
  - Next.js App Router has rough edges (`ssr: false` requires Client Component wrapper)
  - Turbopack prod build occasionally breaks Google Fonts → stay on Webpack for prod
- **Neutral**
  - Supabase migrations via SQL files (we like SQL, others may not)

## References
- [docs/PRD.md](../docs/PRD.md)
- [reports/001-foundation-skeleton/REPORT.md](../reports/001-foundation-skeleton/REPORT.md)
