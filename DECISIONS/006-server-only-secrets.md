# ADR-006: Server-only library boundary for AI/DB

**Status:** Accepted
**Date:** 2026-05-12

## Context
Next.js App Router blurs server/client. A `'use client'` directive at the top of a component file is the only signal. Easy to accidentally import a server module (with API key) into a client component, which would bundle and ship the key to the browser.

We have several sensitive modules:
- `lib/llm.ts` — OpenAI client + API key
- `lib/embeddings.ts` — OpenAI client
- `lib/rag.ts` — Supabase service-role client + embeddings
- `lib/memory/context.ts` — uses rag.ts
- `lib/cost-ledger.ts` — service-role client
- `lib/supabase/server.ts` — service-role client

## Decision
Mark all server-only modules with `import 'server-only'` at the top. This is a Next.js built-in: if a client component imports a `server-only` module, build fails with a clear error.

```ts
// lib/rag.ts
import 'server-only';
// rest of file...
```

Companion: `lib/supabase/client.ts` (browser-safe, anon key only) does NOT use `server-only`. UI components import from `client.ts`. Server routes import from `server.ts`.

## Alternatives Considered
- **Convention only ("don't import this in client")** — Will fail eventually under deadline pressure
- **Separate packages (`@shadow/server`, `@shadow/client`)** — Heavyweight monorepo tooling for one app
- **ESLint rule** — Possible but Next.js's `server-only` is cleaner and runs at build time

## Consequences
- **Positive**
  - Build fails loudly if boundary is crossed
  - Self-documenting: reader sees `import 'server-only'` and knows
  - Zero runtime cost
- **Negative**
  - Need discipline to add `server-only` to every new sensitive module
  - Doesn't catch leak via *return value* (e.g., a server action that returns the API key — but we don't do that)
- **Neutral**
  - Tied to Next.js convention; if we leave Next.js this breaks

## References
- [Next.js docs: server-only](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment)
- [src/lib/rag.ts](../web/src/lib/rag.ts)
- [src/lib/memory/context.ts](../web/src/lib/memory/context.ts)
