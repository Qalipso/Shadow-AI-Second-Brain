# Flow 005: End-of-day report generation

## Goal
At any point in the evening, user clicks "Close the day". Shadow aggregates the day's entries + check-in + scores, generates a narrative report with patterns + suggested next moves.

## Sequence

```mermaid
sequenceDiagram
    actor User
    participant B as CloseTheDayButton
    participant API as POST /api/reports/daily
    participant MC as buildMemoryContext
    participant DB as Supabase
    participant AI as OpenAI

    User->>B: Click "Close the day"
    B->>API: { date: today }

    API->>DB: SELECT entries WHERE date = today
    DB-->>API: today entries

    alt No entries
        API-->>B: 422 "No entries yet today"
        B->>B: Show "Capture something first" hint
    else Has entries
        API->>MC: buildMemoryContext(query="daily summary", userId)
        MC-->>API: { similar, todayEntries, scores, block }
        API->>DB: SELECT check_ins WHERE date = today
        DB-->>API: today check-in (if any)

        API->>API: ensureBudget(userId) — gpt-4o path
        API->>AI: stream daily report prompt
        loop tokens
            AI-->>API: token
            API-->>B: SSE chunk
            B->>B: append to report area
        end

        API->>DB: INSERT daily_reports (text, summary, headline)
        API->>DB: INSERT ai_processing_logs
    end
```

## Files
- `src/components/reflection/CloseTheDayButton.tsx`
- `src/components/reflection/ReflectionSummary.tsx`
- `src/components/reflection/EveningRitual.tsx`
- `src/app/api/reports/daily/route.ts`
- `src/ai/prompts/daily-report.ts`
- `src/lib/memory/context.ts` — same `buildMemoryContext` as chat

## Report structure (LLM output)
```
HEADLINE   — one-line essence ("Day of split focus and small wins")
SUMMARY    — 3-5 sentences narrative
PATTERNS   — bullet list: what dominated, what was avoided
SIGNAL     — what changed vs. yesterday/last week
NEXT MOVE  — one specific suggested action for tomorrow
```

## Edge Cases

### No entries today (422)
Returns error; user sees "Capture something first" hint with link to inbox.

### No check-in today
Report uses entries only; mood inferred from entry sentiment.

### Budget exceeded
Falls back to gpt-4o-mini with a degraded prompt; banner notes "Lite report — budget reached".

### Report already generated today
Allowed to regenerate; new row created (latest wins in UI).

### LLM hallucinates a fact
Prompt enforces "cite specific entries by quoting fragments"; reviewer can flag via thumbs-down → `/api/shadow/feedback`.

## Invariants
- Always uses `gpt-4o` (deep) path when budget allows
- Memory block built fresh; no caching of context across days
- Report stored as text + structured fields for future querying
- Streaming response; user sees first words within ~1s
