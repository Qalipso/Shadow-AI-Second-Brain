# Insight Generation

Model: Sonnet.

## Inputs
- Last 7–30 days entries
- Last 4 weekly reports
- RAG: top-k similar entries to current week themes
- Active goals

## Output JSON
```json
{
  "insights": [
    {
      "title": "",
      "description": "",
      "type": "pattern|risk|progress|reflection",
      "life_areas": [],
      "source_entry_ids": [],
      "confidence": 0.0,
      "actionability": "low|medium|high"
    }
  ]
}
```

## Rules
- Max 3 insights/run.
- Each must cite ≥2 source entries OR explicitly say "weak signal".
- No duplicates across last 14 days (caller dedupes by title embedding).
- No advice tone; observation > prescription.
- Skip if no insight clears confidence 0.55.
