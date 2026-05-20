"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CreateGoalModal } from "./CreateGoalModal";
import type { Goal, Mission, Task } from "@/types/db";
import { GoalCard, MissionCard, TaskCard } from "./cards";
import { GoalDetailDrawer } from "./GoalDetailDrawer";
import { MissionDetailDrawer } from "./MissionDetailDrawer";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

const TABS = ["Overview", "Goals", "Missions", "Tasks", "Blocked", "Done"] as const;
type Tab = (typeof TABS)[number];

// ─── Main component ───────────────────────────────────────────────────────────
export function DirectionView() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Drawer state
  const [openGoal, setOpenGoal]       = useState<Goal | null>(null);
  const [openMission, setOpenMission] = useState<Mission | null>(null);
  const [openTask, setOpenTask]       = useState<Task | null>(null);

  // ── Fetch everything in parallel ──
  useEffect(() => {
    Promise.all([
      fetch("/api/goals").then((r) => r.json()).catch(() => ({})),
      fetch("/api/missions").then((r) => r.json()).catch(() => ({})),
      fetch("/api/tasks").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([g, m, t]) => {
        setGoals(g.goals ?? []);
        setMissions(m.missions ?? []);
        setTasks(t.tasks ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleGoalCreated(goal: Goal)    { setGoals((p) => [goal, ...p]); }
  function handleGoalUpdated(goal: Goal)    { setGoals((p) => p.map((g) => g.id === goal.id ? goal : g)); }
  function handleMissionUpdated(m: Mission) { setMissions((p) => p.map((x) => x.id === m.id ? m : x)); }
  function handleTaskUpdated(t: Task)       { setTasks((p) => p.map((x) => x.id === t.id ? t : x)); }

  async function quickToggleTask(t: Task) {
    const newStatus = t.status === "done" ? "open" : "done";
    const res = await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const j = await res.json();
    if (res.ok && j.task) handleTaskUpdated(j.task);
  }

  // Index helpers
  const goalById    = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const missionById = useMemo(() => new Map(missions.map((m) => [m.id, m])), [missions]);
  const missionsByGoal = useMemo(() => {
    const map = new Map<string, Mission[]>();
    for (const m of missions) {
      if (!m.goal_id) continue;
      const arr = map.get(m.goal_id) ?? [];
      arr.push(m); map.set(m.goal_id, arr);
    }
    return map;
  }, [missions]);
  const tasksByGoal = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.goal_id) continue;
      const arr = map.get(t.goal_id) ?? [];
      arr.push(t); map.set(t.goal_id, arr);
    }
    return map;
  }, [tasks]);
  const tasksByMission = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.mission_id) continue;
      const arr = map.get(t.mission_id) ?? [];
      arr.push(t); map.set(t.mission_id, arr);
    }
    return map;
  }, [tasks]);

  // Tab counters
  const counts: Partial<Record<Tab, number>> = {
    Goals:    goals.filter((g) => g.status === "active" || g.status === "paused").length,
    Missions: missions.filter((m) => m.status === "active" || m.status === "paused").length,
    Tasks:    tasks.filter((t) => t.status === "open").length,
    Blocked:  missions.filter((m) => m.status === "blocked").length
            + tasks.filter((t) => /---BLOCKER---/.test(t.description ?? "")).length,
    Done:     goals.filter((g) => g.status === "completed" || g.status === "abandoned").length
            + tasks.filter((t) => t.status === "done").length,
  };

  function renderTab() {
    if (loading) {
      return (
        <p className="py-12 text-center text-[12px] font-mono animate-pulse"
          style={{ color: "var(--shadow-text-faint)" }}>Loading…</p>
      );
    }

    if (tab === "Overview" && goals.length === 0 && missions.length === 0 && tasks.length === 0) {
      return <DirectionEmpty onCreateGoal={() => setCreateOpen(true)} />;
    }

    switch (tab) {
      case "Overview": return (
        <OverviewTab
          goals={goals} missions={missions} tasks={tasks}
          missionsByGoal={missionsByGoal} tasksByGoal={tasksByGoal}
          onOpenGoal={setOpenGoal}
          onOpenMission={setOpenMission}
          onOpenTask={setOpenTask}
          onQuickDone={quickToggleTask}
          onCreateGoal={() => setCreateOpen(true)}
        />
      );
      case "Goals": return (
        <GoalsTab
          goals={goals}
          missionsByGoal={missionsByGoal}
          tasksByGoal={tasksByGoal}
          onOpenGoal={setOpenGoal}
          onCreateGoal={() => setCreateOpen(true)}
        />
      );
      case "Missions": return (
        <MissionsTab
          missions={missions} goalById={goalById}
          tasksByMission={tasksByMission}
          onOpenMission={setOpenMission}
        />
      );
      case "Tasks": return (
        <TasksTab
          tasks={tasks} goalById={goalById} missionById={missionById}
          onOpenTask={setOpenTask} onQuickDone={quickToggleTask}
        />
      );
      case "Blocked": return (
        <BlockedTab
          missions={missions} tasks={tasks} goalById={goalById} missionById={missionById}
          onOpenMission={setOpenMission} onOpenTask={setOpenTask} onQuickDone={quickToggleTask}
        />
      );
      case "Done": return (
        <DoneTab
          goals={goals} tasks={tasks} goalById={goalById} missionById={missionById}
          onOpenGoal={setOpenGoal} onOpenTask={setOpenTask} onQuickDone={quickToggleTask}
        />
      );
    }
  }

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Shadow · Self Map"
        title="Direction"
        subtitle="Goals, missions and actions connected to your life map."
      />

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl w-fit overflow-x-auto scrollbar-hide"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--shadow-border)" }}
      >
        {TABS.map((t) => {
          const count = counts[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono transition-all duration-150 whitespace-nowrap"
              style={
                tab === t
                  ? { background: "rgba(201,163,106,0.1)", color: "var(--accent-warm)", border: "1px solid rgba(201,163,106,0.2)" }
                  : { color: "var(--shadow-text-faint)", border: "1px solid transparent" }
              }
            >
              {t}
              {count !== undefined && count > 0 && (
                <span
                  className="text-[9px] font-mono tabular-nums px-1 rounded"
                  style={{
                    background: tab === t ? "rgba(201,163,106,0.15)" : "rgba(255,255,255,0.06)",
                    color: tab === t ? "var(--accent-warm)" : "var(--shadow-text-faint)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="glow-line" />

      {renderTab()}

      <CreateGoalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleGoalCreated}
      />

      <GoalDetailDrawer
        open={!!openGoal}
        goal={openGoal}
        onClose={() => setOpenGoal(null)}
        onChanged={handleGoalUpdated}
      />

      <MissionDetailDrawer
        open={!!openMission}
        mission={openMission}
        goals={goals}
        onClose={() => setOpenMission(null)}
        onChanged={handleMissionUpdated}
      />

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

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({
  goals, missions, tasks, missionsByGoal, tasksByGoal,
  onOpenGoal, onOpenMission, onOpenTask, onQuickDone, onCreateGoal,
}: {
  goals: Goal[]; missions: Mission[]; tasks: Task[];
  missionsByGoal: Map<string, Mission[]>;
  tasksByGoal: Map<string, Task[]>;
  onOpenGoal: (g: Goal) => void;
  onOpenMission: (m: Mission) => void;
  onOpenTask: (t: Task) => void;
  onQuickDone: (t: Task) => void;
  onCreateGoal: () => void;
}) {
  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");
  const avgProgress = active.length
    ? Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length)
    : 0;
  const openTasks = tasks.filter((t) => t.status === "open");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
        <Metric label="Goals"    value={active.length}   suffix="active" warm />
        <Metric label="Missions" value={missions.filter((m) => m.status === "active").length} suffix="active" />
        <Metric label="Tasks"    value={openTasks.length} suffix="open" />
        <span className="text-zinc-500">
          Avg progress <span className="text-zinc-300">{avgProgress}%</span>
        </span>
        {completed.length > 0 && (
          <span className="text-zinc-500">
            <span className="text-zinc-300">{completed.length}</span> completed
          </span>
        )}
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest mb-2"
            style={{ color: "var(--shadow-text-faint)" }}>Active goals</p>
          {active.slice(0, 3).map((g) => (
            <GoalCard
              key={g.id} goal={g}
              missionsCount={missionsByGoal.get(g.id)?.length ?? 0}
              tasksCount={tasksByGoal.get(g.id)?.length ?? 0}
              onOpen={() => onOpenGoal(g)}
            />
          ))}
          {active.length > 3 && (
            <p className="text-[11px] text-center pt-1" style={{ color: "var(--shadow-text-faint)" }}>
              +{active.length - 3} more in Goals tab
            </p>
          )}
        </div>
      )}

      {openTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest mb-2"
            style={{ color: "var(--shadow-text-faint)" }}>Open tasks</p>
          {openTasks.slice(0, 5).map((t) => (
            <TaskCard
              key={t.id} task={t}
              onOpen={() => onOpenTask(t)}
              onQuickDone={() => onQuickDone(t)}
            />
          ))}
        </div>
      )}

      <button
        onClick={onCreateGoal}
        className="w-full py-2.5 rounded-xl text-[12px] font-mono transition-all"
        style={{
          background: "rgba(201,163,106,0.04)",
          border: "1px dashed rgba(201,163,106,0.18)",
          color: "var(--shadow-text-faint)",
        }}
      >
        + Set new direction
      </button>
    </div>
  );
}

function Metric({ label, value, suffix, warm }: { label: string; value: number; suffix?: string; warm?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
      <span className="font-[family-name:var(--font-fraunces)] text-xl"
        style={{ color: warm ? "var(--accent-warm)" : "var(--shadow-text)" }}>
        {value}
      </span>
      {suffix && <span className="text-zinc-600">{suffix}</span>}
    </div>
  );
}

// ─── Goals tab ────────────────────────────────────────────────────────────────
function GoalsTab({
  goals, missionsByGoal, tasksByGoal, onOpenGoal, onCreateGoal,
}: {
  goals: Goal[];
  missionsByGoal: Map<string, Mission[]>;
  tasksByGoal: Map<string, Task[]>;
  onOpenGoal: (g: Goal) => void;
  onCreateGoal: () => void;
}) {
  const active = goals.filter((g) => g.status === "active" || g.status === "paused");

  if (active.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-[12px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>No active goals.</p>
        <button
          onClick={onCreateGoal}
          className="px-4 py-2 rounded-lg text-[12px] font-mono"
          style={{ background: "rgba(201,163,106,0.08)", border: "1px solid rgba(201,163,106,0.2)", color: "var(--accent-warm)" }}
        >
          Set Direction
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {active.map((g) => (
        <GoalCard
          key={g.id} goal={g}
          missionsCount={missionsByGoal.get(g.id)?.length ?? 0}
          tasksCount={tasksByGoal.get(g.id)?.length ?? 0}
          onOpen={() => onOpenGoal(g)}
        />
      ))}
      <button
        onClick={onCreateGoal}
        className="w-full py-2.5 mt-2 rounded-xl text-[12px] font-mono"
        style={{ background: "rgba(201,163,106,0.04)", border: "1px dashed rgba(201,163,106,0.18)", color: "var(--shadow-text-faint)" }}
      >
        + Set new direction
      </button>
    </div>
  );
}

// ─── Missions tab ─────────────────────────────────────────────────────────────
function MissionsTab({
  missions, goalById, tasksByMission, onOpenMission,
}: {
  missions: Mission[];
  goalById: Map<string, Goal>;
  tasksByMission: Map<string, Task[]>;
  onOpenMission: (m: Mission) => void;
}) {
  const active = missions.filter((m) => m.status !== "completed" && m.status !== "abandoned");
  if (active.length === 0) {
    return (
      <p className="py-12 text-center text-[12px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
        No missions yet. Open a goal and add the first mission.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {active.map((m) => {
        const taskList = tasksByMission.get(m.id) ?? [];
        const nextTask = taskList.find((t) => t.status === "open")?.title;
        return (
          <MissionCard
            key={m.id} mission={m}
            goalTitle={m.goal_id ? goalById.get(m.goal_id)?.title : undefined}
            tasksCount={taskList.length}
            nextTask={nextTask}
            onOpen={() => onOpenMission(m)}
          />
        );
      })}
    </div>
  );
}

// ─── Tasks tab ────────────────────────────────────────────────────────────────
function TasksTab({
  tasks, goalById, missionById, onOpenTask, onQuickDone,
}: {
  tasks: Task[];
  goalById: Map<string, Goal>;
  missionById: Map<string, Mission>;
  onOpenTask: (t: Task) => void;
  onQuickDone: (t: Task) => void;
}) {
  const open = tasks.filter((t) => t.status === "open");
  if (open.length === 0) {
    return (
      <p className="py-12 text-center text-[12px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
        No open tasks. Open a goal or mission to add one.
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      {open.map((t) => (
        <TaskCard
          key={t.id} task={t}
          goalTitle={t.goal_id ? goalById.get(t.goal_id)?.title : undefined}
          missionTitle={t.mission_id ? missionById.get(t.mission_id)?.title : undefined}
          onOpen={() => onOpenTask(t)}
          onQuickDone={() => onQuickDone(t)}
        />
      ))}
    </div>
  );
}

// ─── Blocked tab ──────────────────────────────────────────────────────────────
function BlockedTab({
  missions, tasks, goalById, missionById, onOpenMission, onOpenTask, onQuickDone,
}: {
  missions: Mission[]; tasks: Task[];
  goalById: Map<string, Goal>; missionById: Map<string, Mission>;
  onOpenMission: (m: Mission) => void;
  onOpenTask: (t: Task) => void;
  onQuickDone: (t: Task) => void;
}) {
  const blockedMissions = missions.filter((m) => m.status === "blocked");
  const blockedTasks = tasks.filter((t) => /---BLOCKER---/.test(t.description ?? ""));

  if (blockedMissions.length === 0 && blockedTasks.length === 0) {
    return (
      <p className="py-12 text-center text-[12px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
        Nothing blocked. Capture blockers as you notice them.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {blockedMissions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "var(--shadow-text-faint)" }}>Blocked missions</p>
          {blockedMissions.map((m) => (
            <MissionCard
              key={m.id} mission={m}
              goalTitle={m.goal_id ? goalById.get(m.goal_id)?.title : undefined}
              onOpen={() => onOpenMission(m)}
            />
          ))}
        </div>
      )}
      {blockedTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "var(--shadow-text-faint)" }}>Blocked tasks</p>
          {blockedTasks.map((t) => (
            <TaskCard
              key={t.id} task={t}
              goalTitle={t.goal_id ? goalById.get(t.goal_id)?.title : undefined}
              missionTitle={t.mission_id ? missionById.get(t.mission_id)?.title : undefined}
              onOpen={() => onOpenTask(t)}
              onQuickDone={() => onQuickDone(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Done tab ─────────────────────────────────────────────────────────────────
function DoneTab({
  goals, tasks, goalById, missionById, onOpenGoal, onOpenTask, onQuickDone,
}: {
  goals: Goal[]; tasks: Task[];
  goalById: Map<string, Goal>; missionById: Map<string, Mission>;
  onOpenGoal: (g: Goal) => void;
  onOpenTask: (t: Task) => void;
  onQuickDone: (t: Task) => void;
}) {
  const doneGoals = goals.filter((g) => g.status === "completed" || g.status === "abandoned");
  const doneTasks = tasks.filter((t) => t.status === "done");

  if (doneGoals.length === 0 && doneTasks.length === 0) {
    return (
      <p className="py-12 text-center text-[12px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
        Nothing completed yet.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {doneGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "var(--shadow-text-faint)" }}>Goals</p>
          {doneGoals.map((g) => <GoalCard key={g.id} goal={g} onOpen={() => onOpenGoal(g)} />)}
        </div>
      )}
      {doneTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "var(--shadow-text-faint)" }}>Tasks</p>
          {doneTasks.slice(0, 50).map((t) => (
            <TaskCard
              key={t.id} task={t}
              goalTitle={t.goal_id ? goalById.get(t.goal_id)?.title : undefined}
              missionTitle={t.mission_id ? missionById.get(t.mission_id)?.title : undefined}
              onOpen={() => onOpenTask(t)}
              onQuickDone={() => onQuickDone(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function DirectionEmpty({ onCreateGoal }: { onCreateGoal: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="w-24 h-24 rounded-full mb-10 dir-orb-breathe"
        style={{
          background: "radial-gradient(circle at 38% 36%, rgba(201,163,106,0.14) 0%, rgba(9,8,16,0.92) 65%)",
          border: "1px solid rgba(201,163,106,0.1)",
        }}
      />
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] mb-4"
        style={{ color: "var(--shadow-text-faint)" }}>Direction</p>
      <h2 className="text-[22px] font-[family-name:var(--font-fraunces)] font-light mb-3 leading-snug"
        style={{ color: "var(--shadow-text-muted)" }}>
        No direction formed yet.
      </h2>
      <p className="text-[13px] max-w-[320px] leading-relaxed mb-10"
        style={{ color: "var(--shadow-text-faint)" }}>
        Drop a thought, define a goal, or let Shadow extract direction from your recent signals.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-10">
        <button
          onClick={onCreateGoal}
          className="px-5 py-2.5 rounded-xl text-[13px] font-mono"
          style={{ background: "rgba(201,163,106,0.10)", border: "1px solid rgba(201,163,106,0.3)", color: "var(--accent-warm)" }}
        >
          Set Direction
        </button>
        <button
          onClick={() => { window.location.href = "/inbox"; }}
          className="px-5 py-2.5 rounded-xl text-[13px] font-mono"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--shadow-border)", color: "var(--shadow-text-muted)" }}
        >
          Capture Thought
        </button>
      </div>
    </div>
  );
}
