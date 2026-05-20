# Architecture Decision Records (ADRs)

Each ADR captures **one** significant architectural decision: the context, the choice, alternatives we rejected, and the consequences we accept.

Format follows [Michael Nygard's ADR template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Index

| # | Title | Status |
|---|-------|--------|
| [001](./001-nextjs-supabase-stack.md) | Next.js 16 + Supabase as the base stack | Accepted |
| [002](./002-pgvector-rag.md) | pgvector for semantic memory (not Pinecone/Weaviate) | Accepted |
| [003](./003-model-routing-cost-cap.md) | Two-model routing + hard daily USD cap | Accepted |
| [004](./004-monorepo-layout.md) | Monorepo with feature-grouped components | Accepted |
| [005](./005-one-textarea-ui.md) | Single textarea as primary capture surface | Accepted |
| [006](./006-server-only-secrets.md) | Server-only library boundary for AI/DB | Accepted |
| [007](./007-rls-everywhere.md) | Row-level security on every table | Accepted |
| [008](./008-streaming-responses.md) | SSE streaming for chat and reports | Accepted |
| [009](./009-immutability-in-components.md) | Immutable state pattern across React tree | Accepted |
| [010](./010-cyrillic-font-stack.md) | Playfair Display + Inter for Cyrillic support | Accepted |

## How to add a new ADR

1. Copy `_TEMPLATE.md`
2. Pick next sequential number
3. Add row to the index above
4. Open PR; mark as `Proposed` until merged → flip to `Accepted`
5. If an ADR is later overturned, don't delete — mark `Superseded by ADR-NNN` and add the replacement
