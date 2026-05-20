# Privacy

Shadow is a personal operating system for your inner life. Privacy is not a legal checkbox — it's a product value.

---

## What Shadow stores

### In Supabase (your data)
| Data type | Where | Purpose |
|-----------|-------|---------|
| Raw entries | `inbox_entries` table | Source material for all analysis |
| Structured signals | `inbox_entries.metadata` | AI-parsed emotion, areas, tasks, patterns |
| Life area scores | `life_areas` table | Your Life Circle map |
| Vector embeddings | `entries_embeddings` table | Enables semantic search and RAG |
| Insights | `insights` table | Generated observations with source links |
| Rituals + logs | `rituals`, `habit_logs` tables | Habit tracking |
| Profile preferences | `profiles` table | AI tone, focus areas, terms version |

### In OpenAI
- Text of your captures is sent to OpenAI for classification and embedding generation
- OpenAI does not use API data to train models by default (API usage policy)
- No persistent identity is linked on OpenAI's side

---

## Private Mode

When Private Mode is enabled:
- Entries are saved to Supabase but marked `is_private: true`
- Private entries are **never** sent to OpenAI for processing
- Private entries are excluded from AI analysis, reports, and insights
- They can still be manually searched and viewed

---

## Your controls

| Action | How |
|--------|-----|
| Export all data | Settings → Export → JSON download |
| Delete an entry | Entry menu → Delete (cascades to embeddings) |
| Delete account | Settings → Delete Account (permanent, all data removed) |
| Disable AI processing | Settings → Privacy → disable OpenAI classification |
| Enable Private Mode | Settings → Privacy → Private Mode |

---

## Third-party services

| Service | Data sent | Purpose |
|---------|-----------|---------|
| OpenAI | Capture text | Classification + embeddings |
| Supabase | All stored data | Database + auth |
| Spotify (optional) | Auth token only | Music tracking integration |

---

## Questions

For privacy questions or data deletion requests beyond the in-app controls, contact: [your-email@example.com]
