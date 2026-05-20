"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/Drawer";
import type { Goal, Mission, Task } from "@/types/db";
import {
  DrawerHeader, DrawerTabs, FieldLabel, TextField, TextArea,
  SelectField, LifeAreasPicker, ProgressField, Section, Chip,
} from "./drawer-ui";
import { SaveBar } from "./SaveBar";
import { useSaveState } from "./useSaveState";
import { ShadowReading } from "./ShadowReading";
import { MISSION_STATUSES, STATUS_COLOR } from "./constants";

const TABS = ["Overview", "Plan", "Signals", "Notes", "History"] as const;
type Tab = (typeof TABS)[number];

type Editable = {
  title: string;
  description: string;
  status: Mission["status"];
  progress: number;
  goal_id: string | null;
  linked_life_areas: string[];
  blocker: string;
  outcome: string;     // UI buffer until DB column exists
  deadline: string;    // UI buffer until DB column exists
  notes: string;       // UI buffer
};

function toEditable(m: Mission): Editable {
  return {
    title: m.title ?? "",
    description: m.description ?? "",
    status: m.status,
    progress: m.progress ?? 0,
    goal_id: m.goal_id ?? null,
    linked_life_areas: m.linked_life_areas ?? [],
    blocker: m.blocker ?? "",
    outcome: "",
    deadline: "",
    notes: "",
  };
}

export function MissionDetailDrawer({
  mission, goals, open, onClose, onChanged,
}: {
  mission: Mission | null;
  goals: Goal[];
  open: boolean;
  onClose: () => void;
  onChanged?: (m: Mission) => void;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [tasks, setTasks] = useState<Task[]>([]);

  const initial: Editable = mission ? toEditable(mission) : toEditable({
    id: "", user_id: "", goal_id: null, title: "", description: null,
    status: "active", progress: 0, linked_life_areas: [], blocker: null,
    created_at: new Date().toISOString(),
  } as Mission);

  const save = useSaveState<Editable>(initial, async (draft) => {
    if (!mission) throw new Error("No mission.");
    const payload = {
      title: draft.title,
      description: draft.description || null,
      status: draft.status,
      progress: draft.progress,
      goal_id: draft.goal_id,
      linked_life_areas: draft.linked_life_areas,
      blocker: draft.blocker || null,
    };
    const res = await fetch(`/api/missions/${mission.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Save failed.");
    const { mission: updated } = await res.json() as { mission: Mission };
    onChanged?.(updated);
    return toEditable(updated);
  });

  useEffect(() => {
    if (!open || !mission) return;
    setTab("Overview");
    fetch(`/api/tasks?mission_id=${mission.id}`)
      .then((r) => r.ok ? r.json() : { tasks: [] })
      .then((d) => setTasks((d.tasks ?? []) as Task[]))
      .catch(() => { /* keep empty */ });
  }, [open, mission]);

  if (!mission) return null;

  const statusLabel = MISSION_STATUSES.find((s) => s.value === save.draft.status)?.label;
  const linkedGoal = goals.find((g) => g.id === save.draft.goal_id) ?? null;

  async function quickAction(action: "block" | "complete" | "split" | "addTask" | "link") {
    if (action === "block")    save.update("status", "blocked");
    if (action === "complete") save.update("status", "completed");
    if (action === "addTask") {
      const t = window.prompt("Task title?");
      if (!t || !mission) return;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, mission_id: mission.id, goal_id: mission.goal_id }),
      });
      if (res.ok) {
        const { task } = await res.json() as { task: Task };
        setTasks((s) => [task, ...s]);
      }
    }
    if (action === "split") {
      window.alert("Split into tasks — coming soon. Generate suggestions from this mission's outcome.");
    }
    if (action === "link") setTab("Overview");
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      unsavedGuard={() => save.dirty}
      labelledBy="mission-drawer-title"
    >
      <DrawerHeader
        eyebrow="Mission"
        title={save.draft.title}
        statusValue={save.draft.status}
        statusLabel={statusLabel}
        typeLabel={linkedGoal ? `Goal · ${linkedGoal.title}` : null}
        lifeAreas={save.draft.linked_life_areas}
        updatedAt={mission.updated_at ?? mission.created_at}
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
                kind: "mission",
                title: save.draft.title,
                description: save.draft.description,
                status: save.draft.status,
                linkedLifeAreas: save.draft.linked_life_areas,
              }}
            />

            <TextArea
              label="Outcome — what must be done?"
              value={save.draft.outcome}
              onChange={(v) => save.update("outcome", v)}
              rows={3}
              placeholder="Define a concrete deliverable or result."
            />

            <TextArea
              label="Description"
              value={save.draft.description}
              onChange={(v) => save.update("description", v)}
              rows={4}
              placeholder="Context, scope, references."
            />

            <SelectField
              label="Status"
              value={save.draft.status}
              onChange={(v) => v && save.update("status", v as Mission["status"])}
              options={MISSION_STATUSES}
            />

            <div>
              <FieldLabel>Linked Goal</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  label="—"
                  active={save.draft.goal_id === null}
                  onClick={() => save.update("goal_id", null)}
                />
                {goals.map((g) => (
                  <Chip
                    key={g.id}
                    label={g.title.length > 32 ? g.title.slice(0, 30) + "…" : g.title}
                    active={save.draft.goal_id === g.id}
                    onClick={() => save.update("goal_id", g.id)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Deadline"
                value={save.draft.deadline}
                onChange={(v) => save.update("deadline", v)}
                type="date"
              />
              <ProgressField
                label="Progress"
                value={save.draft.progress}
                onChange={(v) => save.update("progress", v)}
              />
            </div>

            <LifeAreasPicker
              value={save.draft.linked_life_areas}
              onChange={(v) => save.update("linked_life_areas", v)}
            />

            <TextArea
              label="What's blocking it?"
              value={save.draft.blocker}
              onChange={(v) => save.update("blocker", v)}
              rows={2}
              placeholder="Name the obstacle."
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <QuickActionBtn onClick={() => quickAction("addTask")}>Add Task</QuickActionBtn>
              <QuickActionBtn onClick={() => quickAction("block")}>Mark Blocked</QuickActionBtn>
              <QuickActionBtn onClick={() => quickAction("complete")} accent>Mark Completed</QuickActionBtn>
              <QuickActionBtn onClick={() => quickAction("split")}>Split into Tasks</QuickActionBtn>
            </div>
          </>
        )}

        {tab === "Plan" && (
          <PlanTab tasks={tasks} missionId={mission.id} goalId={mission.goal_id} onRefresh={() => {
            fetch(`/api/tasks?mission_id=${mission.id}`).then((r) => r.json()).then((d) => setTasks((d.tasks ?? []) as Task[]));
          }} />
        )}

        {tab === "Signals" && (
          <p className="text-[12px] italic" style={{ color: "var(--shadow-text-faint)" }}>
            Mission signals will share storage with goal signals. Capture from the Goal drawer for now.
          </p>
        )}

        {tab === "Notes" && (
          <TextArea
            label="Notes"
            value={save.draft.notes}
            onChange={(v) => save.update("notes", v)}
            rows={14}
            placeholder="Mission notes — buffered locally."
          />
        )}

        {tab === "History" && (
          <ol className="space-y-2 text-[12px]">
            <li style={{ color: "var(--shadow-text-muted)" }}>
              <span className="font-mono text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
                {new Date(mission.created_at).toLocaleString()}
              </span>{" · "}mission created
            </li>
            {tasks.map((t) => (
              <li key={t.id} style={{ color: "var(--shadow-text-muted)" }}>
                <span className="font-mono text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
                  {new Date(t.created_at).toLocaleString()}
                </span>{" · "}task added · {t.title}
              </li>
            ))}
          </ol>
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

function QuickActionBtn({ children, onClick, accent }: { children: React.ReactNode; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-md text-[10.5px] font-mono transition-all"
      style={
        accent
          ? {
              background: "rgba(111,191,138,0.10)",
              border: "1px solid rgba(111,191,138,0.28)",
              color: "var(--shadow-green)",
            }
          : {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--shadow-border)",
              color: "var(--shadow-text-muted)",
            }
      }
    >
      {children}
    </button>
  );
}

function PlanTab({
  tasks, missionId, goalId, onRefresh,
}: { tasks: Task[]; missionId: string; goalId: string | null; onRefresh: () => void }) {
  async function addTask() {
    const t = window.prompt("Task title?");
    if (!t) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, mission_id: missionId, goal_id: goalId }),
    });
    if (res.ok) onRefresh();
  }
  const open = tasks.filter((t) => t.status === "open");
  const next = open[0];

  return (
    <div className="space-y-5">
      <Section
        title={`Tasks · ${tasks.length}`}
        action={
          <button
            type="button"
            onClick={addTask}
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: "var(--accent-warm)" }}
          >
            + Add Task
          </button>
        }
      >
        {tasks.length === 0 ? (
          <p className="text-[11.5px] italic" style={{ color: "var(--shadow-text-faint)" }}>
            No tasks linked to this mission.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--shadow-border)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: STATUS_COLOR[t.status] ?? "var(--shadow-text-faint)" }}
                />
                <span className="text-[12px] flex-1 truncate" style={{ color: "var(--shadow-text)" }}>
                  {t.title}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider"
                  style={{ color: STATUS_COLOR[t.status] ?? "var(--shadow-text-faint)" }}>
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Next Task">
        {next ? (
          <p className="text-[12.5px]" style={{ color: "var(--shadow-text-muted)" }}>→ {next.title}</p>
        ) : (
          <p className="text-[11.5px] italic" style={{ color: "var(--shadow-text-faint)" }}>
            No defined next task.
          </p>
        )}
      </Section>
    </div>
  );
}
