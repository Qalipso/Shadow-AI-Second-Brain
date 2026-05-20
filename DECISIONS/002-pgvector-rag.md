# ADR-002: pgvector for semantic memory

**Status:** Accepted
**Date:** 2026-05-12

## Context
Shadow's memory layer needs to:
- Store an embedding per entry (free text 1–2000 tokens)
- Query top-K similar entries by cosine distance with sub-200ms latency
- Filter by user, life area, date range, entry type *in the same query*
- Survive without a separate service or extra monthly bill while MVP runs free

We expect 50–500 entries/day per user. Single-user dogfood for first months.

## Decision
Use **pgvector** as a Postgres extension inside Supabase.

- Embeddings: `text-embedding-3-small` (1536 dim · ~$0.02 per 1M tokens)
- Storage: `entries.embedding vector(1536)`
- Index: HNSW (`vector_cosine_ops`) when we cross 10K rows
- Query: `match_entries` RPC with optional filters

## Alternatives Considered
- **Pinecone** — Excellent latency, hosted. Rejected: extra service, extra bill, no joins with relational data, hard to enforce RLS
- **Weaviate** — Same critique as Pinecone plus heavier ops
- **Qdrant self-hosted** — Cheaper than Pinecone but still a separate process to operate
- **Chroma** — File-based, fine for prototyping; doesn't survive serverless
- **Postgres + cube/array** — DIY vector math, slow at scale, no proper index

## Consequences
- **Positive**
  - One database, one connection pool, one backup story
  - Joins between `entries` + `entry_life_areas` + embeddings in one query
  - RLS automatically applies to vector queries
  - $0 incremental cost on Supabase free tier
- **Negative**
  - HNSW index rebuild cost when bulk-loading; mitigated by deferred indexing
  - Cosine similarity in SQL is verbose (wrapped in `match_entries` RPC)
  - Embedding model lock-in: if we change models we re-embed everything
- **Neutral**
  - Need to manually call `update entries set embedding = ...` after writes (handled by fire-and-forget `/api/embed`)

## References
- [ai/rag/memory-architecture.md](../ai/rag/memory-architecture.md)
- [supabase/migrations/20260512120007_match_entries_rpc.sql](../supabase/migrations/20260512120007_match_entries_rpc.sql)
- [src/lib/rag.ts](../web/src/lib/rag.ts)
