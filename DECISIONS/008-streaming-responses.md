# ADR-008: SSE streaming for chat and reports

**Status:** Accepted
**Date:** 2026-05-14

## Context
LLM responses for daily reports and chat take 3–15 seconds end-to-end. Waiting for the full response before showing anything feels broken. Users perceive an LLM that "thinks for 8s then dumps text" as slow even when it's actually fast.

Streaming tokens as they arrive makes a 10s response feel like an instant 1s + smooth typing.

## Decision
Use **Server-Sent Events (SSE)** for any LLM-backed endpoint with output > 500ms:
- `/api/shadow/chat`
- `/api/reports/daily`
- `/api/reports/weekly`
- `/api/interventions/generate`

Implementation pattern:
```ts
const stream = await openai.chat.completions.create({
  model, messages, stream: true,
});

return new Response(
  new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? '';
        controller.enqueue(new TextEncoder().encode(token));
      }
      controller.close();
    },
  }),
  { headers: { 'Content-Type': 'text/event-stream' } }
);
```

Client uses `ReadableStream.getReader()` and appends each chunk to the visible text.

## Alternatives Considered
- **WebSocket** — Bidirectional; overkill for read-only LLM output. Adds connection-management complexity
- **Wait for full response** — Simplest but UX is poor for long generations
- **Polling** — Multiple round trips; no benefit over SSE here

## Consequences
- **Positive**
  - Perceived latency drops dramatically
  - Aligns with how OpenAI SDK works natively
  - Standard `Response` object — no custom protocol
- **Negative**
  - Error handling is trickier (an error mid-stream needs in-band signaling)
  - Server-side cost ledger writes happen *after* stream completes; if user closes tab early we may undercount
  - Some proxies (corporate firewalls) buffer SSE and break the streaming illusion
- **Neutral**
  - Vercel's edge runtime supports SSE natively; no special config

## References
- [src/app/api/shadow/chat/route.ts](../web/src/app/api/shadow/chat/route.ts)
- [src/components/ShadowOrb.tsx](../web/src/components/ShadowOrb.tsx)
