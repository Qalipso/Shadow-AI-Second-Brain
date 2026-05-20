# Shadow — User Stories

## 1. Capture

### US-001 — Quick raw capture
As a user, I want to write anything into one input box so that I do not need to decide where it belongs.

Acceptance criteria:
- User can submit free text.
- Entry is saved as raw input.
- Entry appears in recent entries.
- Entry has timestamp and source.

Priority: P0

---

### US-002 — AI classification
As a user, I want Shadow to classify my raw text automatically so that I do not have to manually sort it.

Acceptance criteria:
- AI detects primary type.
- AI detects secondary types.
- AI links entry to relevant life areas.
- AI extracts structured objects when possible.
- AI returns confidence score.

Priority: P0

---

### US-003 — Classification preview
As a user, I want to see what Shadow understood from my entry so that I can trust or correct it.

Acceptance criteria:
- UI shows summary.
- UI shows detected life areas.
- UI shows extracted tasks, expenses, emotions, food logs, or goals.
- User can confirm result.

Priority: P0

---

### US-004 — Manual correction
As a user, I want to correct AI classification so that my data stays accurate.

Acceptance criteria:
- User can edit primary type.
- User can add/remove life areas.
- User can edit extracted task/expense/emotion.
- Correction is saved.

Priority: P1

---

## 2. Guided Questions

### US-005 — Daily questions
As a user, I want Shadow to ask me 5 guided questions so that I know what to reflect on.

Acceptance criteria:
- Dashboard shows 5 questions.
- Questions are selected from question bank.
- User can answer each question.
- Answers are stored.
- Answers can be used for daily report.

Priority: P0

---

### US-006 — Skip or replace question
As a user, I want to skip or replace a question so that the check-in does not feel forced.

Acceptance criteria:
- User can skip question.
- User can replace question.
- Skipped questions are tracked.
- Replacement question comes from same or related category.

Priority: P1

---

### US-007 — Question answer classification
As a user, I want Shadow to classify my answers so that they become structured data.

Acceptance criteria:
- Answer is saved as question answer.
- Answer can create linked entry.
- Answer is classified into life areas.
- Answer contributes to daily summary.

Priority: P0

---

## 3. Dashboard

### US-008 — Daily overview
As a user, I want to open Shadow and understand my current day quickly.

Acceptance criteria:
- Dashboard shows today summary.
- Dashboard shows recent entries.
- Dashboard shows life areas touched today.
- Dashboard shows mood/energy/stress if available.

Priority: P0

---

### US-009 — Life Circle
As a user, I want to see my life split into 12 areas so that I can understand where my attention is going.

Acceptance criteria:
- Dashboard shows 12 life areas.
- Each area has score or status.
- Each area shows data confidence.
- User can open area details.

Priority: P0

---

### US-010 — Cognitive load signal
As a user, I want Shadow to show overload signals so that I can notice when too many things are open.

Acceptance criteria:
- Dashboard shows number of open tasks.
- Dashboard shows unresolved risks.
- Dashboard shows stress/energy combination.
- Dashboard suggests one next action.

Priority: P1

---

## 4. Reports

### US-011 — Daily report
As a user, I want a daily report so that I can understand what happened today and what to do tomorrow.

Acceptance criteria:
- Report includes summary.
- Report includes active life areas.
- Report includes mood/energy/stress.
- Report includes tasks and key events.
- Report includes one insight and one next action.
- Report includes confidence level.

Priority: P0

---

### US-012 — Weekly review
As a user, I want a weekly review so that I can see patterns, neglected areas, and progress.

Acceptance criteria:
- Review includes main theme of week.
- Review includes 12 life area analysis.
- Review includes repeated patterns.
- Review includes unfinished tasks.
- Review includes goal progress.
- Review includes 3 recommendations.

Priority: P0

---

### US-013 — Rate insight usefulness
As a user, I want to rate whether an insight was useful so that Shadow can improve report quality.

Acceptance criteria:
- User can rate insight 1–5.
- Rating is stored.
- Rating is linked to insight/report.

Priority: P1

---

## 5. Memory

### US-014 — Store memory
As a user, I want Shadow to remember important entries so that I can return to them later.

Acceptance criteria:
- Entry summary is embedded.
- Embedding is stored in vector database.
- Entry can be retrieved by semantic search.

Priority: P0

---

### US-015 — Retrieve related context
As a user, I want Shadow to connect current input with previous similar entries so that I can see recurring patterns.

Acceptance criteria:
- New entry triggers memory search.
- Related memories are retrieved.
- AI can mention relevant past context.
- Low-confidence matches are not overused.

Priority: P1

---

### US-016 — Ask Shadow
As a user, I want to ask questions about my past entries so that I can understand my patterns.

Example questions:
- What was bothering me this week?
- What did I avoid?
- What lowered my energy?
- What goals did I ignore?

Acceptance criteria:
- User can ask natural language question.
- System retrieves relevant memories.
- Answer is grounded in retrieved entries.
- Answer indicates uncertainty when data is limited.

Priority: P2

---

## 6. Goals and Tasks

### US-017 — Extract task from entry
As a user, I want Shadow to extract tasks from my text so that I do not need to manually create them.

Acceptance criteria:
- AI detects task-like statements.
- Task is created with title.
- Task is linked to source entry.
- Task has status open by default.

Priority: P0

---

### US-018 — Track goals
As a user, I want to create goals so that Shadow can connect daily entries to long-term direction.

Acceptance criteria:
- User can create goal.
- Goal can link to life areas.
- Entries can be linked to goals.
- Dashboard shows active goals.

Priority: P1

---

## 7. Settings and Control

### US-019 — Memory control
As a user, I want to control what Shadow remembers so that I can trust the product.

Acceptance criteria:
- User can mark entry as private.
- Private entries are excluded from embeddings.
- User can delete entry.
- User can delete associated memory.

Priority: P2

---

### US-020 — Export data
As a user, I want to export my data so that I am not locked into Shadow.

Acceptance criteria:
- User can export entries.
- User can export reports.
- Export format is JSON or CSV.

Priority: P2
