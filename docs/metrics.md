# Shadow — Metrics Plan

## 1. North Star Metric

## Structured Life Days per Week

A day counts as a Structured Life Day if:

- user creates at least 3 meaningful entries OR answers all 5 daily questions
- at least 3 life areas are touched
- mood or energy is captured
- at least one task, goal, metric, or insight is extracted
- daily summary is generated

MVP target:
4+ Structured Life Days per Week during dogfooding.

---

## 2. Product Metrics

## 2.1 Capture Metrics

### Entries per Active Day
How many raw entries user creates on days when they use Shadow.

Why it matters:
Shows whether capture is natural and low-friction.

MVP target:
3–7 entries per active day.

---

### Active Capture Days per Week
How many days per week the user adds entries or answers questions.

Why it matters:
Shows habit potential.

MVP target:
4+ days/week.

---

### Capture Diversity Score
Number of different life areas touched in a week.

Why it matters:
Shows whether Shadow captures the whole life, not only work/tasks.

MVP target:
6+ life areas/week.

---

## 2.2 Guided Questions Metrics

### Question Completion Rate
Percentage of daily questions answered.

Formula:
answered_questions / shown_questions

MVP target:
70%+

---

### Question Replacement Rate
How often user replaces questions.

Why it matters:
High replacement rate may mean questions are irrelevant.

---

### Question Skip Rate
How often user skips questions.

Why it matters:
High skip rate may mean friction, bad timing, or poor question quality.

---

## 2.3 AI Quality Metrics

### Classification Accuracy
Manual judgment of whether AI classification was correct.

MVP target:
80%+

---

### Correction Rate
Percentage of classifications manually corrected.

Formula:
corrected_classifications / total_classifications

MVP target:
<25%

---

### Extraction Accuracy
Accuracy of extracted entities:
- tasks
- expenses
- emotions
- food logs
- goals

---

### Context Linking Accuracy
How often AI links entry to correct life areas, goals, or projects.

---

### Hallucination/Error Rate
How often AI produces unsupported conclusions.

MVP target:
as close to 0 as possible.

---

## 2.4 UX Metrics

### Time to Log Entry
Time from opening input to successful saved entry.

MVP target:
<30 seconds.

---

### Time to First Useful Insight
Time from first session to first useful AI insight.

MVP target:
same day.

---

### Dashboard Return Rate
How often user returns to Dashboard after entering app.

---

### Dashboard Comprehension Time
Qualitative metric:
Can user understand day state in 10–20 seconds?

---

## 2.5 Reports Metrics

### Daily Report Open Rate
Percentage of generated daily reports opened.

MVP target:
70%+

---

### Weekly Review Completion Rate
Whether user completes weekly review.

MVP target:
1/week.

---

### Insight Usefulness Rating
User rating 1–5.

MVP target:
3.5+/5.

---

### Report Actionability Score
Manual rating:
Does the report suggest clear next actions?

---

## 2.6 Value Metrics

### Cognitive Load Score
User self-rates:
“How much mental chaos do I feel right now?” 1–10.

Track before and after using Shadow.

MVP target:
at least +1 clarity improvement after 7 days.

---

### Planning Clarity Score
User self-rates:
“How clear is my next action?” 1–10.

---

### Life Area Coverage
Number of life areas with enough data during period.

---

### Goal Progress Signal
Number of entries/actions linked to active goals.

---

## 3. Event Tracking

Track these events:

- entry_created
- entry_classified
- classification_corrected
- question_answered
- question_skipped
- question_replaced
- daily_questions_completed
- dashboard_viewed
- life_area_opened
- daily_report_generated
- daily_report_opened
- weekly_review_generated
- weekly_review_opened
- insight_created
- insight_rated
- task_created_from_ai
- task_completed
- goal_created
- goal_updated
- life_area_score_updated
- memory_created
- memory_retrieved
- memory_deleted

---

## 4. Event Properties

## entry_created
- user_id
- entry_id
- source
- input_type
- raw_text_length
- created_at

## entry_classified
- user_id
- entry_id
- primary_type
- secondary_types
- life_areas
- ai_confidence
- latency_ms
- model

## classification_corrected
- user_id
- entry_id
- corrected_fields
- previous_value
- new_value

## question_answered
- user_id
- question_id
- category
- question_type
- life_areas
- answer_length

## report_opened
- user_id
- report_id
- report_type
- period_start
- period_end

## insight_rated
- user_id
- insight_id
- rating
- insight_type

---

## 5. Dogfooding Evaluation

Dogfooding period:
7–14 days.

Daily questions:
- Did I use Shadow today?
- Did it reduce mental load?
- Was classification useful?
- Was dashboard clear?
- Did the report say something specific?

Weekly questions:
- What patterns did Shadow reveal?
- What was missing?
- Which UI blocks were useful?
- Which features were unnecessary?
- Did I want to return to the app?

---

## 6. MVP Success Definition

MVP is successful if:

- user uses Shadow 4+ days/week
- classification accuracy is around 80%+
- daily questions are completed 70%+ of the time
- weekly report feels specific
- user identifies at least 2 useful patterns
- user feels lower cognitive load
- product creates strong portfolio material
