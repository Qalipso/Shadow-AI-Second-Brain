# ADR-011: Provider-agnostic LLM layer

**Status:** Accepted (partial rollout — see Consequences)
**Date:** 2026-07-12

## Context

Every LLM call in Shadow went directly through `lib/llm.ts`'s `getLlm()`, which returns
a raw `OpenAI` client. 23 call sites called `openai.chat.completions.create(...)`
directly and read `resp.choices[0].message.content` / `resp.usage.prompt_tokens` in
OpenAI's exact response shape. There was no way to run Shadow against a different
vendor without touching every call site, and no way to distinguish a rate-limit error
from any other failure (`catch (e) { const msg = (e as Error).message }` everywhere).

## Decision

Introduce `lib/llm-provider/` as a normalization layer, separate from `lib/llm.ts`
(which keeps owning the OpenAI singleton client, the cost/pricing table, and the
`hasLlm()`/`MODELS` exports its existing 23 consumers already depend on — this ADR
does not touch that file's public surface, only adds to its `PRICING` table).

```ts
interface LLMProvider {
  readonly name: string;
  complete(opts: CompleteOptions): Promise<LLMResponse>;
}
```

Two adapters: `OpenAIProvider` (wraps the existing `getLlm()` client — zero behavior
change for the default path) and `AnthropicProvider` (new, `@anthropic-ai/sdk`).
Selection is config-only: `LLM_PROVIDER=openai|anthropic` env var, read once via
`getConfiguredProvider()`. Errors normalize to `LLMRateLimited` / `LLMUnavailable`
regardless of vendor, so callers can react to *kind* of failure without a vendor
`instanceof` check.

The interface is deliberately narrow: `complete()` only. No `stream()`, no tool-calling
surface. Shadow doesn't implement streaming anywhere despite `ADR-008` describing it
(confirmed by a later architecture review — see `reports/006-frontend-architecture-review`),
and no route uses function/tool calling. Adding unused interface surface here would
repeat a pattern that review already flagged elsewhere in this codebase (a fully-typed
memory graph the AI itself never reads — `reports/007-memory-layer-architecture-review`).
Extend the interface when a real call site needs `stream()`, not speculatively.

## Alternatives Considered

- **LiteLLM or another off-the-shelf unification library** — less code to write, but a
  black box on the critical path with breaking-change risk outside this repo's control,
  and it doesn't demonstrate a self-designed boundary. Rejected for the same reason the
  companion `monolith-second-brain` reference architecture rejected it in its own
  `ADR-002-llm-provider-protocol`: the two decisions intentionally use the same
  interface shape (`complete`/normalized errors) for consistency between the two
  artifacts.
- **Migrate all 23 call sites in one PR** — larger blast radius on a live, dogfooded app
  for no added proof value; a thin vertical slice first (`classify`, JSON mode, and
  `shadow/chat`, the flagship user-facing path), then a second batch once the pattern
  held (`score-areas`, `reports/daily`, `memory/ask` — all JSON-mode, proving the
  pattern generalizes beyond the original two routes) proves the abstraction without
  the risk of a single PR touching every LLM-calling route at once.
- **Put the abstraction inside `lib/llm.ts` directly** — would require renaming/moving
  the file (`llm.ts` already exists at that path; a `llm/` directory would collide with
  it in module resolution) or a much larger diff rewriting all 23 existing imports for
  no behavioral gain on the 21 call sites not being migrated this round.

## Consequences

- **Positive**
  - `classify`, `shadow/chat`, `score-areas`, `reports/daily`, `memory/ask`,
    `reports/weekly`, `insights/instant`, `interventions/generate`, and
    `checkin/generate-initiative` (9 of 23) now genuinely run against either provider
    via one env var, with a real test proving the underlying adapters
    (`__tests__/lib/llm-provider.test.ts`) — each successive batch reused the exact
    same `getConfiguredProvider().complete()` call shape with zero changes needed to
    the abstraction itself, which is the actual proof the interface is right, not just
    that it compiled once. `checkin/generate-initiative` in particular proves the
    interface composes cleanly with a pre-existing graceful-degradation branch
    (`!hasProvider(providerName) || isOverDailyCap` → default initiative, unchanged).
  - Rate-limit errors are now distinguishable from other failures (`429` response
    instead of a blanket `502`) on the routes where that distinction matters;
    `score-areas` and `checkin/generate-initiative` keep their original graceful
    degradation on any LLM failure — unchanged by design, not an oversight.
  - `PRICING` in `lib/llm.ts` now has Anthropic entries, so cost tracking
    (`ai_processing_logs`) stays accurate if the provider is swapped.
- **Negative — named, not hidden**
  - **14 of 23 LLM call sites are still not migrated** (`admin/reembed`,
    `admin/rpc-test`, `brain/synthesize`, `embed`, `labs/sessions/[id]/complete`,
    `memory/search`, `music/insight`, `music/sonic-reflection`,
    `profile/ai-summary/regenerate`,
    `ai-brain/{initiatives,question-generator,summary-generator,synthesizer}`,
    `interventions/journal`). They still call `getLlm()` directly and are unaffected by
    `LLM_PROVIDER`. Note: `embed`, `admin/reembed`, and `memory/search` use the
    Embeddings API, not chat completion — they're outside this interface's scope
    entirely (`LLMProvider.complete()` doesn't cover embeddings), not just unmigrated;
    extending the abstraction to embeddings is a separate, undecided question.
    Migrating the rest is `[Not now]` — follow-up work, not silently implied by this
    ADR's title.
  - `AnthropicProvider` is **`[Not verified]`** against the live Anthropic API — no key
    configured in this environment. It's exercised structurally (correct request shape,
    correct response parsing, correct error normalization against real SDK error
    classes) via mocked HTTP, same honesty marker the companion `monolith-second-brain`
    demo uses for its own adapters.
  - Anthropic has no `response_format=json_object` equivalent — `jsonMode` degrades to
    prompt-only enforcement on that provider (`classify`'s `SYSTEM_PROMPT` already
    carries a "Return JSON only" instruction independent of OpenAI's API-enforced mode,
    so this isn't a new risk, just a narrower guarantee on the non-default provider).

## References
- [src/lib/llm-provider/interfaces.ts](../web/src/lib/llm-provider/interfaces.ts)
- [src/lib/llm-provider/providers/openai.ts](../web/src/lib/llm-provider/providers/openai.ts)
- [src/lib/llm-provider/providers/anthropic.ts](../web/src/lib/llm-provider/providers/anthropic.ts)
- [src/__tests__/lib/llm-provider.test.ts](../web/src/__tests__/lib/llm-provider.test.ts)
- `monolith-second-brain` (private, `Qalipso/monolith-second-brain`) `ADR-002-llm-provider-protocol` — same interface shape, Python/FastAPI reference implementation
