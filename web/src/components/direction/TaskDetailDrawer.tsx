"use client";

import { useState } from "react";
import { Drawer } from "@/components/Drawer";
import type { Goal, Mission, Task } from "@/types/db";
import {
  DrawerHeader, DrawerTabs, FieldLabel, TextField, TextArea,
  SelectField, LifeAreasPicker, Section, Chip,
} from "./drawer-ui";
import { SaveBar } from "./SaveBar";
import { useSaveState } from "./useSaveState";
import { ShadowReading } from "./ShadowReading";
import { TASK_STATUSES, TASK_PRIORITIES, ENERGY_COSTS, STATUS_COLOR } from "./constants";

const TABS = ["Overview", "Plan", "Signals", "Notes", "History"] as const;
type Tab = (typeof TABS)[number];

type Editable = {
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  energy_cost: number | null;
  due_at: string;
  goal_id: string | null;
  mission_id: string | null;
  linked_life_areas: string[];
  notes: string;
  next_action: string;
  blocker: string;
};

function toEditable(t: Task): Editable {
  return {
    title: t.title ?? "",
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    energy_cost: t.energy_cost,
    due_at: t.due_at ? t.due_at.slice(0, 10) : "",
    goal_id: t.goal_id ?? null,
    mission_id: t.mission_id ?? null,
    linked_life_areas: t.linked_life_areas ?? [],
    notes: t.notes ?? "",
    next_action: t.next_action ?? "",
    blocker: t.blocker ?? "",
  };
}

export function TaskDetailDrawer({
  task, goals, missions, open, onClose, onChanged,
}: {
  task: Task | null;
  goals: Goal[];
  missions: Mission[];
  open: boolean;
  onClose: () => void;
  onChanged?: (t: Task) => void;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [convertPending, setConvertPending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertDone, setConvertDone] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  const initial: Editable = task ? toEditable(task) : toEditable({
    id: "", user_id: "", title: "", description: null, status: "open",
    priority: null, goal_id: null, mission_id: null, linked_entry_id: null,
    energy_cost: null, linked_life_areas: [], created_from_inbox: false,
    due_at: null, created_at: new Date().toISOString(),
  } as Task);

  const save = useSaveState<Editable>(initial, async (draft) => {
    if (!task) throw new Error("No task.");
    const payload = {
      title: draft.title,
      description: draft.description || null,
      status: draft.status,
      priority: draft.priority,
      energy_cost: draft.energy_cost,
      due_at: draft.due_at || null,
      goal_id: draft.goal_id,
      mission_id: draft.mission_id,
      linked_life_areas: draft.linked_life_areas,
      notes: draft.notes || null,
      next_action: draft.next_action || null,
      blocker: draft.blocker || null,
    };
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Save failed.");
    const { task: updated } = await res.json() as { task: Task };
    onChanged?.(updated);
    return toEditable(updated);
  });

  if (!task) return null;

  const statusLabel = TASK_STATUSES.find((s) => s.value === save.draft.status)?.label;
  const linkedGoal = goals.find((g) => g.id === save.draft.goal_id) ?? null;
  const linkedMission = missions.find((m) => m.id === save.draft.mission_id) ?? null;
  const eyebrow = linkedMission ? `Task · ${linkedMission.title}` : linkedGoal ? `Task · ${linkedGoal.title}` : "Task";

  async function quick(action: "done" | "today" | "block") {
    if (action === "done") save.update("status", "done");
    if (action === "today") save.update("due_at", new Date().toISOString().slice(0, 10));
    if (action === "block") save.update("status", "dropped");
  }

  async function runConvertMission() {
    if (!task) return;
    setConverting(true);
    setConvertError(null);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: save.draft.title, goal_id: save.draft.goal_id }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setConvertError(d.error ?? "Failed to create mission.");
        setConvertPending(false);
        return;
      }
      setConvertDone(true);
      setConvertPending(false);
    } catch {
      setConvertError("Network error.");
      setConvertPending(false);
    } finally {
      setConverting(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      unsavedGuard={() => save.dirty}
      labelledBy="task-drawer-title"
    >
      <DrawerHeader
        eyebrow={eyebrow}
        title={save.draft.title}
        statusValue={save.draft.status}
        statusLabel={statusLabel}
        lifeAreas={save.draft.linked_life_areas}
        updatedAt={task.updated_at ?? task.created_at}
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
                kind: "task",
                title: save.draft.title,
                description: save.draft.description,
                status: save.draft.status,
                linkedLifeAreas: save.draft.linked_life_areas,
              }}
            />

            <TextArea
              label="Description"
              value={save.draft.description}
              onChange={(v) => save.update("description", v)}
              rows={4}
              placeholder="What specifically needs to happen?"
            />

            <SelectField
              label="Status"
              value={save.draft.status}
              onChange={(v) => v && save.update("status", v as Task["status"])}
              options={TASK_STATUSES}
            />

            <SelectField
              label="Priority"
              value={save.draft.priority as Task["priority"]}
              onChange={(v) => save.update("priority", v as Task["priority"])}
              options={TASK_PRIORITIES}
              allowEmpty
            />

            <div>
              <FieldLabel>Energy Cost</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  label="—"
                  active={save.draft.energy_cost === null}
                  onClick={() => save.update("energy_cost", null)}
                />
                {ENERGY_COSTS.map((e) => (
                  <Chip
                    key={e.value}
                    label={e.label}
                    active={save.draft.energy_cost === e.value}
                    onClick={() => save.update("energy_cost", e.value)}
                  />
                ))}
              </div>
            </div>

            <TextField
              label="Due Date"
              value={save.draft.due_at}
              onChange={(v) => save.update("due_at", v)}
              type="date"
            />

            <div>
              <FieldLabel>Linked Goal</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="—" active={save.draft.goal_id === null}
                  onClick={() => save.update("goal_id", null)} />
                {goals.map((g) => (
                  <Chip
                    key={g.id}
                    label={g.title.length > 28 ? g.title.slice(0, 26) + "…" : g.title}
                    active={save.draft.goal_id === g.id}
                    onClick={() => save.update("goal_id", g.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Linked Mission</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="—" active={save.draft.mission_id === null}
                  onClick={() => save.update("mission_id", null)} />
                {missions
                  .filter((m) => !save.draft.goal_id || m.goal_id === save.draft.goal_id)
                  .map((m) => (
                    <Chip
                      key={m.id}
                      label={m.title.length > 28 ? m.title.slice(0, 26) + "…" : m.title}
                      active={save.draft.mission_id === m.id}
                      onClick={() => save.update("mission_id", m.id)}
                    />
                  ))}
              </div>
            </div>

            <LifeAreasPicker
              value={save.draft.linked_life_areas}
              onChange={(v) => save.update("linked_life_areas", v)}
            />

            <TextField
              label="Next Action"
              value={save.draft.next_action}
              onChange={(v) => save.update("next_action", v)}
              placeholder="The single physical step."
            />

            <TextArea
              label="Blocker"
              value={save.draft.blocker}
              onChange={(v) => save.update("blocker", v)}
              rows={2}
              placeholder="What's stopping this from being done?"
            />

            {task.created_from_inbox && (
              <p className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: "var(--shadow-text-faint)" }}>
                Created From · Inbox
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <QuickActionBtn onClick={() => quick("done")} accent>Mark Done</QuickActionBtn>
              <QuickActionBtn onClick={() => quick("today")}>Move to Today</QuickActionBtn>
              <QuickActionBtn onClick={() => quick("block")}>Add Blocker</QuickActionBtn>

              {/* Split — not yet implemented */}
              <button
                type="button"
                disabled
                title="Coming later"
                className="px-3 py-1.5 rounded-md text-[10.5px] font-mono cursor-not-allowed"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--shadow-border)",
                  color: "var(--shadow-text-faint)",
                  opacity: 0.4,
                }}
              >
                Split Task
              </button>

              {/* Convert to Mission — inline confirm flow */}
              {convertDone ? (
                <span
                  className="text-[10.5px] font-mono"
                  style={{ color: "var(--shadow-green, #6FBF8A)" }}
                >
                  Mission created — open Direction to see it
                </span>
              ) : convertPending ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={runConvertMission}
                    disabled={converting}
                    className="px-3 py-1.5 rounded-md text-[10.5px] font-mono disabled:opacity-40 transition-all"
                    style={{
                      background: "rgba(111,191,138,0.10)",
                      border: "1px solid rgba(111,191,138,0.28)",
                      color: "var(--shadow-green, #6FBF8A)",
                    }}
                  >
                    {converting ? "Converting…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConvertPending(false); setConvertError(null); }}
                    className="text-[10px] font-mono"
                    style={{ color: "var(--shadow-text-faint)" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <QuickActionBtn onClick={() => setConvertPending(true)}>
                  Convert to Mission
                </QuickActionBtn>
              )}
            </div>

            {convertError && (
              <p className="text-[10px] mt-1" style={{ color: "#E36161" }}>{convertError}</p>
            )}
          </>
        )}

        {tab === "Plan" && (
          <Section title="Context">
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
              {linkedMission
                ? `This task moves mission "${linkedMission.title}".`
                : linkedGoal
                  ? `This task moves goal "${linkedGoal.title}".`
                  : "Unlinked task — consider connecting to a goal."}
            </p>
          </Section>
        )}

        {tab === "Signals" && (
          <p className="text-[12px] italic" style={{ color: "var(--shadow-text-faint)" }}>
            Task signals will be captured from the linked goal.
          </p>
        )}

        {tab === "Notes" && (
          <TextArea
            label="Notes"
            value={save.draft.notes}
            onChange={(v) => save.update("notes", v)}
            rows={14}
            placeholder="Task notes."
          />
        )}

        {tab === "History" && (
          <ol className="space-y-2 text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
            <li>
              <span className="font-mono text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
                {new Date(task.created_at).toLocaleString()}
              </span>{" · "}task created
            </li>
            {task.updated_at && task.updated_at !== task.created_at && (
              <li>
                <span className="font-mono text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
                  {new Date(task.updated_at).toLocaleString()}
                </span>{" · "}task edited
              </li>
            )}
            {task.status === "done" && (
              <li>
                <span className="font-mono text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
                  {new Date(task.updated_at ?? task.created_at).toLocaleString()}
                </span>{" · "}
                <span style={{ color: "var(--shadow-green)" }}>task completed</span>
              </li>
            )}
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
