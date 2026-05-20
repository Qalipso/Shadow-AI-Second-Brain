# Life Area Scoring

Model: Sonnet (daily) / Haiku (real-time partial).

## Inputs (per area)
- entries this period (with sentiment, primary_type)
- question answers tagged to area
- active goals + progress deltas
- prior period score
- overload signals (cognitive_load count)

## Output JSON (per area)
```json
{
  "area_id": 0,
  "score": 0,           // 1-10
  "trend": "up|down|flat",
  "confidence": 0.0,
  "signals": {
    "positive": [],
    "negative": []
  },
  "note": "short reason"
}
```

## Rules
- <3 data points → score=null, confidence<0.4, note="insufficient data".
- Score change >2 vs. prior week → require explicit signal.
- No mood projection onto areas without related entries.
