# Shadow Interventions — QA Examples

Sample inputs and expected JSON shapes for the 4 intervention tools.
Use these to verify generation and rendering after prompt or schema changes.

State weighting must visibly change the output:
- **low energy** → steps 1–3 min, gentler tone, fewer items
- **high energy** → steps up to 10 min, bolder framing
- **mood=chaotic/overstimulated** → sensory reduction first
- **friction=cant_start** → laughably-small first move dominates
- **friction=cant_choose** → ONE clear path, no optionality

---

## 1. Task Paralysis Shatter

### Input

```json
{
  "type": "task_shatter",
  "energyLevel": "low",
  "mood": "tired",
  "friction": "cant_start",
  "input": {
    "task": "Update my CV",
    "notes": "I haven't touched it in 2 years and the latest job was rough."
  }
}
```

### Expected JSON shape

```json
{
  "kind": "task_shatter",
  "whyHeavy": "1-2 sentences. No diagnosis.",
  "firstAction": "<60 second move. e.g. 'Open the file. Nothing else.'",
  "steps": [
    { "id": "s1", "title": "short", "description": "1 sentence", "estimatedMinutes": 2 },
    { "id": "s2", "title": "short", "description": "1 sentence", "estimatedMinutes": 3 }
  ],
  "reward": "Quiet completion ritual. 1 sentence."
}
```

Steps must be 3–10 entries. With `energy=low`, expect ≤5 steps, all 1–3 minutes.

---

## 2. Dopamine Menu Architect

### Input

```json
{
  "type": "dopamine_menu",
  "energyLevel": "medium",
  "mood": "restless",
  "input": { "intent": "need a small win before the meeting" }
}
```

### Expected JSON shape

```json
{
  "kind": "dopamine_menu",
  "mode": "short phrase, e.g. 'pre-meeting micro-warmup'",
  "appetizers": [
    { "id": "a1", "title": "short", "description": "1 sentence", "estimatedMinutes": 5 }
  ],
  "entrees": [
    { "id": "e1", "title": "short", "description": "1 sentence", "estimatedMinutes": 20 }
  ],
  "sides": [
    { "id": "s1", "title": "short", "description": "1 sentence", "estimatedMinutes": 10 }
  ]
}
```

Each section: **exactly 3 items**. Every action must be doable right now without prep.

---

## 3. Context Switching Guide

### Input

```json
{
  "type": "context_switch",
  "energyLevel": "low",
  "mood": "tired",
  "input": {
    "finished": "Writing emails",
    "next": "Designing landing page"
  }
}
```

### Expected JSON shape

```json
{
  "kind": "context_switch",
  "title": "Emails → Landing Page",
  "physical": "1 sentence body move.",
  "sensory": "1 sentence music/light/tab change.",
  "mental": "1 sentence reframe.",
  "mantra": "≤ 14 words.",
  "firstAction": "≤ 18 words. Smallest concrete move in the new task."
}
```

Each of physical/sensory/mental must be distinct and < 90 seconds.

---

## 4. Interest-Based Filter

### Input

```json
{
  "type": "interest_filter",
  "energyLevel": "medium",
  "mood": "bored",
  "input": {
    "task": "Organize invoices",
    "interest": "Dark fantasy"
  }
}
```

### Expected JSON shape

```json
{
  "kind": "interest_filter",
  "questName": "Mature 3-6 word quest name.",
  "theme": "1 short phrase echoing the user's interest.",
  "stages": [
    { "name": "Stage 1 — short title", "action": "1-2 sentence concrete action.", "miniReward": "Small reward." },
    { "name": "Stage 2 — short title", "action": "1-2 sentence concrete action.", "miniReward": "Small reward." },
    { "name": "Stage 3 — short title", "action": "1-2 sentence concrete action.", "miniReward": "Small reward." }
  ],
  "finalUnlock": "1 sentence. Quiet, dark-premium tone."
}
```

Theme adds atmosphere only. Actions remain practical. **Always 3 stages.**

---

## Render Verification Checklist

For each result:

- [ ] First-action hero block visible at top of `ResultCard`
- [ ] "Start now" + "Add to Today" buttons in hero
- [ ] Step rows show checkboxes for shatter / menu / filter
- [ ] Conversion drawer offers: first / selected / all × today / inbox
- [ ] Status badge updates on Start / Complete / Archive
- [ ] "Save Pattern" persists into `memory_items` (not the full output)
- [ ] After page reload with `?id=<uuid>` the same result restores
- [ ] Latest draft auto-loads if no `?id=` in URL

## Lifecycle States

- `draft` → freshly generated
- `active` → user pressed Start
- `completed` → user pressed Complete
- `archived` → user pressed Archive
- `dismissed` → reserved (no UI yet)

## Failure modes

- AI returns invalid JSON → `502 AI output did not match schema.` (zod flatten in response)
- AI returns wrong `kind` → server forces `kind` to requested type before validation
- Daily cost cap exceeded → `429` with `spent_usd` and `cap_usd`
- Missing supabase/llm env → `503`
