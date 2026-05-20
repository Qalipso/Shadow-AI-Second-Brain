# Shadow — User Flows

## 1. First-Time Onboarding

### Goal
Create the first baseline of the user’s life structure.

### Flow
1. User opens Shadow.
2. User signs up or logs in.
3. Shadow shows short product explanation:
   - capture chaos
   - auto-structure life
   - review patterns
   - reduce cognitive load
4. User selects life areas they care about most.
5. User creates 1–3 active goals.
6. User answers baseline questions:
   - What feels overloaded right now?
   - What are you trying to improve?
   - What do you want Shadow to remember?
   - Which area of life needs the most attention?
   - What would make this system useful for you?
7. Shadow generates first baseline profile.
8. User lands on Dashboard.

### Output
- user profile
- selected life areas
- initial goals
- baseline entries
- first life circle estimate

---

## 2. Daily Check-In

### Goal
Help the user start the day/session with structured reflection.

### Flow
1. User opens Dashboard.
2. Shadow shows 5 guided questions.
3. User answers questions.
4. Each answer is saved.
5. Each answer is classified by AI.
6. Shadow updates:
   - mood
   - energy
   - stress
   - active life areas
   - tasks
   - risks
   - daily context
7. Shadow shows micro-summary:
   “Today looks work-heavy with medium energy and some avoidance risk. Choose one priority.”

### Output
- question answers
- linked entries
- daily context
- dashboard updates

---

## 3. Quick Capture

### Goal
Let the user dump any thought without manual sorting.

### Flow
1. User opens AI Inbox or dashboard input.
2. User writes natural text.
3. System saves raw entry.
4. System calls AI classification.
5. AI returns structured JSON.
6. UI shows:
   - summary
   - detected type
   - life areas
   - extracted objects
   - confidence
7. User confirms or edits.
8. System saves structured data.
9. System creates embedding.
10. Dashboard updates.

### Output
- raw entry
- classification
- extracted entities
- memory embedding
- updated dashboard

---

## 4. Classification Correction

### Goal
Improve accuracy and trust.

### Flow
1. User opens classification result.
2. User clicks edit.
3. User changes:
   - primary type
   - life areas
   - extracted values
   - tags
4. User saves correction.
5. System updates classification.
6. Event `classification_corrected` is tracked.

### Output
- corrected classification
- better data quality
- correction metric

---

## 5. Daily Report

### Goal
Summarize the day and suggest next action.

### Flow
1. User opens Reports.
2. User selects Daily Report.
3. System retrieves:
   - today’s entries
   - question answers
   - tasks
   - goals
   - life area scores
   - relevant memories
4. AI generates report.
5. Report is saved.
6. User reads report.
7. User rates usefulness.

### Output
- daily report
- insights
- recommendations
- usefulness rating

---

## 6. Weekly Review

### Goal
Reveal patterns and prepare next week.

### Flow
1. User opens Weekly Review.
2. System retrieves week data:
   - entries
   - daily reports
   - tasks
   - goals
   - life area scores
   - memories
3. AI identifies:
   - main theme
   - repeated emotions
   - neglected areas
   - progress
   - overload signals
4. System generates weekly review.
5. User selects next week focus.

### Output
- weekly review
- life area trends
- next week focus
- recommendations

---

## 7. Ask Shadow

### Goal
Let the user query personal memory.

### Flow
1. User asks a natural question:
   “What was bothering me this week?”
2. System embeds the query.
3. System retrieves relevant memories.
4. AI answers using retrieved context.
5. AI indicates uncertainty if data is limited.
6. User can open source entries.

### Output
- grounded answer
- source memories
- possible insight

---

## 8. Goal Creation and Tracking

### Goal
Connect daily data to long-term direction.

### Flow
1. User creates a goal manually or AI extracts one.
2. User links goal to life areas.
3. Entries can be linked to goal.
4. Dashboard shows active goal progress.
5. Weekly review includes goal movement.

### Output
- active goal
- linked entries
- progress signal

---

## 9. Memory Control

### Goal
Give user trust and control.

### Flow
1. User opens Memory/Timeline.
2. User selects entry.
3. User can:
   - delete entry
   - mark private
   - remove from memory
   - edit summary
4. System updates memory store.

### Output
- user control
- privacy safety
