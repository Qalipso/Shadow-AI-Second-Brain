# Shadow — Risks and Tradeoffs

## 1. Scope Creep

### Risk
Shadow can easily become too large:
- tasks
- calendar
- food recognition
- health tracking
- finances
- journaling
- AI chat
- reports
- integrations
- mobile app

### Impact
MVP may never be finished.

### Mitigation
Keep MVP focused:
- text input only
- single-user dogfood mode
- 12 life areas
- basic dashboard
- daily questions
- daily/weekly reports
- basic RAG memory

Do not build integrations before the core loop works.

---

## 2. AI Hallucinations

### Risk
AI may invent patterns or overinterpret limited data.

### Impact
User loses trust.

### Mitigation
- Require confidence scores.
- Separate fact from interpretation.
- Use phrases like “based on available entries.”
- Show “not enough data” when needed.
- Ground reports in actual entries.
- Avoid strong claims from weak evidence.

---

## 3. Generic Reports

### Risk
Reports may become motivational filler.

### Impact
User stops reading.

### Mitigation
Reports must include:
- specific data
- actual patterns
- related life areas
- source-based observations
- concrete next actions
- uncertainty level

---

## 4. Manual Correction Burden

### Risk
If AI makes too many mistakes, user spends time cleaning data.

### Impact
Shadow becomes another chore.

### Mitigation
- Start with simple classification.
- Only ask for correction when confidence is low.
- Show lightweight correction UI.
- Store raw input even when classification is imperfect.
- Improve prompts based on correction patterns.

---

## 5. Privacy and Sensitive Data

### Risk
Shadow stores intimate personal data:
- emotions
- finances
- relationships
- health signals
- decisions
- personal thoughts

### Impact
User may not trust the system.

### Mitigation
MVP:
- allow deleting entries
- allow private entries
- exclude private entries from embeddings

Post-MVP:
- memory control panel
- data export
- delete all data
- local encryption exploration
- sensitive category warnings

---

## 6. Dashboard Overload

### Risk
Dashboard may become too crowded.

### Impact
Product increases cognitive load instead of reducing it.

### Mitigation
Prioritize:
- Today Summary
- AI Inbox
- Daily Questions
- Life Circle
- Active Tasks
- Insight
- Recent Entries

Everything else should be secondary.

---

## 7. Weak Habit Formation

### Risk
User may stop logging after a few days.

### Impact
No data, no value.

### Mitigation
- Daily questions reduce blank-page problem.
- Keep capture fast.
- Make first insight appear quickly.
- Show streak lightly, not aggressively.
- Make reports rewarding.

---

## 8. Emotional Overreach

### Risk
Shadow may sound like a therapist or diagnose the user.

### Impact
Unsafe and uncomfortable experience.

### Mitigation
AI must:
- avoid diagnosis
- avoid medical claims
- avoid therapeutic authority
- use reflective language
- suggest practical next steps
- recommend professional help only when appropriate and safely phrased

---

## 9. Cost of AI Calls

### Risk
Classification, reports, and embeddings may become expensive.

### Impact
Difficult to scale.

### Mitigation
MVP:
- classify only on entry creation
- generate daily report on demand
- generate weekly review manually
- use smaller models for classification
- use batching later

---

## 10. Poor Data Quality

### Risk
User may enter vague or incomplete data.

### Impact
Analytics become weak.

### Mitigation
- guided questions
- follow-up questions
- data completeness score
- confidence indicators
- “not enough data” states

---

## 11. Too Much Abstraction

### Risk
The product may sound philosophical but not useful.

### Impact
Weak portfolio/product case.

### Mitigation
Every feature must map to a practical use:
- capture
- classify
- review
- decide
- act

Avoid features that only sound cool.

---

## 12. RAG Irrelevance

### Risk
Memory search may retrieve irrelevant entries.

### Impact
Reports become confusing.

### Mitigation
- filter by user_id
- filter by date/life area
- combine semantic similarity with recency
- limit top_k
- ignore low-confidence matches

---

## 13. Tradeoff: Formula Scores vs AI Scores

### Option A — Formula Scores
Pros:
- predictable
- explainable
- cheap
Cons:
- less nuanced

### Option B — AI Scores
Pros:
- more contextual
- more human-like
Cons:
- less stable
- can hallucinate
- more expensive

### MVP Decision
Use hybrid:
- formula for baseline activity/counts
- AI for explanation
- confidence score always visible

---

## 14. Tradeoff: Manual vs Automatic Reports

### Automatic
Pros:
- magical
- low friction
Cons:
- cost
- may generate reports user does not read

### Manual Trigger
Pros:
- cheaper
- intentional
Cons:
- user may forget

### MVP Decision
Manual trigger for reports first.
Later: scheduled automatic reports.

---

## 15. Tradeoff: Single-User vs Multi-User

### Single-User
Pros:
- faster
- dogfood-ready
- simpler privacy
Cons:
- less scalable

### Multi-User
Pros:
- closer to real SaaS
Cons:
- more auth/security complexity

### MVP Decision
Use Supabase Auth but optimize for single-user dogfooding first.

---

## 16. Biggest MVP Risk

The biggest risk is building too much before proving the core loop.

Core loop:
raw input → AI classification → structured data → dashboard → report → useful insight.

Everything else is secondary.
