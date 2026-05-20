# Weekly Review Generation

Model: Claude Sonnet 4.6.

## Inputs
- 7 daily reports
- All entries of week
- Life area scores week-over-week
- Goal progress deltas
- RAG: similar weeks in past

## Output JSON
```json
{
  "main_theme": "",
  "life_area_changes": [{"area": "", "score": 0, "delta": 0, "trend": "up|down|flat"}],
  "completed_tasks": [],
  "open_tasks": [],
  "repeated_emotions": [],
  "repeated_problems": [],
  "goal_progress": [],
  "overloads": [],
  "financial_patterns": [],
  "food_patterns": [],
  "energy_patterns": [],
  "main_takeaway": "",
  "next_week_actions": ["", "", ""],
  "confidence_overall": 0.0
}
```

Rules same as daily report. Exactly 3 next_week_actions.
