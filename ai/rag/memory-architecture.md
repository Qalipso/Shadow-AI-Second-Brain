# Shadow — RAG Memory Architecture

## 1. Purpose

Shadow uses RAG memory to create continuity across days and weeks.

The goal is not only to store notes, but to help the user understand recurring patterns, unfinished threads, emotional loops, neglected goals, and long-term direction.

RAG memory should make reports and answers more personal, specific, and grounded.

---

## 2. Memory Principles

Shadow memory must be:

1. User-controlled
2. Searchable
3. Contextual
4. Grounded in user data
5. Confidence-aware
6. Privacy-conscious
7. Useful for reports and reflection

Shadow should not pretend to know more than it knows.

If data is limited, it should say so.

---

## 3. What Gets Embedded

MVP sources:
- raw entries
- entry summaries
- daily reports
- weekly reports
- goals
- important insights
- important decisions

Future sources:
- voice transcripts
- image summaries
- calendar events
- health data
- Telegram messages
- imported notes

---

## 4. Memory Object Format

Each memory embedding should include:

- user_id
- source_type
- source_id
- content
- metadata
- embedding
- created_at
- last_retrieved_at

Metadata example:
{
  "life_areas": ["Work / Career", "Emotional State"],
  "primary_type": "daily_reflection",
  "date": "2026-05-11",
  "importance": 0.7,
  "confidence": 0.82,
  "is_private": false
}

---

## 5. Embedding Strategy

For each entry, create a memory text like:

Date: 2026-05-11
Type: mixed
Life areas: Work / Career, Food / Nutrition, Energy / Sleep
Summary: User felt tired, spent money on food, worked on portfolio, and avoided gym.
Raw note: Today I spent 1200 pesos on food, felt tired, worked on my portfolio, and avoided going to the gym.

Embed this memory text.

For reports, embed:
- report type
- period
- summary
- key patterns
- recommendations

For goals, embed:
- goal title
- description
- life areas
- current status

---

## 6. Retrieval Use Cases

## 6.1 Daily Report

Retrieve:
- today’s entries
- similar past entries from last 30 days
- active goals
- recent insights

Purpose:
- detect repeated patterns
- personalize recommendations
- avoid generic summaries

---

## 6.2 Weekly Review

Retrieve:
- entries from the week
- reports from previous weeks
- active goals
- recurring patterns
- relevant emotional/discipline memories

Purpose:
- compare week to previous patterns
- identify neglected areas
- find recurring loops

---

## 6.3 Ask Shadow

User asks:
“What was bothering me this week?”

System:
1. Embed query.
2. Search memory embeddings.
3. Filter by time period if mentioned.
4. Retrieve top memories.
5. Generate grounded answer.

Answer should include:
- direct answer
- supporting memories
- uncertainty level
- possible pattern
- optional next question

---

## 7. Retrieval Logic

MVP retrieval:
- vector similarity search
- filter by user_id
- optional date range
- optional life area
- top_k = 5–10

Recommended scoring:
combined_score =
0.65 * vector_similarity
+ 0.15 * recency_score
+ 0.10 * importance_score
+ 0.10 * life_area_match

---

## 8. Memory Safety

MVP:
- allow entry deletion
- exclude private entries from embeddings
- delete embedding when source entry is deleted

Post-MVP:
- memory control panel
- view remembered facts
- delete specific memory
- disable memory by category
- export data
- sensitive-data detection
- local-only mode exploration

---

## 9. RAG Answer Rules

When using retrieved memories, AI must:

- not invent unsupported facts
- mention if data is limited
- separate observation from interpretation
- avoid diagnosis
- avoid absolute claims
- use phrases like:
  - “Based on your entries...”
  - “This appears in several notes...”
  - “With low confidence...”
  - “This may be a pattern, but more data is needed...”

---

## 10. Example RAG Response

User:
“What usually lowers my energy?”

Retrieved memories:
- several entries mention poor sleep
- several entries mention overeating
- several entries mention job search anxiety

Answer:
“Based on your recent entries, low energy seems most often connected with three contexts: poor sleep, evening overeating, and stress around career/portfolio direction. The strongest signal is sleep/energy, because it appears directly in multiple entries. Food and career stress are possible secondary factors, but the data is still limited.”

---

## 11. MVP Implementation Steps

1. Add pgvector extension.
2. Create `memory_embeddings` table.
3. Generate embedding after entry classification.
4. Store embedding with metadata.
5. Build memory search function.
6. Use memory search in daily report generation.
7. Use memory search in weekly review generation.
8. Add basic Ask Shadow later.

---

## 12. Risks

Risk: irrelevant memories retrieved.
Mitigation: use filters and confidence threshold.

Risk: AI overinterprets old entries.
Mitigation: force AI to cite retrieved context and mention uncertainty.

Risk: sensitive data stored.
Mitigation: private mode and delete memory.

Risk: memory grows too large.
Mitigation: summarize old entries into weekly/monthly memory summaries.
