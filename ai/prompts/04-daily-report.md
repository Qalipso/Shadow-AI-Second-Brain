# Daily Report Generation

Model: Claude Sonnet 4.6.

## Inputs
- `entries_today`
- `question_answers_today`
- `tasks_status`
- `life_area_scores_today`
- `rag_context`: top-k similar entries from prior days

## Output JSON
```json
{
  "summary": "",
  "mood": null,
  "energy": null,
  "stress": null,
  "main_theme": "",
  "active_life_areas": [],
  "new_tasks": [],
  "completed_tasks": [],
  "patterns": [{"text": "", "source": "entries|pattern|answer|missing_data", "confidence": 0.0}],
  "recommendations": [{"text": "", "rationale": "", "confidence": 0.0}],
  "risks": [],
  "confidence_overall": 0.0
}
```

## Rules
- Concrete, never generic motivational text.
- Each pattern/recommendation has a source tag.
- If <3 entries today, set `confidence_overall < 0.5` and mention missing data.
- Max 3 recommendations.
- No medical/financial/legal advice.
