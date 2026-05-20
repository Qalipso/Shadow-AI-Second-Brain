# ADR-007: Row-level security on every table

**Status:** Accepted
**Date:** 2026-05-12

## Context
Even single-user MVP eventually opens to friends → invites → public. Retrofitting RLS later means auditing every query in the codebase. Cheaper to build it in from migration 001.

Supabase makes this trivial: enable RLS on a table, write a policy that checks `auth.uid()`.

## Decision
**Every table** has RLS enabled and at least one policy. New tables added via migrations must include RLS in the same migration file.

Standard pattern:
```sql
alter table entries enable row level security;

create policy "Users access their own entries"
  on entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

For reference data (seeded `life_areas`, `question_bank`):
```sql
create policy "Anyone can read reference data"
  on life_areas for select
  using (true);
```

The `match_entries` RPC accepts `auth.uid()` as a parameter and filters internally — RLS still applies to underlying table.

## Alternatives Considered
- **Service-role key in API routes** — Faster query path but moves auth logic into application code; risk of forgetting `WHERE user_id = $1` filter
- **Anon key with RLS only** — Default for browser-safe queries; can't perform admin tasks
- **Hybrid (anon for reads, service for writes)** — Used in select cases (cost ledger writes use service role) but RLS still enabled as defense in depth

## Consequences
- **Positive**
  - Forgetting a `WHERE user_id =` filter is no longer a data leak
  - Multi-user readiness baked in
  - Penetration test scope shrinks significantly
- **Negative**
  - Some queries need `set_config('request.jwt.claims', ...)` workarounds in scripts
  - Slight overhead per query (negligible at MVP scale)
  - Service-role writes (cost ledger, embed background job) need careful audit
- **Neutral**
  - Migration files are longer; that's fine

## References
- [supabase/migrations/20260512120001_rls_policies.sql](../supabase/migrations/20260512120001_rls_policies.sql)
- [Supabase RLS docs](https://supabase.com/docs/guides/auth/row-level-security)
