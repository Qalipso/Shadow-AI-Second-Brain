"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Goal, Mission, Task } from "@/types/db";
import { TaskCard } from "@/components/direction/cards";
import { TaskDetailDrawer } from "@/components/direction/TaskDetailDrawer";
import { EmptyState } from "@/components/EmptyState";

type FilterStatus = "all" | "open" | "done";

const FILTER_LABELS: Record<FilterStatus, string> = {
  all: "All",
  open: "Open",
  done: "Done",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("open");
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, g, m] = await Promise.all([
        fetch("/api/tasks").then((r) => r.json()).catch(() => ({})),
        fetch("/api/goals").then((r) => r.json()).catch(() => ({})),
        fetch("/api/missions").then((r) => r.json()).catch(() => ({})),
      ]);
      setTasks(t.tasks ?? []);
      setGoals(g.goals ?? []);
      setMissions(m.missions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const missionById = useMemo(() => new Map(missions.map((m) => [m.id, m])), [missions]);

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "open") return tasks.filter((t) => t.status === "open");
    return tasks.filter((t) => t.status === "done");
  }, [tasks, filter]);

  const counts: Record<FilterStatus, number> = useMemo(() => ({
    all: tasks.length,
    open: tasks.filter((t) => t.status === "open").length,
    done: tasks.filter((t) => t.status === "done").length,
  }), [tasks]);

  async function quickToggle(task: Task) {
    const newStatus = task.status === "done" ? "open" : "done";
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const j = await res.json();
    if (res.ok && j.task) {
      setTasks((prev) => prev.map((t) => t.id === j.task.id ? j.task : t));
    }
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--shadow-border)" }}
      >
        {(["open", "all", "done"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono transition-all duration-150"
            style={
              filter === f
                ? { background: "rgba(201,163,106,0.1)", color: "var(--accent-warm)", border: "1px solid rgba(201,163,106,0.2)" }
                : { color: "var(--shadow-text-faint)", border: "1px solid transparent" }
            }
          >
            {FILTER_LABELS[f]}
            {counts[f] > 0 && (
              <span
                className="text-[9px] tabular-nums px-1 rounded"
                style={{
                  background: filter === f ? "rgba(201,163,106,0.15)" : "rgba(255,255,255,0.06)",
                  color: filter === f ? "var(--accent-warm)" : "var(--shadow-text-faint)",
                }}
              >
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">
          {[80, 65, 90].map((w, i) => (
            <div
              key={i}
              className="h-14 rounded-xl animate-pulse"
              style={{ width: `${w}%`, background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          headline={filter === "done" ? "Nothing completed yet." : "No open tasks."}
          sub={filter === "done" ? "Finish a task to see it here." : "Open a goal in Direction and add tasks."}
          cta={filter !== "done" ? { label: "Go to Direction", href: "/direction" } : undefined}
        />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              goalTitle={task.goal_id ? goalById.get(task.goal_id)?.title : undefined}
              missionTitle={task.mission_id ? missionById.get(task.mission_id)?.title : undefined}
              onOpen={() => setOpenTask(task)}
              onQuickDone={() => quickToggle(task)}
            />
          ))}
        </div>
      )}

      <TaskDetailDrawer
        open={!!openTask}
        task={openTask}
        goals={goals}
        missions={missions}
        onClose={() => setOpenTask(null)}
        onChanged={handleTaskUpdated}
      />
    </div>
  );
}
