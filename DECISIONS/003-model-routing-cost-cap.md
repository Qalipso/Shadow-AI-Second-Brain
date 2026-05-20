# ADR-003: Two-model routing + hard daily USD cap

**Status:** Accepted
**Date:** 2026-05-13

## Context
Shadow makes many LLM calls per day:
- Every entry → 1 classify call + 1 embed call
- Every check-in → 1–3 question generations
- Every chat turn → 1 chat call (possibly multi-step)
- Daily report → 1 deep call
- Weekly review → 1 deep call

If we use `gpt-4o` for everything, a normal day costs $3–8/user. At 100 users that's $300–800/day. We are 1 user with $0 revenue. Need a brake.

We also need a price/quality split because:
- Classification doesn't need GPT-4o reasoning
- ShadowOrb deep questions need it

## Decision
Two-model routing with a hard USD ceiling per user per UTC day.

| Use case | Model |
|----------|-------|
| Classification, embeddings, quick chat | `gpt-4o-mini` (~$0.15 / 1M input) |
| Deep chat, daily/weekly reports, area scoring, interventions, labs | `gpt-4o` (~$2.50 / 1M input) |

Deep query detected by `isDeepQuery()` heuristic — looks for *why, pattern, across, last week, compare, repeat*.

Hard cap: `MAX_DAILY_LLM_USD` env (default `1.50`).
Enforced in `lib/cost-ledger.ts` → `ensureBudget()` reads sum from `ai_processing_logs` for current UTC day. If over → throw `BudgetExceededError` → API returns 402 + UI shows "Shadow needs rest".

## Alternatives Considered
- **Single model (`gpt-4o`)** — Simpler but $$ blows up
- **Single model (`gpt-4o-mini`)** — Cheaper but daily reports + interventions feel flat
- **User-set budget in settings** — Adds complexity for MVP; revisit when multi-user
- **No cap, alert at $X** — Fails if user is asleep; we burn through API budget
- **3+ tier model routing** — Premature optimization; two tiers cover 95% of value

## Consequences
- **Positive**
  - ~70% cost reduction vs. all-`gpt-4o`
  - Predictable max daily spend
  - User sees explicit "rest" message — better than silent degraded responses
  - Cost data in DB enables future analytics + per-user pricing
- **Negative**
  - `isDeepQuery()` heuristic is brittle; some "should be deep" queries get mini
  - Cap can cut off legitimate end-of-day reflection
  - User can't override (no UI to bump cap)
- **Neutral**
  - Cap resets at UTC midnight, not local — confusing for non-UTC users (acceptable for now)

## References
- [src/lib/llm.ts](../web/src/lib/llm.ts)
- [src/lib/cost-ledger.ts](../web/src/lib/cost-ledger.ts)
- [src/ai/prompts/shadow-chat.ts](../web/src/ai/prompts/shadow-chat.ts)
