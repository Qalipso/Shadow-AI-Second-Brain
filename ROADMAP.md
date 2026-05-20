# Roadmap

Living document. Updated after every sprint.

---

## Horizon 1 — MVP (Done · v0.1)

Single user, text-only, web-only. Dogfooded daily.

| Sprint | Theme | Status |
|--------|-------|--------|
| 01 | Foundation skeleton + auth + Inbox | ✅ |
| 02 | Classification + 12-area wheel + check-in | ✅ |
| 03 | RAG memory hardening + daily report | ✅ |
| 04 | Direction (missions/tasks) + protocols | ✅ |
| 05 | Interventions (4 tools) + ShadowOrb chat | ✅ |
| 06 | Labs (self-knowledge) + persona injection | ✅ |
| 07 | Sonic Mirror (Spotify) | ✅ |

---

## Horizon 2 — Refinement (Now · v0.2)

Polish UX, fix dogfood pain points, prep for friends-and-family.

| Sprint | Theme | Target |
|--------|-------|--------|
| 08 | Mobile-responsive web | Q2 |
| 09 | Voice capture (Whisper) | Q2 |
| 10 | Friends-and-family invites (RLS already supports) | Q2-Q3 |
| 11 | Weekly digest email | Q3 |
| 12 | Plugin/skill system (custom classifiers) | Q3 |

### v0.2 acceptance criteria
- Used daily by ≥ 5 people for 4 consecutive weeks
- Mobile usable as primary capture surface
- Cost per active user < $0.30/day with current routing

---

## Horizon 3 — Multi-user (Next · v1.0)

Subscription billing, onboarding flow, support tooling.

| Sprint | Theme | Target |
|--------|-------|--------|
| 13 | Stripe billing + subscription tiers | Q4 |
| 14 | Onboarding tour + sample data | Q4 |
| 15 | Admin dashboard (cohort metrics, cost overruns) | Q4 |
| 16 | Native iOS app (React Native shell over existing API) | Q1 |
| 17 | Encrypted backup → user-owned storage | Q1 |

### v1.0 acceptance criteria
- 100+ paying users
- Sub-200ms median capture time
- < 1% data loss rate over 30 days
- Daily Active / Weekly Active ratio ≥ 0.5

---

## Always-On Workstreams

- **Cost optimization** — Continuous review of model routing + cap defaults
- **Prompt versioning** — Every prompt change creates a new file in `ai/prompts/` with version note
- **Security hardening** — Quarterly RLS audit + dependency scan
- **Documentation** — ADR for every significant decision; FLOW for every new user journey

---

## Out of Scope (forever or for now)

- ❌ Multi-language UI (English + Russian only)
- ❌ Calendar integration (intentional — Shadow ≠ calendar)
- ❌ Real-time collaboration
- ❌ Social/sharing features
- ⏸ Mobile-native (React Native shell planned; native Swift/Kotlin no)
- ⏸ E2E encryption for at-rest data
- ⏸ Self-hosting / Docker image

---

## How to propose changes

1. Open a discussion issue with `roadmap` label
2. Draft an ADR in `DECISIONS/` if architectural
3. Update this file in the same PR
