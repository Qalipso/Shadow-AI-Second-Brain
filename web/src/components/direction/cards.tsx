"use client";

import type { Goal, Mission, Task } from "@/types/db";
import { GOAL_TYPES, STATUS_COLOR, TASK_PRIORITIES, ENERGY_COSTS } from "./constants";

// ─── Goal Card ─────────────────────────────────────────────────────────────

export function GoalCard({
  goal, missionsCount = 0, tasksCount = 0, nextMove, lastSignal, onOpen,
}: {
  goal: Goal;
  missionsCount?: number;
  tasksCount?: number;
  nextMove?: string | null;
  lastSignal?: string | null;
  onOpen: () => void;
}) {
  const color = STATUS_COLOR[goal.status] ?? "var(--shadow-text-faint)";
  const typeLabel = GOAL_TYPES.find((t) => t.value === goal.goal_type)?.label;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left px-4 py-3.5 rounded-xl transition-all card-hover group"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--shadow-border)" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] leading-snug font-[family-name:var(--font-fraunces)] font-light"
            style={{ color: "var(--shadow-text)" }}
          >
            {goal.title}
          </p>
          {goal.why && (
            <p className="text-[11px] mt-1 leading-snug" style={{ color: "var(--shadow-text-faint)" }}>
              {goal.why}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1 mt-2">
            {typeLabel && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-mono capitalize"
                style={{ background: "rgba(126,87,194,0.08)", color: "rgba(180,155,230,0.85)" }}
              >
                {typeLabel}
              </span>
            )}
            {(goal.linked_life_areas ?? []).slice(0, 4).map((a) => (
              <span
                key={a}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono capitalize"
                style={{ background: "rgba(201,163,106,0.08)", color: "rgba(201,163,106,0.72)" }}
              >
                {a}
              </span>
            ))}
            {(goal.linked_life_areas?.length ?? 0) > 4 && (
              <span
                className="text-[9px] font-mono"
                style={{ color: "var(--shadow-text-faint)" }}
              >
                +{(goal.linked_life_areas?.length ?? 0) - 4}
              </span>
            )}
          </div>

          {goal.progress > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-0.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${goal.progress}%`, background: color }} />
              </div>
              <span className="text-[10px] font-mono tabular-nums flex-shrink-0"
                style={{ color: "var(--shadow-text-faint)" }}>
                {goal.progress}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>
              {goal.status}
            </span>
            {goal.deadline && (
              <span className="text-[10px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
                {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--shadow-text-faint)" }}>
              {missionsCount}M · {tasksCount}T
            </span>
          </div>

          {nextMove && (
            <p className="mt-2 text-[11px] leading-snug pl-2 border-l-2"
              style={{ color: "var(--shadow-text-muted)", borderColor: "rgba(201,163,106,0.35)" }}>
              <span
                className="text-[9px] uppercase tracking-widest font-mono mr-1.5"
                style={{ color: "rgba(201,163,106,0.7)" }}
              >
                Next
              </span>
              {nextMove}
            </p>
          )}
          {lastSignal && (
            <p className="mt-1 text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
              · {lastSignal}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Mission Card ──────────────────────────────────────────────────────────

export function MissionCard({
  mission, goalTitle, tasksCount = 0, nextTask, outcome, onOpen,
}: {
  mission: Mission;
  goalTitle?: string | null;
  tasksCount?: number;
  nextTask?: string | null;
  outcome?: string | null;
  onOpen: () => void;
}) {
  const color = STATUS_COLOR[mission.status] ?? "var(--shadow-text-faint)";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left px-4 py-3 rounded-xl transition-all card-hover"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--shadow-border)" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] leading-snug" style={{ color: "var(--shadow-text)" }}>
            {mission.title}
          </p>
          {goalTitle && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--shadow-text-faint)" }}>
              ↳ goal · {goalTitle}
            </p>
          )}
          {outcome && (
            <p className="text-[11.5px] mt-1.5 italic"
              style={{ color: "var(--shadow-text-muted)" }}>
              {outcome}
            </p>
          )}
          {mission.progress > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-0.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full" style={{ width: `${mission.progress}%`, background: color }} />
              </div>
              <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--shadow-text-faint)" }}>
                {mission.progress}%
              </span>
            </div>
          )}
          {mission.blocker && (
            <p className="mt-1.5 text-[11px] leading-snug pl-2 border-l-2"
              style={{ color: "var(--shadow-text-muted)", borderColor: "rgba(217,107,107,0.4)" }}>
              <span
                className="text-[9px] uppercase tracking-widest font-mono mr-1"
                style={{ color: "rgba(217,107,107,0.7)" }}
              >
                Blocker
              </span>
              {mission.blocker}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>
              {mission.status}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
              {tasksCount} tasks
            </span>
            {nextTask && (
              <span
                className="text-[10px] font-mono truncate ml-auto"
                style={{ color: "var(--accent-warm)" }}
              >
                next · {nextTask}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────

export function TaskCard({
  task, goalTitle, missionTitle, onOpen, onQuickDone,
}: {
  task: Task;
  goalTitle?: string | null;
  missionTitle?: string | null;
  onOpen: () => void;
  onQuickDone: () => void;
}) {
  const done = task.status === "done";
  const color = STATUS_COLOR[task.status] ?? "var(--shadow-text-faint)";
  const priority = TASK_PRIORITIES.find((p) => p.value === task.priority);
  const energy = ENERGY_COSTS.find((e) => e.value === task.energy_cost);

  // Completed tasks collapse — just icon + title, no metadata, no open button
  if (done) {
    return (
      <div
        className="px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
        style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid var(--shadow-border)",
          opacity: 0.45,
        }}
      >
        <button
          type="button"
          onClick={onQuickDone}
          aria-label="Mark open"
          className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
          style={{
            background: "rgba(111,191,138,0.18)",
            border: "1px solid rgba(111,191,138,0.5)",
            color: "#6FBF8A",
          }}
        >
          <span className="text-[10px]">✓</span>
        </button>
        <p
          className="text-[12px] leading-snug flex-1 min-w-0 truncate"
          style={{ color: "var(--shadow-text-faint)", textDecoration: "line-through" }}
        >
          {task.title}
        </p>
      </div>
    );
  }

  return (
    <div
      className="px-3 py-2.5 rounded-lg flex items-start gap-2 transition-all card-hover"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid var(--shadow-border)",
      }}
    >
      <button
        type="button"
        onClick={onQuickDone}
        aria-label="Mark done"
        className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center transition-all"
        style={{
          background: "transparent",
          border: "1px solid var(--shadow-border)",
          color: "#6FBF8A",
        }}
      />
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 text-left"
      >
        <p
          className="text-[12.5px] leading-snug"
          style={{ color: "var(--shadow-text)" }}
        >
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {priority && (
            <span className="text-[10px] font-mono"
              style={{ color: priorityColor(priority.value) }}>
              {priority.label}
            </span>
          )}
          {energy && (
            <span className="text-[10px] font-mono"
              style={{ color: "var(--shadow-text-faint)" }}>
              ⚡ {energy.label}
            </span>
          )}
          {goalTitle && (
            <span className="text-[10px] font-mono truncate"
              style={{ color: "var(--shadow-text-faint)" }}>
              ↳ {goalTitle}
            </span>
          )}
          {missionTitle && (
            <span className="text-[10px] font-mono truncate"
              style={{ color: "var(--shadow-text-faint)" }}>
              · {missionTitle}
            </span>
          )}
          {task.due_at && (
            <span className="text-[10px] font-mono ml-auto"
              style={{ color: "var(--shadow-text-faint)" }}>
              {new Date(task.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        {(task.linked_life_areas?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.linked_life_areas.slice(0, 4).map((a) => (
              <span key={a} className="px-1.5 py-0.5 rounded text-[9px] font-mono capitalize"
                style={{ background: "rgba(201,163,106,0.08)", color: "rgba(201,163,106,0.6)" }}>
                {a}
              </span>
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

function priorityColor(p: string): string {
  if (p === "critical") return "var(--shadow-red)";
  if (p === "high") return "var(--accent-warm)";
  if (p === "medium") return "var(--shadow-text-muted)";
  return "var(--shadow-text-faint)";
}
