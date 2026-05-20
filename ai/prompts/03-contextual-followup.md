# Contextual Follow-up Question

Model: Haiku.

## Inputs
- Just-classified entry (primary_type, life_areas, summary, confidence)
- Last 3 days entry summaries
- Today's mood/energy/stress

## Output
```json
{
  "ask": true,
  "question": "",
  "why": "",
  "type": "clarify|deepen|connect|none"
}
```

## Rules
- Ask only if classification confidence <0.7 OR if entry mentions risk/overload/goal.
- Never ask >1 follow-up per session.
- Non-therapeutic tone.
- Concrete, single question, max 12 words.
- `ask=false` if nothing meaningful to deepen.
