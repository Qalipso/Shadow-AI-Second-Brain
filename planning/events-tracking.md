# Events Tracking (PostHog)

| Event | When | Props |
|-------|------|-------|
| entry_created | on submit | length, source, has_questions |
| entry_classified | after AI return | primary_type, confidence, life_areas[] |
| classification_corrected | user edits class | field_changed, original, new |
| question_answered | answer saved | question_id, category, length |
| daily_questions_completed | all 5 done | duration_sec |
| dashboard_viewed | route view | time_of_day |
| report_generated | server | report_type, confidence |
| report_opened | route view | report_id, type |
| insight_rated | thumbs up/down | insight_id, rating |
| task_created_from_ai | auto-task | source_entry_id |
| goal_created | manual or AI | source |
| life_area_score_updated | recompute | area_id, score, delta |

## North Star
`structured_life_days_per_week` — computed nightly job, persisted to user_metrics.
