# Shadow — PRD v0.2

## 1. Vision
Shadow = AI personal operating system + second memory + life analytics layer. External cognitive layer absorbing chaotic life input, structuring it, linking to long-term memory, surfacing patterns, guiding decisions.

Not a task manager. Not a journal. Not a calendar. Not a habit tracker. Not a Notion clone. Interface to user's own "shadow" — hidden patterns, overloads, desires, repeating mistakes, direction.

## 2. Target users
Founders, PMs, creators, developers, artists, self-employed specialists, people in transitions, self-development users. Mental model: "Too much in my head. I lose priorities. I want a system that doesn't demand maintenance."

## 3. Problem
Brain can't hold tasks + work + money + food + health + emotions + relationships + habits + creativity + goals simultaneously. Existing tools push manual sorting → tool becomes load instead of relief.

## 4. Hypotheses
**Product:** Users capture chaotic input via one AI interface without manual sorting → more capture + less overload + clearer self-insight.

**MVP:** Shadow ships AI Inbox + 5 daily questions + auto-classification + 12-area life wheel + daily report + weekly review + basic RAG → first user (me) uses 7–14 days straight and gets enough data to know if system reduces load.

## 5. MVP scope (text-only, single-user, web)
- AI Inbox (free text + history)
- Auto-classification → structured entities
- 12 Life Areas (seeded)
- 5 daily guided questions
- Dashboard (Today Summary, Life Circle, mood/energy/stress, tasks, recent entries, AI Insight)
- Daily report
- Weekly review
- RAG memory via pgvector
- Manual correction UI
- Personal dogfood mode

**Out:** voice, food photo, expense screenshots, calendar integrations, Telegram bot, mobile, multi-user, subscriptions, predictive analytics.

## 6. Core flow
1. Open Shadow → dashboard.
2. See 5 daily questions.
3. Answer or skip.
4. Free-write in AI Inbox anytime.
5. AI classifies → stores structured → embeds → updates dashboard → optional follow-up.
6. End of day: daily report.
7. End of week: weekly review.

### Example input
"Сегодня проснулся поздно, чувствовал себя разбитым, потратил 1200 песо на еду, сделал 2 задачи, думал про портфолио, вечером переел, но придумал идею для Shadow."

### AI must extract
fatigue + expense (1200 UYU food) + nutrition + 2 completed tasks + portfolio thought + overeating + idea for Shadow + overload signal + link to portfolio goal. Areas: Money, Food, Energy, Work, Creativity, Emotion, Discipline.

## 7. Guided questions
Users freeze on blank input. Shadow always shows 5 prompts. Selection: semi-random initially → context-aware (time of day, prior answers, active goals, low-coverage areas, repeating patterns, weekly review needs). Bank: `db/seeds/question_bank.sql`. Answers stored as entries, classified normally, feed report + dashboard.

## 8. 12 Life Areas
Work / Money / Health / Energy / Food / Mind / Creativity / Social / Emotion / Discipline / Environment / Meaning. One entry → multiple areas. Per area: activity, emotional tone, progress, overload, entry count, active tasks/goals, repeating patterns, confidence. Score 1–10. Write "insufficient data" if low N.

## 9. Dashboard
10–20 sec answer to: what's with me today / what matters / where overload / which areas active or sagging / what next.

Blocks: Today Summary, 5 questions, AI Inbox input, Life Circle, mood/energy/stress cards, active tasks, active goals, recent entries, AI Insight of the Day, cognitive load card, link to daily report.

Visual: dark, warm, premium, calm, slightly mystical, futuristic "control center for inner life". Not corporate SaaS / Notion / medical tracker / cyberpunk neon.

## 10. Reports
**Daily:** summary, mood/energy/stress, active areas, key events, tasks created/completed, emotional tone, overload signals, main insight, tomorrow recommendation, confidence.

**Weekly:** main theme, 12-area changes, most active / most neglected, repeating emotions, repeating problems, goal progress, unfinished tasks, overload signals, 3 next-week recommendations, 1 focus area.

Rule: no generic motivational text. Every conclusion sources from entries / repeated pattern / user answer / missing-data flag. Low data ⇒ low confidence stated.

## 11. RAG memory
Embed: raw entries, classification summaries, daily reports, weekly reports, goals, key insights. Use for similar-entry retrieval, pattern detection, contextual reports, queries like "what drained my energy?", "what do I keep postponing?". Memory safety post-MVP: view, delete, mark private, export.

## 12. AI classifier output (full)
```
primary_type, secondary_types, summary, life_areas,
mood_score, energy_score, stress_score,
extracted_tasks, extracted_goals, extracted_expenses,
extracted_food_logs, extracted_emotions,
mentioned_people, mentioned_projects,
possible_patterns, risks,
suggested_follow_up_questions, confidence
```

AI rules: no invented facts, separate observation vs interpretation, confidence score, user language, no diagnoses, no medical/legal/financial expert advice, non-therapeutic tone, no repeated insights, state "insufficient data" when low.

## 13. Stack
Next.js + TS + React + Tailwind + shadcn/ui. Supabase Auth + Postgres + pgvector. Claude API (Haiku classify / Sonnet reports). Recharts. Vercel. PostHog (or in-house events table).

## 14. North Star
**Structured Life Days per Week.** Day counts when: ≥3 meaningful entries OR all 5 daily questions; ≥3 life areas touched; mood/energy logged; ≥1 extracted task/goal/metric/insight; daily summary generated. Target dogfood: ≥4 structured days/week.

## 15. Secondary metrics
entries/active day, active capture days/week, question completion rate, classification accuracy (manual sample), correction rate, area coverage, daily report open rate, weekly review completion, insight usefulness rating, cognitive load improvement.

## 16. Events
entry_created, entry_classified, classification_corrected, question_answered, daily_questions_completed, dashboard_viewed, daily_report_generated, daily_report_opened, weekly_review_generated, weekly_review_opened, insight_rated, task_created_from_ai, goal_created, life_area_score_updated, memory_retrieved.

## 17. Vertical slice (first demo)
Dashboard shell + AI Inbox input + entries table + classification endpoint + classification preview + recent entries list. No reports/voice/images/advanced memory yet.

**Proof scenario:**
Input: "Today I spent 1200 pesos on food, felt tired, worked on my portfolio, and avoided going to the gym."
Output: expense 1200 UYU food / emotion tired / areas Money+Food+Work+Health+Discipline / risk skipped gym habit / summary "Low energy, spent on food, worked on portfolio, skipped gym" / follow-up "What caused the low energy today?". Core loop proven.

## 18. Risks → mitigations
| Risk | Mitigation |
|------|-----------|
| Scope creep | Freeze MVP scope after Phase 0; backlog rest |
| AI hallucinations | Require source + confidence on every conclusion |
| Correction burden | Start with few classification types; iterate |
| Personal data sensitivity | RLS, no analytics on raw text, memory controls post-MVP |
| Generic reports | RAG context + structured data fields |
| Overloaded dashboard | Limit to core blocks; one primary action |
| Weak habit formation | 5 daily questions reduce blank-page friction |
| Abstract value | Tie every feature to a daily use moment |
| Expensive AI | Haiku for classify; batch summaries; cache by content hash |
| Emotional overreach | No therapy/diagnosis tone; gentle phrasing |

## 19. Competitive position
- AI second brain (Mem, Reflect, Capacities, Tana, Notion AI) → Shadow auto-structures, they manual.
- Planning/calendar (Motion, Reclaim, Sunsama) → Shadow not a scheduler.
- Life analytics (Exist, Bearable, Daylio) → Shadow combines NL capture + analytics.
- Passive memory (Limitless, Rewind) → Shadow is active capture + interpretation.

Differentiation: NL capture + guided questions + AI auto-structure + 12-area analytics + RAG memory + reports + personal OS logic. Personal **life intelligence layer**.

## 20. Role for portfolio
Founder / Product Manager / Technical Product Lead / AI Product Builder.
Responsibilities: vision, dogfood-driven research, PRD, UX flows, IA, AI system design, data model, implementation, metrics, case study.

## 21. Success
MVP succeeds if: dogfood ≥7 consecutive days, ≥4 structured days/week, classification accuracy ≥80% on 30 sampled entries, at least one daily report that changes behavior next day, weekly review feels actionable not generic, portfolio case study draft published.

## 22. Linked artifacts
- Schema: `db/schema/shadow.sql`
- Seeds: `db/seeds/life_areas.sql`, `db/seeds/question_bank.sql`
- AI: `ai/prompts/`, `ai/pipelines/classify-entry.md`, `ai/rag/memory-architecture.md`
- Design: `design/brief/design-brief.md`, `design/tokens/tokens.json`
- Planning: `planning/roadmap.md`, `planning/backlog.md`, `planning/sprint-01.md`, `planning/events-tracking.md`, `planning/agents-skills.md`
- Case: `case-study/shadow-case-study.md`
- Master plan: `PLAN.txt`
