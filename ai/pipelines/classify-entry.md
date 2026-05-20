# Shadow — AI Classification Pipeline

## 1. Purpose

The classification pipeline transforms raw user input into structured life data.

Input:
- raw text
- optional source
- optional question context
- optional user goals
- optional recent memory snippets

Output:
- structured JSON
- life area links
- extracted entities
- scores
- risks
- follow-up questions
- confidence

---

## 2. Pipeline Steps

## Step 1 — Save Raw Entry

Before AI processing, save raw text to `entries`.

Set:
- processed_status = pending
- input_type = text
- source = ai_inbox or question_answer
- created_at = now

---

## Step 2 — Prepare AI Context

Send to AI:
- raw_text
- current date/time
- user language
- 12 life areas
- active goals if available
- recent related memories if available
- source type

---

## Step 3 — AI Classification

AI should return valid JSON only.

### System Prompt

You are Shadow’s classification engine.

Your job is to transform messy user life input into structured data.

Rules:
- Do not invent facts.
- Distinguish facts from interpretation.
- Use null when data is missing.
- Use confidence scores.
- Use the same language as the user where text output is needed.
- Do not diagnose mental or physical health conditions.
- Do not provide medical, legal, or financial advice.
- Avoid generic motivational comments.
- Extract only what is supported by the input.
- If uncertain, lower confidence.
- Return valid JSON only.

Classify input using these life areas:
1. Work / Career
2. Money / Finance
3. Health / Body
4. Energy / Sleep
5. Food / Nutrition
6. Mind / Learning
7. Creativity / Projects
8. Relationships / Social
9. Emotional State
10. Discipline / Habits
11. Environment / Home
12. Meaning / Direction

Allowed primary types:
- daily_reflection
- task
- goal
- expense
- food_log
- emotion
- idea
- project
- habit
- event
- decision
- risk
- note
- mixed

Return this JSON schema:
{
  "primary_type": string,
  "secondary_types": string[],
  "summary": string,
  "life_areas": [
    {
      "name": string,
      "confidence": number
    }
  ],
  "tags": string[],
  "mood_score": number | null,
  "energy_score": number | null,
  "stress_score": number | null,
  "importance_score": number | null,
  "urgency_score": number | null,
  "extracted_tasks": [
    {
      "title": string,
      "description": string | null,
      "priority": "low" | "medium" | "high" | null,
      "due_date": string | null,
      "confidence": number
    }
  ],
  "extracted_goals": [
    {
      "title": string,
      "description": string | null,
      "time_horizon": string | null,
      "confidence": number
    }
  ],
  "extracted_expenses": [
    {
      "amount": number | null,
      "currency": string | null,
      "category": string | null,
      "description": string,
      "confidence": number
    }
  ],
  "extracted_food_logs": [
    {
      "description": string,
      "estimated_calories": number | null,
      "quality_score": number | null,
      "confidence": number
    }
  ],
  "extracted_emotions": [
    {
      "emotion": string,
      "intensity": number | null,
      "valence": "positive" | "neutral" | "negative" | null,
      "context": string | null,
      "confidence": number
    }
  ],
  "mentioned_people": string[],
  "mentioned_projects": string[],
  "possible_patterns": string[],
  "risks": [
    {
      "title": string,
      "description": string | null,
      "severity": "low" | "medium" | "high",
      "confidence": number
    }
  ],
  "suggested_follow_up_questions": string[],
  "memory_candidates": [
    {
      "content": string,
      "reason": string,
      "importance": number
    }
  ],
  "confidence": number
}

---

## Step 4 — Validate JSON

Validation rules:
- JSON must parse.
- primary_type must be allowed.
- life_areas must match known list.
- scores must be 1–10 or null.
- confidence values must be 0–1.
- extracted arrays must exist even if empty.

If invalid:
- retry once with repair prompt
- if still invalid, save classification error

---

## Step 5 — Store Classification

Save to:
- `entry_classifications`
- `entry_life_areas`
- `tasks` if extracted_tasks exist
- `goals` if extracted_goals exist
- optional future tables for expenses, food, emotions

For MVP, complex objects can be stored inside `extracted_entities` JSON first.

---

## Step 6 — Generate Embedding

If entry is not private:
- create concise memory text:
  “Date: X. Summary: Y. Life areas: Z. Raw: original text.”
- generate embedding
- save to `memory_embeddings`

---

## Step 7 — Generate Micro-Insight

Optional for MVP.

Use when:
- confidence is high
- pattern is detected
- risk is detected
- entry relates to active goal

Example:
“Low energy and avoidance appeared together in this entry. If this repeats, Shadow should track it as a potential pattern.”

---

## 3. Example Input

Today I spent 1200 pesos on food, felt tired, worked on my portfolio, and avoided going to the gym.

## 4. Example Output

{
  "primary_type": "mixed",
  "secondary_types": ["expense", "emotion", "task", "habit"],
  "summary": "User spent money on food, felt tired, worked on portfolio, and avoided going to the gym.",
  "life_areas": [
    {"name": "Money / Finance", "confidence": 0.9},
    {"name": "Food / Nutrition", "confidence": 0.88},
    {"name": "Energy / Sleep", "confidence": 0.82},
    {"name": "Work / Career", "confidence": 0.8},
    {"name": "Health / Body", "confidence": 0.76},
    {"name": "Discipline / Habits", "confidence": 0.74}
  ],
  "tags": ["food", "tired", "portfolio", "gym avoidance"],
  "mood_score": null,
  "energy_score": 4,
  "stress_score": null,
  "importance_score": 0.6,
  "urgency_score": 0.2,
  "extracted_tasks": [],
  "extracted_goals": [],
  "extracted_expenses": [
    {
      "amount": 1200,
      "currency": "UYU",
      "category": "food",
      "description": "Food expense",
      "confidence": 0.85
    }
  ],
  "extracted_food_logs": [
    {
      "description": "Food purchase",
      "estimated_calories": null,
      "quality_score": null,
      "confidence": 0.5
    }
  ],
  "extracted_emotions": [
    {
      "emotion": "tired",
      "intensity": 0.7,
      "valence": "negative",
      "context": "General daily state",
      "confidence": 0.8
    }
  ],
  "mentioned_people": [],
  "mentioned_projects": ["portfolio"],
  "possible_patterns": ["Avoiding gym when tired"],
  "risks": [
    {
      "title": "Avoided health habit",
      "description": "User avoided going to the gym while feeling tired.",
      "severity": "low",
      "confidence": 0.7
    }
  ],
  "suggested_follow_up_questions": [
    "What caused the low energy today?"
  ],
  "memory_candidates": [
    {
      "content": "User felt tired and avoided going to the gym while working on portfolio.",
      "reason": "May become a recurring energy/discipline pattern.",
      "importance": 0.6
    }
  ],
  "confidence": 0.82
}

---

## 5. Error Handling

If AI fails:
- set processed_status = failed
- store error in ai_processing_logs
- show user: “Shadow could not structure this entry. The raw note was saved.”

If confidence is low:
- show classification as “needs review”
- ask user to confirm

If extracted data is sensitive:
- avoid embedding by default in future privacy mode
