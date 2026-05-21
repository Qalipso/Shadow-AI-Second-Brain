"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/Drawer";
import type { Goal, Mission, Task } from "@/types/db";
import {
  DrawerHeader, DrawerTabs, FieldLabel, TextField, TextArea,
  SelectField, LifeAreasPicker, ScaleField, ProgressField, Section,
} from "./drawer-ui";
import { SaveBar } from "./SaveBar";
import { useSaveState } from "./useSaveState";
import { ShadowReading } from "./ShadowReading";
import {
  GOAL_STATUSES, GOAL_TYPES, STATUS_COLOR, SIGNAL_TYPES,
} from "./constants";

const TABS = ["Overview", "Plan", "Signals", "Notes", "History"] as const;
type Tab = (typeof TABS)[number];

type Editable = {
  title: string;
  why: string;
  description: string;
  goal_type: Goal["goal_type"];
  status: Goal["status"];
  deadline: string;
  progress: number;
  linked_life_areas: string[];
  clarity_score: number | null;
  energy_score: number | null;
  notes: string;
};

function toEditable(g: Goal): Editable {
  return {
    title: g.title ?? "",
    why: g.why ?? "",
    description: g.description ?? "",
    goal_type: (g.goal_type ?? null) as Editable["goal_type"],
    status: g.status,
    deadline: g.deadline ?? "",
    progress: g.progress ?? 0,
    linked_life_areas: g.linked_life_areas ?? [],
    clarity_score: g.clarity_score,
    energy_score: g.energy_score,
    notes: g.notes ?? "",
  };
}

export function GoalDetailDrawer({
  goal, open, onClose, onChanged,
}: {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
  onChanged?: (goal: Goal) => void;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const initial: Editable = goal ? toEditable(goal) : toEditable({
    id: "", user_id: "", title: "", description: null, why: null,
    linked_life_areas: [], goal_type: null, clarity_score: null,
    energy_score: null, progress: 0, status: "active", life_area_id: null,
    deadline: null, created_at: new Date().toISOString(),
  } as Goal);

  const save = useSaveState<Editable>(initial, async (draft) => {
    if (!goal) throw new Error("No goal.");
    const payload = {
      title: draft.title,
      why: draft.why || null,
      description: draft.description || null,
      goal_type: draft.goal_type ?? null,
      status: draft.status,
      deadline: draft.deadline || null,
      progress: draft.progress,
      linked_life_areas: draft.linked_life_areas,
      clarity_score: draft.clarity_score,
      energy_score: draft.energy_score,
      notes: draft.notes || null,
    };
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Save failed.");
    const { goal: updated } = await res.json() as { goal: Goal };
    onChanged?.(updated);
    return toEditable(updated);
  });

  // Load missions + tasks linked to this goal when opened.
  useEffect(() => {
    if (!open || !goal) return;
    setTab("Overview");
    Promise.all([
      fetch(`/api/missions?goal_id=${goal.id}`).then((r) => r.ok ? r.json() : { missions: [] }),
      fetch(`/api/tasks?goal_id=${goal.id}`).then((r) => r.ok ? r.json() : { tasks: [] }),
    ]).then(([m, t]) => {
      setMissions((m.missions ?? []) as Mission[]);
      setTasks((t.tasks ?? []) as Task[]);
    }).catch(() => { /* keep empty */ });
  }, [open, goal]);

  if (!goal) return null;

  const goalTypeLabel = GOAL_TYPES.find((t) => t.value === save.draft.goal_type)?.label;
  const statusLabel = GOAL_STATUSES.find((s) => s.value === save.draft.status)?.label;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      unsavedGuard={() => save.dirty}
      labelledBy="goal-drawer-title"
    >
      <DrawerHeader
        eyebrow="Direction Vector"
        title={save.draft.title}
        statusValue={save.draft.status}
        statusLabel={statusLabel}
        typeLabel={goalTypeLabel}
        lifeAreas={save.draft.linked_life_areas}
        updatedAt={goal.updated_at ?? goal.created_at}
        onClose={() => {
          if (save.dirty && !window.confirm("Discard unsaved changes?")) return;
          onClose();
        }}
        editing
        onTitleChange={(v) => save.update("title", v)}
      />

      <DrawerTabs tabs={TABS} value={tab} onChange={setTab} />

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {tab === "Overview" && (
          <>
            <ShadowReading
              ctx={{
                kind: "goal",
                title: save.draft.title,
                description: save.draft.description,
                goalType: save.draft.goal_type,
                status: save.draft.status,
                linkedLifeAreas: save.draft.linked_life_areas,
              }}
            />

            <TextArea
              label="Why it matters"
              value={save.draft.why}
              onChange={(v) => save.update("why", v)}
              rows={3}
              placeholder="The real reason behind this direction."
            />
            <TextArea
              label="Description"
              value={save.draft.description}
              onChange={(v) => save.update("description", v)}
              rows={5}
              placeholder="What does this goal mean concretely?"
            />

            <SelectField
              label="Goal Type"
              value={(save.draft.goal_type ?? null) as string | null}
              onChange={(v) => save.update("goal_type", v as Editable["goal_type"])}
              options={GOAL_TYPES}
              allowEmpty
            />
            <SelectField
              label="Status"
              value={save.draft.status}
              onChange={(v) => v && save.update("status", v as Goal["status"])}
              options={GOAL_STATUSES}
            />

            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Deadline"
                value={save.draft.deadline ?? ""}
                onChange={(v) => save.update("deadline", v)}
                type="date"
              />
              <div>
                <ProgressField
                  label="Progress"
                  value={save.draft.progress}
                  onChange={(v) => save.update("progress", v)}
                />
              </div>
            </div>

            <LifeAreasPicker
              value={save.draft.linked_life_areas}
              onChange={(v) => save.update("linked_life_areas", v)}
            />

            <div className="grid grid-cols-2 gap-4">
              <ScaleField
                label="Clarity"
                value={save.draft.clarity_score}
                onChange={(v) => save.update("clarity_score", v)}
              />
              <ScaleField
                label="Energy"
                value={save.draft.energy_score}
                onChange={(v) => save.update("energy_score", v)}
              />
            </div>
          </>
        )}

        {tab === "Plan" && (
          <PlanTab
            missions={missions}
            tasks={tasks}
            goalId={goal.id}
            goalTitle={save.draft.title}
            goalWhy={save.draft.why}
            goalProgress={save.draft.progress}
            onRefresh={() => {
              Promise.all([
                fetch(`/api/missions?goal_id=${goal.id}`).then((r) => r.json()),
                fetch(`/api/tasks?goal_id=${goal.id}`).then((r) => r.json()),
              ]).then(([m, t]) => {
                setMissions((m.missions ?? []) as Mission[]);
                setTasks((t.tasks ?? []) as Task[]);
              });
            }}
          />
        )}

        {tab === "Signals" && <SignalsTab goalTitle={save.draft.title} />}

        {tab === "Notes" && (
          <TextArea
            label="Notes"
            value={save.draft.notes}
            onChange={(v) => save.update("notes", v)}
            rows={14}
            placeholder="Free thinking space."
          />
        )}

        {tab === "History" && (
          <HistoryTab
            events={[
              { ts: goal.created_at, label: "goal created", color: "var(--accent-warm)" },
              ...(goal.updated_at && goal.updated_at !== goal.created_at
                ? [{ ts: goal.updated_at, label: "goal edited", color: "var(--shadow-text-muted)" }]
                : []),
              ...missions.map((m) => ({ ts: m.created_at, label: `mission added · ${m.title}`, color: "rgba(155,135,210,0.85)" })),
              ...tasks.filter((t) => t.status === "done")
                .map((t) => ({ ts: t.updated_at ?? t.created_at, label: `task completed · ${t.title}`, color: "var(--shadow-green)" })),
            ]}
          />
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

// ─── Plan tab ──────────────────────────────────────────────────────────────

function PlanTab({
  missions, tasks, goalId, goalTitle, goalWhy, goalProgress, onRefresh,
}: {
  missions: Mission[];
  tasks: Task[];
  goalId: string;
  goalTitle: string;
  goalWhy: string;
  goalProgress: number;
  onRefresh: () => void;
}) {
  // Inline add-mission state
  const [mDraft, setMDraft] = useState("");
  const [mSaving, setMSaving] = useState(false);
  const [mError, setMError] = useState<string | null>(null);

  // Inline add-task state
  const [tDraft, setTDraft] = useState("");
  const [tSaving, setTSaving] = useState(false);
  const [tError, setTError] = useState<string | null>(null);

  // Generate plan state
  const [planLoading, setPlanLoading] = useState(false);
  const [planText, setPlanText] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const blockedTasks = tasks.filter((t) => t.status === "open" && !t.due_at);
  const nextMove = tasks.find((t) => t.status === "open") ?? null;

  async function addMission() {
    const title = mDraft.trim();
    if (!title) return;
    setMSaving(true);
    setMError(null);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, goal_id: goalId }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setMError(d.error ?? "Failed.");
        return;
      }
      setMDraft("");
      onRefresh();
    } catch {
      setMError("Network error.");
    } finally {
      setMSaving(false);
    }
  }

  async function addTask() {
    const title = tDraft.trim();
    if (!title) return;
    setTSaving(true);
    setTError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, goal_id: goalId }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setTError(d.error ?? "Failed.");
        return;
      }
      setTDraft("");
      onRefresh();
    } catch {
      setTError("Network error.");
    } finally {
      setTSaving(false);
    }
  }

  async function generatePlan() {
    setPlanLoading(true);
    setPlanText(null);
    setPlanError(null);
    try {
      const missionList = missions.length > 0
        ? missions.map((m) => `• ${m.title} (${m.status})`).join("\n")
        : "No missions yet.";
      const openTasks = tasks.filter((t) => t.status === "open").slice(0, 5);
      const taskList = openTasks.length > 0
        ? openTasks.map((t) => `• ${t.title}`).join("\n")
        : "";
      const message = [
        `Analyse this goal and outline a concrete action plan:`,
        `Goal: "${goalTitle}"`,
        goalWhy ? `Why: ${goalWhy}` : "",
        `Missions:\n${missionList}`,
        taskList ? `Open tasks:\n${taskList}` : "",
        `Progress: ${goalProgress}%`,
        `\nSuggest: next 3 concrete actions, biggest risk, and one clarifying question.`,
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/shadow/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: [] }),
      });
      const d = await res.json() as { reply?: string; error?: string };
      if (!res.ok) {
        setPlanError(d.error ?? "Analysis failed.");
        return;
      }
      setPlanText(d.reply ?? "No analysis returned.");
    } catch {
      setPlanError("Network error.");
    } finally {
      setPlanLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Missions section */}
      <Section title={`Missions · ${missions.length}`}>
        {missions.length === 0 ? (
          <Empty text="No missions linked. Break the goal into one concrete mission." />
        ) : (
          <ul className="space-y-1.5">
            {missions.map((m) => (
              <LinkedRow key={m.id} title={m.title} status={m.status} progress={m.progress} />
            ))}
          </ul>
        )}
        <div className="flex gap-1.5 mt-2">
          <input
            value={mDraft}
            onChange={(e) => setMDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !mSaving) addMission(); }}
            placeholder="New mission…"
            disabled={mSaving}
            className="flex-1 px-2.5 py-1.5 rounded text-[12px] outline-none"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--shadow-border)",
              color: "var(--shadow-text)",
            }}
          />
          <button
            type="button"
            onClick={addMission}
            disabled={!mDraft.trim() || mSaving}
            className="px-2.5 py-1.5 rounded text-[11px] font-mono disabled:opacity-40 transition-all"
            style={{
              background: "rgba(201,163,106,0.08)",
              border: "1px solid rgba(201,163,106,0.22)",
              color: "var(--accent-warm)",
            }}
          >
            {mSaving ? "…" : "Add"}
          </button>
        </div>
        {mError && <p className="text-[10px] mt-1" style={{ color: "#E36161" }}>{mError}</p>}
      </Section>

      {/* Tasks section */}
      <Section title={`Tasks · ${tasks.length}`}>
        {tasks.length === 0 ? (
          <Empty text="No tasks yet." />
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <LinkedRow key={t.id} title={t.title} status={t.status} />
            ))}
          </ul>
        )}
        <div className="flex gap-1.5 mt-2">
          <input
            value={tDraft}
            onChange={(e) => setTDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !tSaving) addTask(); }}
            placeholder="New task…"
            disabled={tSaving}
            className="flex-1 px-2.5 py-1.5 rounded text-[12px] outline-none"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--shadow-border)",
              color: "var(--shadow-text)",
            }}
          />
          <button
            type="button"
            onClick={addTask}
            disabled={!tDraft.trim() || tSaving}
            className="px-2.5 py-1.5 rounded text-[11px] font-mono disabled:opacity-40 transition-all"
            style={{
              background: "rgba(201,163,106,0.08)",
              border: "1px solid rgba(201,163,106,0.22)",
              color: "var(--accent-warm)",
            }}
          >
            {tSaving ? "…" : "Add"}
          </button>
        </div>
        {tError && <p className="text-[10px] mt-1" style={{ color: "#E36161" }}>{tError}</p>}
      </Section>

      <Section title="Next Move">
        {nextMove ? (
          <p className="text-[12.5px]" style={{ color: "var(--shadow-text-muted)" }}>
            → {nextMove.title}
          </p>
        ) : (
          <Empty text="No defined next move. Pick the smallest visible action." />
        )}
      </Section>

      <Section title="Blockers">
        {blockedTasks.length === 0 ? (
          <Empty text="No blockers tracked." />
        ) : (
          <ul className="space-y-1 text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
            {blockedTasks.map((t) => (
              <li key={t.id}>• {t.title}</li>
            ))}
          </ul>
        )}
      </Section>

      {/* Generate Plan with Shadow */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={generatePlan}
          disabled={planLoading}
          className="w-full py-2.5 rounded-md text-[11px] font-mono transition-all disabled:opacity-50"
          style={{
            background: "rgba(126,87,194,0.06)",
            border: "1px solid rgba(126,87,194,0.2)",
            color: "rgba(180,165,230,0.9)",
          }}
        >
          {planLoading ? "Shadow is thinking…" : "Generate Plan with Shadow"}
        </button>

        {planError && (
          <p className="text-[10px]" style={{ color: "#E36161" }}>{planError}</p>
        )}

        {planText && (
          <div
            className="rounded-md px-3 py-3 text-[12px] leading-relaxed whitespace-pre-wrap"
            style={{
              background: "rgba(126,87,194,0.05)",
              border: "1px solid rgba(126,87,194,0.15)",
              color: "var(--shadow-text-muted)",
            }}
          >
            {planText}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedRow({ title, status, progress }: { title: string; status?: string; progress?: number }) {
  const c = status ? STATUS_COLOR[status] ?? "var(--shadow-text-faint)" : "var(--shadow-text-faint)";
  return (
    <li
      className="flex items-center gap-3 px-3 py-2 rounded-md"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--shadow-border)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      <span className="text-[12px] flex-1 truncate" style={{ color: "var(--shadow-text)" }}>{title}</span>
      {progress !== undefined && (
        <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--shadow-text-faint)" }}>
          {progress}%
        </span>
      )}
      {status && (
        <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: c }}>
          {status}
        </span>
      )}
    </li>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="text-[11.5px] italic" style={{ color: "var(--shadow-text-faint)" }}>{text}</p>
  );
}

// ─── Signals tab ───────────────────────────────────────────────────────────
type LocalSignal = {
  id: string;
  type: typeof SIGNAL_TYPES[number]["value"];
  text: string;
  linked_life_areas: string[];
  intensity: number;
  created_at: string;
};

function SignalsTab({ goalTitle }: { goalTitle: string }) {
  const [signals, setSignals] = useState<LocalSignal[]>([]);
  const [draft, setDraft] = useState<{ type: LocalSignal["type"]; text: string; intensity: number }>({
    type: "thought", text: "", intensity: 5,
  });

  function add() {
    if (!draft.text.trim()) return;
    setSignals((s) => [{
      id: crypto.randomUUID(),
      type: draft.type,
      text: draft.text.trim(),
      linked_life_areas: [],
      intensity: draft.intensity,
      created_at: new Date().toISOString(),
    }, ...s]);
    setDraft({ type: draft.type, text: "", intensity: 5 });
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-md p-3 space-y-3"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--shadow-border)" }}
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.22em]"
          style={{ color: "var(--shadow-text-faint)" }}>
          New Signal · {goalTitle || "this goal"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SIGNAL_TYPES.map((s) => {
            const active = draft.type === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setDraft({ ...draft, type: s.value })}
                className="px-2 py-1 rounded text-[10px] font-mono capitalize"
                style={
                  active
                    ? {
                        background: "rgba(201,163,106,0.14)",
                        border: "1px solid rgba(201,163,106,0.32)",
                        color: "var(--accent-warm)",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--shadow-border)",
                        color: "var(--shadow-text-faint)",
                      }
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="What did you notice?"
          rows={2}
          className="w-full px-2.5 py-2 rounded text-[12.5px] outline-none field-focus"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--shadow-border)",
            color: "var(--shadow-text)",
          }}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[10px] font-mono"
            style={{ color: "var(--shadow-text-faint)" }}>
            <span>Intensity</span>
            <input
              type="range" min={1} max={10} value={draft.intensity}
              onChange={(e) => setDraft({ ...draft, intensity: Number(e.target.value) })}
              className="accent-[color:var(--accent-warm)]"
            />
            <span className="tabular-nums text-[10px]" style={{ color: "var(--shadow-text-muted)" }}>
              {draft.intensity}
            </span>
          </label>
          <button
            type="button" onClick={add} disabled={!draft.text.trim()}
            className="px-3 py-1.5 rounded text-[11px] font-mono disabled:opacity-30"
            style={{
              background: "rgba(201,163,106,0.14)",
              border: "1px solid rgba(201,163,106,0.32)",
              color: "var(--accent-warm)",
            }}
          >
            Log Signal
          </button>
        </div>
      </div>

      {signals.length === 0 ? (
        <Empty text="No signals captured yet. Wins, blockers and urges go here." />
      ) : (
        <ul className="space-y-1.5">
          {signals.map((s) => (
            <li
              key={s.id}
              className="px-3 py-2 rounded-md"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--shadow-border)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[9px] font-mono uppercase tracking-wider"
                  style={{ color: "var(--accent-warm)" }}
                >
                  {s.type}
                </span>
                <span className="text-[9px] tabular-nums" style={{ color: "var(--shadow-text-faint)" }}>
                  · intensity {s.intensity}
                </span>
                <span className="text-[9px] ml-auto" style={{ color: "var(--shadow-text-faint)" }}>
                  {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-[12px]" style={{ color: "var(--shadow-text)" }}>{s.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── History tab ──────────────────────────────────────────────────────────
function HistoryTab({ events }: { events: { ts: string; label: string; color: string }[] }) {
  if (events.length === 0) {
    return <Empty text="No events yet." />;
  }
  const sorted = [...events].sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  return (
    <ol className="space-y-2.5 relative" style={{ paddingLeft: "0.75rem" }}>
      <span
        aria-hidden
        className="absolute left-[3px] top-1 bottom-1 w-px"
        style={{ background: "var(--shadow-border)" }}
      />
      {sorted.map((e, i) => (
        <li key={i} className="relative pl-4">
          <span
            className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: e.color }}
          />
          <p className="text-[12px]" style={{ color: "var(--shadow-text)" }}>{e.label}</p>
          <p className="text-[10px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
            {new Date(e.ts).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
          </p>
        </li>
      ))}
    </ol>
  );
}
