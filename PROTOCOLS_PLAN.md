# LifeOS Protocols — Implementation Plan

**Feature:** Habit tracker module ("Habit Command Center")
**Route:** `/protocols`
**Spec:** `lifeos_protocols_habit_command_center_tz.md`

---

## Improvements Over Spec

1. **Gamification integrated** — habit completion awards points via existing `user_gamification` table (10 pts done, 5 pts partial, 3 pts recovered). Reuses `lib/gamification/points.ts` pattern.
2. **Life Sphere wiring** — habit spheres map directly to existing `life_areas` slugs; completion increments relevant `daily_wheel_scores` columns.
3. **Simplified DB** — no separate `habit_schedules` table; schedule stored as `jsonb` in `habits`. No `habit_score_snapshots` for MVP — compute strength on the fly and cache in `habits.strength_score`.
4. **No photo evidence in MVP** — text notes + manual timer only; reduces infra complexity.
5. **Dashboard widget** — minimal "Today's Protocols" status row on `/dashboard`.
6. **Design continuity** — uses existing CSS vars (`--bg-elev1/2`, `--border`, `--accent-warm`) + adds cyber-specific new vars.
7. **Recovery Queue** — surfaced both on `/protocols` and as a shortcut card on `/dashboard`.
8. **Sidebar slot** — "Protocols" added after "Reports", before "Goals".

---

## Phase 1 — DB Migration + Zod Types

### Files to create/modify

**New migration:** `supabase/migrations/20260514_protocols.sql`

Tables:
```sql
-- habits
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'binary',        -- binary|measurable|timer|avoidance|ritual
  sphere_slugs TEXT[] NOT NULL DEFAULT '{}',  -- refs life_areas.slug
  schedule JSONB NOT NULL DEFAULT '{}',       -- { type, daysOfWeek, timesPerWeek, timeWindow }
  target_value NUMERIC,
  target_unit TEXT,
  minimum_version TEXT,
  ideal_version TEXT,
  why TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',  -- easy|medium|hard
  priority TEXT NOT NULL DEFAULT 'medium',    -- low|medium|high
  evidence_types TEXT[] DEFAULT '{manual}',
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time TEXT,
  is_active BOOLEAN DEFAULT true,
  strength_score NUMERIC(5,2) DEFAULT 50,     -- 0-100, cached
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- habit_logs
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL,                       -- done|partial|skipped|missed|failed|recovered
  value NUMERIC,
  note TEXT,
  mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 10),
  energy_after INTEGER CHECK (energy_after BETWEEN 1 AND 10),
  reason_if_skipped TEXT,
  reason_if_failed TEXT,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (habit_id, log_date)               -- one log per habit per day
);
```

RLS: user_id = auth.uid() (same pattern as all other tables).

**Modified:** `web/src/types/db.ts`
- Add `HabitSchema`, `HabitLogSchema`, `HabitTypeSchema`, `HabitStatusSchema`, `HabitScheduleSchema`

**New:** `web/src/lib/protocols/strength.ts`
```typescript
// Habit strength formula (0-100)
// completionRate * 0.35 + consistencyScore * 0.25 + recentMomentum * 0.20 + recoveryScore * 0.10 + streakBonus * 0.10
```

---

## Phase 2 — API Routes

### New files

```
web/src/app/api/habits/route.ts           GET (list), POST (create)
web/src/app/api/habits/[id]/route.ts      PATCH (update), DELETE (archive)
web/src/app/api/habit-logs/route.ts       GET (range), POST (log completion)
web/src/app/api/habit-logs/[id]/route.ts  PATCH (edit log)
```

**POST `/api/habit-logs`** does:
1. Upsert habit_log row
2. Recompute `strength_score`, `streak_current`, `streak_best`, `completion_rate` → PATCH habits row
3. Award gamification points (10 done / 5 partial / 3 recovered / 0 skipped/missed)
4. If habit has sphere_slugs → increment matching daily_wheel_scores field by 0.2 (capped at 10)

**Lib:** `web/src/lib/data.ts` — add `getHabits()`, `getHabitLogs(userId, from, to)`, `getTodayHabitLogs(userId)`

---

## Phase 3 — Protocols Page + Today Protocols

### New route: `web/src/app/(app)/protocols/page.tsx` (server component)

Data fetched:
- `getHabits(userId)` — all active habits
- `getHabitLogs(userId, weekStart, today)` — logs for current week
- `getTodayHabitLogs(userId)` — today's status per habit

### New components

```
web/src/components/protocols/
├── ProtocolsView.tsx        Main page layout (receives server data)
├── ProtocolsHeader.tsx      Status bar: "System: 72% stable | 5/8 confirmed"
├── TodayProtocols.tsx       Cards: today's habits with Confirm button
├── ProtocolCard.tsx         Single today-protocol card
└── RecoveryQueue.tsx        Struggling habits list (strength < 50%)
```

**ProtocolsHeader** shows:
- Overall system stability (avg strength across active habits)
- Signals confirmed today (done+partial / total)
- Rising sphere (highest completion trend)
- Risk sphere (lowest strength linked area)

**TodayProtocols** shows only habits scheduled for today (computed from schedule jsonb).

---

## Phase 4 — Dynamic Habit Grid

### New components

```
web/src/components/protocols/
├── HabitGrid.tsx            Container: week/month toggle, column headers
├── HabitGridRow.tsx         Single habit row with name + cells
└── HabitCell.tsx            Single day cell (status color + click handler)
```

**HabitCell states** (CSS classes):
```
.cell-empty    → bg dark, no border glow
.cell-done     → cyan glow border + fill
.cell-partial  → half-fill violet
.cell-skipped  → grey cross-hatch pattern
.cell-missed   → dim red
.cell-failed   → red glitch (pulsing)
.cell-recovered→ green pulse
```

**HabitGrid** features:
- Week view (default: Mon–Sun current week)
- Month view toggle
- Today column highlighted
- Habit name + sphere badges on left
- Strength score % on right
- Click cell → open HabitDrawer

---

## Phase 5 — Habit Drawer + Create Modal + HUD Toast

### New components

```
web/src/components/protocols/
├── HabitDrawer.tsx          Right/bottom drawer: log habit status
├── CreateProtocolModal.tsx  Modal: create/edit habit form
├── HUDToast.tsx             Animated top-right toast: "SIGNAL CONFIRMED"
└── LifeImpactBadge.tsx      Sphere impact chip: "Health +2"
```

**HabitDrawer** fields:
- Status: [Done] [Partial] [Skip] [Failed] buttons
- Note textarea (evidence)
- Mood after: 1–10 slider
- Energy after: 1–10 slider
- Reason: dropdown (no energy / forgot / no time / resistance / sick / travel / other)

**HUDToast** shows:
```
SIGNAL CONFIRMED
Health +2  Energy +1
Streak: 4 days · Strength: 78%
+10 pts
```

**CreateProtocolModal** fields (wizard or single form):
- Name (text)
- Spheres (multi-select from existing 12 life areas)
- Type (binary / measurable / timer / avoidance / ritual)
- Frequency (daily / specific days / N times per week)
- Time window (optional: morning / afternoon / evening / any)
- Difficulty (easy / medium / hard)
- Priority (low / medium / high)
- Minimum version (text)
- Ideal version (text)
- Why (text)

---

## Phase 6 — Habit Strength + Analytics Display

### New files

```
web/src/lib/protocols/strength.ts   calcHabitStrength(), calcStreak()
web/src/lib/protocols/schedule.ts   isScheduledToday(), getWeekDates()
web/src/lib/protocols/analytics.ts  completionRate(), sphereImpactToday()
```

**Strength formula:**
```
strength = completionRate * 0.35
         + consistencyScore * 0.25   // no isolated gaps
         + recentMomentum * 0.20     // last 7 days weight
         + recoveryScore * 0.10      // recovered logs / total skips
         + streakBonus * 0.10        // min(streakDays/30, 1)
```

**Strength states:**
- 0–25: `unstable` (red)
- 26–50: `forming` (orange)
- 51–75: `stable` (blue)
- 76–90: `strong` (cyan)
- 91–100: `automatic` (green)

### Optional: `/protocols/[id]` page
- Habit detail: description, schedule, score ring, streak, history grid, notes feed

---

## Phase 7 — Sidebar + Dashboard Integration

### Modified: `web/src/components/Sidebar.tsx`
- Add `{ href: "/protocols", label: "Protocols", icon: Zap }` after Reports item

### Modified: `web/src/app/(app)/dashboard/page.tsx`
- Fetch `getTodayHabitLogs(userId)` + `getHabits(userId)`
- Add `<ProtocolsStatusCard>` component showing:
  - X/Y habits confirmed today
  - Link to `/protocols`

### New: `web/src/components/dashboard/ProtocolsStatusCard.tsx`
Small card: "5/8 protocols confirmed · 2 pending · 1 at risk"

---

## Phase 8 — AI Layer (post-MVP, phase 2)

Deferred:
- `POST /api/ai/habit-pattern-scan` — detect cross-signal correlations
- `POST /api/ai/recovery-plan` — generate recovery recommendations
- `POST /api/ai/weekly-habit-review` — weekly insight generation
- Inbox-to-habit detection (classify entry → suggest new habit)

These use existing `lib/llm.ts` + `lib/ai/prompts/` pattern.

---

## Execution Order

| Phase | Est scope | Depends on |
|-------|-----------|------------|
| 1 — DB + Types | 2 files | — |
| 2 — API Routes | 4 files | Phase 1 |
| 3 — Page + Today | 5 files | Phase 2 |
| 4 — Habit Grid | 3 files | Phase 2 |
| 5 — Drawer + Modal + Toast | 4 files | Phase 3+4 |
| 6 — Strength + Analytics | 3 lib files | Phase 2 |
| 7 — Sidebar + Dashboard | 2 files modified | Phase 3 |
| 8 — AI Layer | deferred | Phase 6 |

Total new files: ~21 new + 3 modified. All phases can ship incrementally.

---

## Design Tokens to Add

```css
/* protocols-specific, to add to globals.css */
--cell-done: rgba(55, 230, 255, 0.85);
--cell-partial: rgba(139, 92, 246, 0.6);
--cell-missed: rgba(255, 77, 109, 0.4);
--cell-skipped: rgba(100, 116, 139, 0.3);
--cell-recovered: rgba(57, 255, 182, 0.7);
--cell-failed: rgba(255, 77, 109, 0.7);
```

---

## Non-goals (explicitly out of scope for this sprint)

- Photo evidence upload (needs S3)
- Apple Health / Google Fit integration
- Habit challenges / public sharing
- Voice input
- Export CSV
- Advanced AI correlation analytics
