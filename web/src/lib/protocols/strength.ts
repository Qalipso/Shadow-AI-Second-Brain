import type { HabitLog } from "@/types/db";

export type StrengthState = "unstable" | "forming" | "stable" | "strong" | "automatic";

export function strengthState(score: number): StrengthState {
  if (score <= 25) return "unstable";
  if (score <= 50) return "forming";
  if (score <= 75) return "stable";
  if (score <= 90) return "strong";
  return "automatic";
}

export const STRENGTH_STATE_COLORS: Record<StrengthState, string> = {
  unstable: "var(--cell-failed)",
  forming: "#f97316",
  stable: "#3b82f6",
  strong: "var(--cell-done)",
  automatic: "var(--cell-recovered)",
};

/**
 * Computes habit strength 0–100 from recent logs.
 * Uses last 30 days of logs.
 */
export function calcHabitStrength(logs: HabitLog[]): number {
  if (logs.length === 0) return 0;

  const sorted = [...logs].sort(
    (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime(),
  );

  const total = sorted.length;
  const done = sorted.filter((l) => l.status === "done" || l.status === "recovered").length;
  const partial = sorted.filter((l) => l.status === "partial").length;

  // Completion rate (done=1, partial=0.5, else=0)
  const completionRate = (done + partial * 0.5) / total;

  // Consistency: penalize gaps (missed/failed in a row)
  let maxGap = 0;
  let currentGap = 0;
  for (const log of sorted) {
    if (log.status === "missed" || log.status === "failed") {
      currentGap++;
      maxGap = Math.max(maxGap, currentGap);
    } else {
      currentGap = 0;
    }
  }
  const consistencyScore = Math.max(0, 1 - maxGap / 7);

  // Recent momentum: weight last 7 days more heavily
  const recent = sorted.slice(0, 7);
  const recentDone = recent.filter(
    (l) => l.status === "done" || l.status === "recovered" || l.status === "partial",
  ).length;
  const recentMomentum = recent.length > 0 ? recentDone / recent.length : 0.5;

  // Recovery score: how often user recovered after skip/miss
  const missedOrFailed = sorted.filter(
    (l) => l.status === "missed" || l.status === "failed",
  ).length;
  const recovered = sorted.filter((l) => l.status === "recovered").length;
  const recoveryScore = missedOrFailed > 0 ? Math.min(1, recovered / missedOrFailed) : 1;

  // Streak bonus (streak from sorted logs = consecutive done/partial from latest)
  let streak = 0;
  for (const log of sorted) {
    if (log.status === "done" || log.status === "partial" || log.status === "recovered") {
      streak++;
    } else {
      break;
    }
  }
  const streakBonus = Math.min(1, streak / 30);

  const raw =
    completionRate * 35 +
    consistencyScore * 25 +
    recentMomentum * 20 +
    recoveryScore * 10 +
    streakBonus * 10;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

/** Recomputes streak + completion rate from sorted logs */
export function calcStreakAndRate(logs: HabitLog[]): {
  streakCurrent: number;
  streakBest: number;
  completionRate: number;
} {
  if (logs.length === 0) return { streakCurrent: 0, streakBest: 0, completionRate: 0 };

  const sorted = [...logs].sort(
    (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime(),
  );

  // Current streak
  let streakCurrent = 0;
  for (const log of sorted) {
    if (log.status === "done" || log.status === "partial" || log.status === "recovered") {
      streakCurrent++;
    } else {
      break;
    }
  }

  // Best streak (scan forward)
  let best = 0;
  let cur = 0;
  for (const log of [...sorted].reverse()) {
    if (log.status === "done" || log.status === "partial" || log.status === "recovered") {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }

  const doneCount = sorted.filter(
    (l) => l.status === "done" || l.status === "partial" || l.status === "recovered",
  ).length;
  const completionRate = Math.round((doneCount / sorted.length) * 100);

  return { streakCurrent, streakBest: best, completionRate };
}

/** Points awarded per log status */
export function pointsForStatus(status: HabitLog["status"]): number {
  switch (status) {
    case "done": return 10;
    case "partial": return 5;
    case "recovered": return 8;
    default: return 0;
  }
}
