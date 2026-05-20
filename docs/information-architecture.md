# Shadow — Information Architecture

## 1. Product Structure

Shadow is organized around four main layers:

1. Capture
2. Structure
3. Analysis
4. Reflection

### Capture
Where raw life input enters the system.

Includes:
- AI Inbox
- Daily Questions
- Quick Add
- Future: voice, image, screenshots, Telegram

### Structure
Where AI transforms raw input into organized data.

Includes:
- Entries
- Classifications
- Tasks
- Goals
- Life Areas
- Insights
- Memory Embeddings

### Analysis
Where structured data becomes visible.

Includes:
- Dashboard
- Life Circle
- Metrics
- Trends
- Cognitive Load
- Goal Progress

### Reflection
Where Shadow explains patterns.

Includes:
- Daily Report
- Weekly Review
- Ask Shadow
- Timeline
- Memory Search

---

## 2. Main Navigation

MVP navigation:

1. Dashboard
2. AI Inbox
3. Daily Questions
4. Life Circle
5. Reports
6. Goals
7. Tasks
8. Memory / Timeline
9. Settings

---

## 3. Screens

## 3.1 Dashboard

Purpose:
Daily command center.

Main blocks:
- Today Summary
- AI Inbox input
- Daily Questions progress
- Life Circle preview
- Mood / Energy / Stress
- Active Tasks
- Active Goals
- Recent Entries
- AI Insight of the Day
- Cognitive Load

Primary actions:
- add entry
- answer questions
- open report
- review tasks
- open life area

---

## 3.2 AI Inbox

Purpose:
Raw capture and classification.

Main blocks:
- text input
- submit button
- classification preview
- recent entries
- filters by type/life area

Primary actions:
- create entry
- confirm classification
- correct classification
- open entry details

---

## 3.3 Daily Questions

Purpose:
Guided check-in.

Main blocks:
- 5 question cards
- answer fields
- progress indicator
- replace/skip buttons
- completion summary

Primary actions:
- answer question
- skip question
- replace question
- complete check-in

---

## 3.4 Life Circle

Purpose:
12-area life analytics.

Main blocks:
- radial chart
- 12 area cards
- score
- confidence
- trend
- related entries
- active tasks/goals by area

Primary actions:
- open area details
- filter entries by area
- review neglected areas

---

## 3.5 Reports

Purpose:
Daily and weekly reflection.

Main blocks:
- daily report list
- weekly review list
- report content
- insights
- recommendations
- usefulness rating

Primary actions:
- generate report
- open report
- rate report
- create task from recommendation

---

## 3.6 Goals

Purpose:
Long-term direction.

Main blocks:
- active goals
- progress score
- linked life areas
- linked entries
- next actions

Primary actions:
- create goal
- update progress
- link entry
- archive goal

---

## 3.7 Tasks

Purpose:
Manage AI-extracted and manual tasks.

Main blocks:
- open tasks
- overdue tasks
- completed tasks
- task source entry
- priority
- life area links

Primary actions:
- complete task
- edit task
- link to goal
- delete task

---

## 3.8 Memory / Timeline

Purpose:
Searchable history of user life data.

Main blocks:
- chronological entries
- semantic search
- filters
- source entries
- insights
- memory controls

Primary actions:
- search memory
- open entry
- mark private
- delete memory

---

## 3.9 Settings

Purpose:
User preferences, privacy, AI behavior.

Main blocks:
- profile
- AI tone
- question frequency
- memory settings
- data export
- privacy controls

Primary actions:
- update settings
- export data
- delete memory
- disable embedding for private entries

---

## 4. Core Entities

Main entities:
- User
- Entry
- EntryClassification
- LifeArea
- Question
- QuestionAnswer
- Task
- Goal
- Report
- Insight
- MemoryEmbedding
- LifeAreaScore
- AIProcessingLog

---

## 5. Data Relationships

User has many:
- entries
- question answers
- tasks
- goals
- reports
- insights
- memory embeddings
- life area scores

Entry has:
- one classification
- many life area links
- optional extracted tasks
- optional extracted goals
- optional insights
- optional embedding

Report has:
- period
- summary
- structured JSON
- recommendations
- life area scores
- related entries

MemoryEmbedding belongs to:
- user
- source object
- metadata

---

## 6. MVP Priority

P0 screens:
- Dashboard
- AI Inbox
- Daily Questions
- Reports
- Life Circle

P1 screens:
- Goals
- Tasks
- Memory / Timeline

P2 screens:
- Advanced Settings
- Ask Shadow
- Data export
