# Prioritized Backlog

## P0 — MVP must
- Auth (magic link)
- Inbox text input + history
- Classification pipeline
- Life areas seeded
- Daily questions (5/day)
- Today summary card
- Life wheel chart
- Daily report
- Manual classification correction

## P1 — MVP nice
- Weekly review
- RAG retrieval in reports
- Insight cards w/ rating
- Goals CRUD
- Task list w/ status

## P2 — Post-MVP
- Voice input
- Photo of food → log
- Telegram bot
- Calendar integration (Google)
- Notion / Sheets export
- Mobile (Expo or Tauri)
- Multi-user social graph (probably never)

## Tech debt watchlist
- Embedding job → upgrade to queue (Inngest / pg-boss) when >1k entries
- Replace OpenAI embeddings w/ self-host if cost spikes
- Add full-text search (Postgres tsvector) alongside vector
