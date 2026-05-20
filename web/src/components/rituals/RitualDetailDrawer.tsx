"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/Drawer";
import type { Habit, HabitLog, HabitSchedule } from "@/types/db";
import {
  DrawerHeader, DrawerTabs, FieldLabel, TextField, TextArea,
  SelectField, LifeAreasPicker, Section, Chip,
} from "@/components/direction/drawer-ui";
import { SaveBar } from "@/components/direction/SaveBar";
import { useSaveState } from "@/components/direction/useSaveState";
import {
  BEST_TIME_OPTIONS, FREQUENCY_OPTIONS, RITUAL_TYPES,
  bestTimeToReminder, deriveBestTime, rhythmColor, rhythmLabel,
  ritualPurpose, ritualTraceText, ritualTypeLabel,
} from "./lib";
import { isScheduledOn, getWeekDates, toDateStr } from "@/lib/protocols/schedule";

const TABS = ["Overview", "Steps", "Rhythm", "Signals", "Notes", "History"] as const;
type Tab = (typeof TABS)[number];

type Editable = {
  name: string;
  why: string;
  description: string;
  ritual_type: string;
  frequency: HabitSchedule["type"];
  best_time: ReturnType<typeof deriveBestTime>;
  is_active: boolean;
  minimum_version: string;
  ideal_version: string;
  sphere_slugs: string[];
  // local-only buffers (no DB column yet)
  steps: string;
  notes: string;
  emotional_tone: string;
};

function toEditable(h: Habit): Editable {
  return {
    name: h.name ?? "",
    why: h.why ?? "",
    description: h.description ?? "",
    ritual_type: ritualTypeLabel(h),
    frequency: h.schedule?.type ?? "daily",
    best_time: deriveBestTime(h),
    is_active: h.is_active,
    minimum_version: h.minimum_version ?? "",
    ideal_version: h.ideal_version ?? "",
    sphere_slugs: h.sphere_slugs ?? [],
    steps: "",
    notes: "",
    emotional_tone: "",
  };
}

export function RitualDetailDrawer({
  habit, weekLogs, open, onClose, onChanged,
}: {
  habit: Habit | null;
  weekLogs: HabitLog[];
  open: boolean;
  onClose: () => void;
  onChanged?: (h: Habit) => void;
}) {
  const [tab, setTab] = useState<Tab>("Overview");

  const initial: Editable = useMemo(
    () => habit ? toEditable(habit) : toEditable({
      id: "", user_id: "", name: "", description: null, type: "ritual",
      sphere_slugs: [], schedule: { type: "daily" } as HabitSchedule,
      target_value: null, target_unit: null, minimum_version: null,
      ideal_version: null, why: null, difficulty: "medium", priority: "medium",
      evidence_types: [], reminder_enabled: false, reminder_time: null,
      is_active: true, strength_score: 0, streak_current: 0, streak_best: 0,
      completion_rate: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } as Habit),
    [habit],
  );

  const save = useSaveState<Editable>(initial, async (draft) => {
    if (!habit) throw new Error("No ritual.");
    const reminder = bestTimeToReminder(draft.best_time);
    const payload = {
      name: draft.name,
      why: draft.why || null,
      description: draft.description || null,
      sphere_slugs: draft.sphere_slugs,
      schedule: { type: draft.frequency } as HabitSchedule,
      minimum_version: draft.minimum_version || null,
      ideal_version: draft.ideal_version || null,
      is_active: draft.is_active,
      reminder_time: reminder,
      reminder_enabled: !!reminder,
    };
    const res = await fetch(`/api/habits/${habit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Save failed.");
    const { habit: updated } = await res.json() as { habit: Habit };
    onChanged?.(updated);
    return toEditable(updated);
  });

  useEffect(() => {
    if (open) setTab("Overview");
  }, [open, habit?.id]);

  if (!habit) return null;

  const label = rhythmLabel(habit, weekLogs);
  const color = rhythmColor(label);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      unsavedGuard={() => save.dirty}
      labelledBy="ritual-drawer-title"
    >
      <DrawerHeader
        eyebrow="Ritual System"
        title={save.draft.name}
        statusValue={save.draft.is_active ? "active" : "paused"}
        statusLabel={save.draft.is_active ? "Active" : "Paused"}
        typeLabel={save.draft.ritual_type}
        lifeAreas={save.draft.sphere_slugs}
        updatedAt={habit.updated_at}
        onClose={() => {
          if (save.dirty && !window.confirm("Discard unsaved changes?")) return;
          onClose();
        }}
        editing
        onTitleChange={(v) => save.update("name", v)}
      />

      <DrawerTabs tabs={TABS} value={tab} onChange={setTab} />

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {tab === "Overview" && (
          <>
            <ShadowReadingPanel habit={habit} draft={save.draft} weekLogs={weekLogs} />

            <TextArea
              label="Purpose"
              value={save.draft.why}
              onChange={(v) => save.update("why", v)}
              rows={2}
              placeholder="What state does this ritual support?"
            />
            <TextArea
              label="Description"
              value={save.draft.description}
              onChange={(v) => save.update("description", v)}
              rows={3}
              placeholder="How is the ritual performed?"
            />

            <div>
              <FieldLabel>Ritual Type</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {RITUAL_TYPES.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    active={save.draft.ritual_type === t}
                    onClick={() => save.update("ritual_type", t)}
                  />
                ))}
              </div>
            </div>

            <SelectField
              label="Frequency"
              value={save.draft.frequency}
              onChange={(v) => v && save.update("frequency", v as HabitSchedule["type"])}
              options={FREQUENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />

            <SelectField
              label="Best Time"
              value={save.draft.best_time}
              onChange={(v) => v && save.update("best_time", v as ReturnType<typeof deriveBestTime>)}
              options={BEST_TIME_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />

            <LifeAreasPicker
              value={save.draft.sphere_slugs}
              onChange={(v) => save.update("sphere_slugs", v)}
            />

            <TextField
              label="Minimum Version"
              value={save.draft.minimum_version}
              onChange={(v) => save.update("minimum_version", v)}
              placeholder="Smallest possible version when energy is low."
            />
            <TextField
              label="Ideal Version"
              value={save.draft.ideal_version}
              onChange={(v) => save.update("ideal_version", v)}
              placeholder="Full version when at your best."
            />

            <div>
              <FieldLabel>Status</FieldLabel>
              <div className="flex gap-1.5">
                <Chip label="Active" active={save.draft.is_active}
                  onClick={() => save.update("is_active", true)} />
                <Chip label="Paused" active={!save.draft.is_active}
                  onClick={() => save.update("is_active", false)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t" style={{ borderColor: "var(--shadow-border)" }}>
              <Stat label="Streak" value={`${habit.streak_current}`} />
              <Stat label="Rhythm" value={`${habit.strength_score ?? 0}%`} valueColor={color} />
              <Stat label="State" value={label} valueColor={color} />
            </div>
          </>
        )}

        {tab === "Steps" && (
          <StepsTab
            value={save.draft.steps}
            onChange={(v) => save.update("steps", v)}
            minimumVersion={save.draft.minimum_version}
          />
        )}

        {tab === "Rhythm" && <RhythmTab habit={habit} weekLogs={weekLogs} />}

        {tab === "Signals" && <SignalsTab habit={habit} />}

        {tab === "Notes" && (
          <TextArea
            label="Notes"
            value={save.draft.notes}
            onChange={(v) => save.update("notes", v)}
            rows={14}
            placeholder="Ritual reflections — buffered locally."
          />
        )}

        {tab === "History" && (
          <HistoryTab habit={habit} weekLogs={weekLogs} />
        )}
      </div>

      <SaveBar
        state={save.state}
        error={save.error}
        savedAt={save.savedAt}
        onCancel={save.reset}
        onSave={save.runSave}
      />
    </Drawer>
  );
}

// ─── Sub-tabs ──────────────────────────────────────────────────────────────

function StepsTab({
  value, onChange, minimumVersion,
}: { value: string; onChange: (v: string) => void; minimumVersion: string }) {
  const lines = value.split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="space-y-4">
      <Section title={`Steps · ${lines.length}`}>
        <p className="text-[11.5px] mb-2" style={{ color: "var(--shadow-text-faint)" }}>
          One step per line. Order matters.
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          placeholder={"1. Step outside\n2. Don't check phone for 5 min\n3. Stay in sunlight for 20 min\n4. Rate energy after"}
          className="w-full px-3 py-2 rounded-md text-[13px] leading-relaxed outline-none resize-y field-focus"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid var(--shadow-border)",
            color: "var(--shadow-text)",
          }}
        />
      </Section>

      <Section title="Minimum Version">
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
          {minimumVersion || "Define a 1–3 minute version Shadow can suggest when the full ritual is too heavy."}
        </p>
      </Section>
    </div>
  );
}

function RhythmTab({ habit, weekLogs }: { habit: Habit; weekLogs: HabitLog[] }) {
  const dates = getWeekDates(new Date());
  const idx = new Map<string, HabitLog>();
  for (const l of weekLogs) idx.set(`${l.habit_id}:${l.log_date}`, l);

  return (
    <div className="space-y-4">
      <Section title="This week">
        <div className="flex items-center gap-2">
          {dates.map((d) => {
            const log = idx.get(`${habit.id}:${toDateStr(d)}`);
            const scheduled = isScheduledOn(habit.schedule, d);
            const status = log?.status ?? (scheduled ? "missed" : "empty");
            const bg = status === "done" ? "var(--shadow-green)"
              : status === "partial" ? "var(--accent-warm)"
              : status === "recovered" ? "var(--shadow-gold)"
              : status === "missed" ? "rgba(172,82,101,0.3)"
              : status === "skipped" ? "rgba(255,255,255,0.05)"
              : "transparent";
            return (
              <div key={d.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                <span
                  className="w-7 h-7 rounded-full"
                  style={{
                    background: bg,
                    border: `1px ${status === "empty" ? "dashed" : "solid"} var(--shadow-border)`,
                  }}
                />
                <span className="text-[9px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
                  {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                </span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Rhythm Stats">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Current streak" value={`${habit.streak_current}`} />
          <Stat label="Best streak" value={`${habit.streak_best}`} />
          <Stat label="Completion rate" value={`${Math.round(habit.completion_rate ?? 0)}%`} />
          <Stat label="Strength" value={`${habit.strength_score ?? 0}%`} />
        </div>
      </Section>
    </div>
  );
}

function SignalsTab({ habit }: { habit: Habit }) {
  return (
    <div className="space-y-4">
      <Section title="Linked Signals">
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
          Each completion will leave a trace in your Shadow map:
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {habit.sphere_slugs.map((s) => (
            <span
              key={s}
              className="px-2 py-1 rounded-md text-[11px] font-mono capitalize"
              style={{
                background: "rgba(201,163,106,0.10)",
                border: "1px solid rgba(201,163,106,0.24)",
                color: "var(--accent-warm)",
              }}
            >
              {s} +1
            </span>
          ))}
        </div>
      </Section>
      <Section title="Post-Ritual State">
        <p className="text-[12px] italic" style={{ color: "var(--shadow-text-faint)" }}>
          Capture how this ritual changed your state — coming with next migration.
        </p>
      </Section>
    </div>
  );
}

function HistoryTab({ habit, weekLogs }: { habit: Habit; weekLogs: HabitLog[] }) {
  const events = [
    { ts: habit.created_at, label: "ritual created" },
    ...(habit.updated_at && habit.updated_at !== habit.created_at
      ? [{ ts: habit.updated_at, label: "ritual edited" }] : []),
    ...weekLogs
      .filter((l) => l.habit_id === habit.id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .map((l) => ({ ts: l.created_at, label: `logged · ${l.status}` })),
  ].sort((a, b) => +new Date(b.ts) - +new Date(a.ts));

  if (events.length === 0) {
    return <p className="text-[12px] italic" style={{ color: "var(--shadow-text-faint)" }}>No history yet.</p>;
  }
  return (
    <ol className="space-y-2 text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
      {events.map((e, i) => (
        <li key={i}>
          <span className="font-mono text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
            {new Date(e.ts).toLocaleString()}
          </span>
          {" · "}
          {e.label}
        </li>
      ))}
    </ol>
  );
}

// ─── Shadow Reading panel ──────────────────────────────────────────────────

function ShadowReadingPanel({
  habit, draft, weekLogs,
}: { habit: Habit; draft: Editable; weekLogs: HabitLog[] }) {
  const label = rhythmLabel(habit, weekLogs);
  const score = habit.strength_score ?? 0;
  const areas = draft.sphere_slugs.slice(0, 2).map(cap).join(" and ");
  const stateLine = label === "stable"
    ? `It is steady at ${score}%. Maintain its quiet ground.`
    : label === "returning"
      ? `It is returning at ${score}%. Reinforce the next two attempts.`
      : label === "fragile"
        ? `It is fragile at ${score}%. Reduce friction, not effort.`
        : label === "fading"
          ? `It is fading at ${score}%. Return with the minimum version today.`
          : `It is lost at ${score}%. Re-anchor with a 1-minute version.`;
  const blocker = !draft.minimum_version
    ? "No minimum version defined — failure has no soft landing."
    : draft.sphere_slugs.length === 0
      ? "No linked life areas — Shadow can't trace its effect."
      : "Likely friction at the trigger moment.";
  const suggestion = !draft.minimum_version
    ? "Add a minimum version (e.g. 'step outside for 1 minute')."
    : "Pre-place a cue near the trigger time.";

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "rgba(126,87,194,0.05)",
        border: "1px solid rgba(126,87,194,0.14)",
      }}
    >
      <p
        className="text-[10px] font-mono uppercase tracking-[0.24em]"
        style={{ color: "rgba(155,135,210,0.85)" }}
      >
        Shadow Reading
      </p>
      <p className="text-[12.5px] leading-relaxed italic"
        style={{ color: "var(--shadow-text-muted)" }}>
        This ritual supports {areas || "your state"}. {stateLine}
      </p>
      <div className="space-y-1 text-[11.5px]"
        style={{ color: "var(--shadow-text-muted)" }}>
        <Line label="Possible blocker" value={blocker} />
        <Line label="Suggested return" value={ritualTraceText(habit)} />
        <Line label="Simplification" value={suggestion} />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <SmallBtn>Refine Ritual</SmallBtn>
        <SmallBtn>Make Easier</SmallBtn>
        <SmallBtn>Find Trigger</SmallBtn>
        <SmallBtn>Create Reminder</SmallBtn>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[9px] uppercase tracking-wider font-mono shrink-0"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {label}
      </span>
      <span className="text-[11px]">{value}</span>
    </div>
  );
}

function SmallBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="px-2.5 py-1 rounded-md text-[10px] font-mono transition-all"
      style={{
        background: "rgba(126,87,194,0.06)",
        border: "1px solid rgba(126,87,194,0.18)",
        color: "rgba(180,165,230,0.9)",
      }}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-[0.22em]"
        style={{ color: "var(--shadow-text-faint)" }}>
        {label}
      </p>
      <p className="text-[14px] font-[family-name:var(--font-fraunces)] font-light mt-0.5 capitalize"
        style={{ color: valueColor ?? "var(--shadow-text)" }}>
        {value}
      </p>
    </div>
  );
}

function cap(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
