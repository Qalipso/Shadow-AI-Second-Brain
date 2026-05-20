"use client";

import { useCallback, useEffect, useState } from "react";
import type { Goal } from "@/types/db";
import { GoalCard } from "@/components/direction/cards";
import { GoalDetailDrawer } from "@/components/direction/GoalDetailDrawer";
import { CreateGoalModal } from "@/components/direction/CreateGoalModal";

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openGoal, setOpenGoal] = useState<Goal | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goals");
      const j = await res.json() as { goals?: Goal[]; error?: string };
      if (!res.ok) {
        setError(j.error ?? "Failed to load goals.");
        return;
      }
      setGoals(j.goals ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCreated(goal: Goal) {
    setGoals((prev) => [goal, ...prev]);
  }

  function handleGoalUpdated(updated: Goal) {
    setGoals((prev) => prev.map((g) => g.id === updated.id ? updated : g));
    if (openGoal?.id === updated.id) setOpenGoal(updated);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
          {loading ? "…" : `${goals.length} direction vector${goals.length !== 1 ? "s" : ""}`}
        </span>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
          style={{
            background: "rgba(201,163,106,0.08)",
            border: "1px solid rgba(201,163,106,0.25)",
            color: "var(--accent-warm)",
          }}
        >
          + New Goal
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading goals">
          {[90, 75, 85].map((w, i) => (
            <div
              key={i}
              className="h-20 rounded-xl animate-pulse"
              style={{ width: `${w}%`, background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="py-8 text-center space-y-2">
          <p className="text-[12px]" style={{ color: "#E36161" }}>{error}</p>
          <button
            type="button"
            onClick={load}
            className="text-[11px] font-mono"
            style={{ color: "var(--accent-warm)" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--shadow-text-muted)" }}
          >
            No goals set yet.
          </p>
          <p className="text-[11px]" style={{ color: "var(--shadow-text-faint)" }}>
            A goal is an outcome Shadow tracks across your life map.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono transition-colors"
            style={{ color: "var(--accent-warm)" }}
          >
            Set first direction <span aria-hidden>→</span>
          </button>
        </div>
      )}

      {/* List */}
      {!loading && !error && goals.length > 0 && (
        <div className="space-y-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onOpen={() => setOpenGoal(goal)}
            />
          ))}
        </div>
      )}

      <CreateGoalModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />

      <GoalDetailDrawer
        open={!!openGoal}
        goal={openGoal}
        onClose={() => setOpenGoal(null)}
        onChanged={handleGoalUpdated}
      />
    </div>
  );
}
