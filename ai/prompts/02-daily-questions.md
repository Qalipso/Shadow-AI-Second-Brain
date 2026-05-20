# Daily Questions Selection

Pick 5 questions for today.

## Inputs
- `bank`: active questions w/ category, life_areas, frequency_weight
- `recent_answers`: last 14 days (question_id, created_at)
- `recent_entries_summary`: high-level themes from RAG
- `time_of_day`: morning | midday | evening

## Rules
- No question repeated within 5 days.
- 2 must match `time_of_day` (morning vs evening bias).
- 1 must address a life_area with low recent score or low coverage.
- 1 must be a deep/shadow type (if user has answered ≥3 surface ones in last 3 days).
- 1 free random weighted by frequency_weight.
- Output JSON: `[{question_id, reason}]`.
