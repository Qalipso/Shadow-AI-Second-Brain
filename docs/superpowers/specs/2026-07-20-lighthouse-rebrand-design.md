# LightHouse — rebrand design spec

**Date:** 2026-07-20
**Status:** Design approved by product owner (Eduard). Not yet implemented.
**Predecessor:** Shadow — AI Second Brain (`Qalipso/Shadow-AI-Second-Brain`, this repo)

## 1. Why

The product owner wants to move away from Shadow's psychology/trauma/reflection framing toward a
new identity, **LightHouse**, focused on clarity, an easy connection to any AI, and a reliable
"core" — informed by what actually worked and didn't in Shadow, not a guess.

## 2. Evidence: what to keep vs what was the mistake

An architecture-agent retro (this session, read-only, no repo mutation) read `ARCHITECTURE.md`,
`db/schema/shadow.sql`, `supabase/migrations/*`, `web/src/ai/prompts/*`, and all of `Branding/*.md`.
Findings:

- **The core engine is domain-neutral and was not the mistake.** Capture → classify → embed →
  retrieve → synthesize (`entries`, `entry_classifications`, `memory_embeddings`,
  `memory_items`/`memory_graph_nodes`/`edges`) rides on generic tables and neutral prompts
  (`classification.ts`, `memory-synthesis.ts`). A partial multi-provider abstraction already exists
  (`lib/llm-provider/`, ADR-011) but is only wired on ~5 of 23 call sites.
- **The existing branding pass was already anti-clinical**, not the trauma-heavy caricature it might
  read as from the outside: `PositioningDoc.md` explicitly says Shadow "is not positioned as a
  therapist" and "avoids diagnosis and treatment language"; `messaging.md` bans clinical claims.
  Much of that guardrail language carries forward unchanged (§4).
- **The actual structural mistake is narrow: the Labs subsystem.** Dedicated schema
  (`labs_tests/questions/answer_options/sessions/answers/results` +
  `profile_ai_summary.personality_json/values_json`), a dedicated UI, and a prompt that opens
  *"You are Shadow's internal psychological analyst"* (`labs-analysis.ts`). This is the one place
  psychology reaches into the durable data model. Interventions and Sonic Mirror are isolated
  bolt-on tables, not structural, but still not part of LightHouse's identity.

**Decision (confirmed with product owner):** drop Labs, Interventions, and Sonic Mirror entirely.
Everything else in the core engine is sound and carries forward.

## 3. Positioning & message house

**Category:** not "second brain" / "AI memory system for reflection" — that's Shadow's category.
LightHouse's category: **a portable memory core for AI** — the part of an AI setup that doesn't
change when the model does.

**One-liner:** *"LightHouse is a fixed point in your noise — one memory, every AI."*

**Message hierarchy** (rational claim leads; beacon is the register, not a second headline):
1. **Core claim:** "Your memory shouldn't belong to one AI. LightHouse is the core that
   remembers — capture once, use it with any model you plug in."
2. **Beacon register (voice/tone):** life produces noise; LightHouse holds one steady, reliable
   point of clarity in it. Calm, watching, doesn't dramatize — a lighthouse keeper's tone, not
   mystical, not clinical.
3. **Proof point:** built on the same capture → classify → embed → retrieve → synthesize engine
   already dogfooded daily in Shadow — not a paper concept.

**Tagline candidates:** "One memory. Every AI." / "A fixed point in the noise." / "Your memory,
not the model's." (final pick deferred to copywriting pass).

## 4. Guardrails (what NOT to do)

Carried forward from `Branding/messaging.md` (still correct):
- No clinical/diagnostic language.
- No "shadow self" / trauma / dark-psychology framing.
- No personality- or values-profiling claims (Labs is dropped — this guardrail is now structural,
  not just tonal).

New guardrail for this pivot:
- **Don't oversell "every AI."** The provider abstraction (ADR-011) is real but only covers ~5 of
  23 call sites today. Copy should say "connects to the AI you choose" and name what's live, not
  promise universal day-one support. This is a `no-fake-claims` requirement, not just a style note.

## 5. What NOT to carry over

- Labs subsystem: schema, UI, and `labs-analysis.ts` prompt — dropped, not reframed.
- Interventions and Sonic Mirror: dropped (isolated bolt-on tables, not core).
- "Shadow/Shady" darkness-mascot metaphor and "Labs / archetypes / self-discovery" copy
  (`messaging.md` §8, `PositioningDoc.md` §24).
- Dark, psychology-coded visual language from `Branding/ProductVisualInventory.md` (superseded by
  §6 below).

## 6. Visual identity (approved via visual-companion session)

- **Direction:** "Clear Signal" — light/near-white surface, not Shadow's dark UI. Reads as
  product/tooling, optimistic, daytime — "clarity" over "beacon-in-the-dark."
- **Palette:** ink `#12151c`, signal-blue `#3884ff`, near-white background `#f6f7f9` /
  `#ffffff`, neutral gray `#5b6270` for secondary text.
- **Wordmark:** `LightHouse` (CamelCase — the two-syllable blocks Light + House read clearly and
  suit a logotype), weight ~800, tight letter-spacing (-0.02em to -0.03em), "House" set in
  signal-blue against ink-colored "Light."
- **Mark:** a dark core dot (`#12151c`) with three concentric signal-blue rings broadcasting
  outward at decreasing opacity (0.8 / 0.5 / 0.28) — a merged concept (broadcast/signal rings
  around a solid core node, satellite-node lines dropped). Reads as "one core, signal reaching
  out," ties directly to the "one memory, every AI" claim. Tested legible down to 16–20px
  (favicon size).
- **Typography:** system sans (`ui-sans-serif` stack) for the wordmark and UI; monospace for
  technical/status labels (e.g. "one memory · every ai" micro-label), consistent with Shadow's
  existing use of mono for system-y text.
- Full mockups from the design session live at
  `/private/tmp/claude-501/-Users-eduardshatalov-Documents-ClaudeBrain/82a1b081-0817-41c8-ac76-9f7f091a6945/scratchpad/.superpowers/brainstorm/19822-1784595189/content/` (session-scoped, not committed —
  production SVG/asset export is a follow-up implementation task, not part of this spec).

## 7. Technical approach

**New repository**, not an in-place rename of `Shadow-AI-Second-Brain`. Copy over the reusable
core; do not carry Labs/Interventions/Sonic Mirror code, migrations, or routes.

Reusable as-is (copy):
- Capture → classify → embed → retrieve → synthesize pipeline (`web/src/ai/prompts/classification.ts`,
  `memory-synthesis.ts`, `lib/embeddings.ts`, `lib/rag.ts`, `lib/memory/context.ts`).
- Memory graph (`memory_items`, `memory_graph_nodes`/`edges`).
- Auth/RLS, cost ledger (`lib/llm.ts`, `cost-ledger.ts`).
- Partial provider abstraction (`lib/llm-provider/`) — becomes a priority to finish, not just carry
  over, since "every AI" is now the headline claim.
- Voice capture, AI Inbox, daily check-in/report/weekly review, Direction/missions/tasks, Rituals
  (generic capture/reflection variants — keep, reframe copy only).
- Life Areas wheel — seed data, not schema logic; keep the mechanism, revisit the specific 12 areas
  as part of copy/reframing (not this spec's decision).

Explicitly not carried over: `labs_*` tables, `profile_ai_summary.personality_json/values_json`,
Interventions tables/UI, Sonic Mirror tables/UI, `labs-analysis.ts`, `shadow-chat.ts` persona copy
(ShadowOrb chat mechanism stays; persona/copy gets rewritten under the new voice in §3).

Package/wordmark form for code: `LightHouse` (e.g. package name `lighthouse-web`, mirroring
Shadow's `shadow-web`).

**Known doc/code drift found during retro** (fix during migration, don't propagate): the
`DECISIONS/` ADRs referenced in `ARCHITECTURE.md` (ADR-011, ADR-014, 007-rls-everywhere) do not
exist as files in this repo; README's 12 life-area names disagree with the classifier's actual 12
slugs.

## 8. Open items (deferred — not blocking this spec)

- Final tagline pick (copywriting pass).
- Repo name / GitHub org / domain for LightHouse (not decided in this session).
- Whether to finish ADR-011's provider abstraction before or as part of the LightHouse migration.
- Production asset export (SVG/PNG/favicon set, logo usage guidelines) from the approved mark.
- Life Areas content revisit (mechanism kept, specific 12 areas not re-litigated here).

## 9. Next step

Hand off to `writing-plans` for a phased implementation plan (new repo scaffold → core module
copy → prune Labs/Interventions/Sonic Mirror → rebrand copy/prompts/assets → finish provider
abstraction).
