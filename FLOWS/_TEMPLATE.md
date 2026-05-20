# Flow NNN: Title

## Goal
What is the user trying to accomplish?

## Actor
Who initiates this flow? (Authenticated user, system cron, webhook, etc.)

## Sequence

```mermaid
sequenceDiagram
    actor User
    participant A as Component
    participant B as API
    participant DB as Database
    participant AI as External Service

    User->>A: Action
    A->>B: Request
    B->>DB: Query
    DB-->>B: Result
    B->>AI: Call (if applicable)
    AI-->>B: Response
    B-->>A: Response
    A-->>User: Render
```

## Files
- `path/to/component.tsx` — what it does
- `path/to/api/route.ts` — what it does
- `path/to/lib/helper.ts` — what it does

## Timing (real-world)
| Step | Duration |
|------|---------|
| Step name | Xms |

## Edge Cases

### Case 1
How it's handled.

### Case 2
How it's handled.

## Invariants
- What must always be true at the end of the flow.
