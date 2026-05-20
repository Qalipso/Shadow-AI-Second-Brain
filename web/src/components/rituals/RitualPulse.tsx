"use client";

import type { Habit, HabitLog } from "@/types/db";
import { isScheduledToday } from "@/lib/protocols/schedule";
import { rhythmLabel } from "./lib";

// Top summary card: a quiet pulse, not a dashboard.

export function RitualPulse({
  habits, todayLogs,
}: { habits: Habit[]; todayLogs: HabitLog[] }) {
  const active = habits.filter((h) => h.is_active);
  const scheduled = active.filter((h) => isScheduledToday(h.schedule));
  const logMap = new Map(todayLogs.map((l) => [l.habit_id, l]));

  const completed = scheduled.filter((h) => {
    const l = logMap.get(h.id);
    return l?.status === "done" || l?.status === "partial" || l?.status === "recovered";
  });
  const rhythm = scheduled.length
    ? Math.round((completed.length / scheduled.length) * 100)
    : 0;

  const sortedStable = [...active].sort((a, b) => (b.strength_score ?? 0) - (a.strength_score ?? 0));
  const mostStable = sortedStable[0] ?? null;
  const needsReturn = active.find((h) => {
    const l = rhythmLabel(h);
    return l === "fading" || l === "lost";
  }) ?? sortedStable[sortedStable.length - 1] ?? null;

  const suggested = needsReturn
    ? `Return to "${needsReturn.name}" once today, even partially.`
    : mostStable
      ? `"${mostStable.name}" is steady. Hold the rhythm.`
      : "Set one small ritual to begin a rhythm.";

  // Soft trace line: each segment is a scheduled ritual; filled = completed.
  const trace = scheduled.length > 0
    ? scheduled.map((h) => {
        const l = logMap.get(h.id);
        if (l?.status === "done")       return { v: 1.0, c: "var(--shadow-green)" };
        if (l?.status === "partial")    return { v: 0.55, c: "var(--accent-warm)" };
        if (l?.status === "recovered")  return { v: 0.7, c: "var(--shadow-gold)" };
        if (l?.status === "skipped" || l?.status === "missed") return { v: 0.1, c: "var(--shadow-text-faint)" };
        return { v: 0.2, c: "var(--shadow-text-faint)" };
      })
    : [];

  return (
    <div
      className="rounded-2xl px-6 py-5 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(126,87,194,0.06), rgba(201,163,106,0.04) 60%, rgba(18,16,28,0.4))",
        border: "1px solid var(--shadow-border)",
      }}
    >
      {/* Pulse line trace */}
      {trace.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-px flex">
          {trace.map((seg, i) => (
            <span
              key={i}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, transparent, ${seg.c} 50%, transparent)`,
                opacity: seg.v,
              }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-4">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.28em]"
          style={{ color: "rgba(180,165,230,0.75)" }}
        >
          Ritual Pulse
        </p>
        <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
          {completed.length}/{scheduled.length} today
        </span>
        <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
          rhythm <span style={{ color: "var(--shadow-text)" }}>{rhythm}%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
        <Cell label="Most stable" value={mostStable?.name ?? "—"} tone="green" />
        <Cell label="Needs return" value={needsReturn?.name ?? "—"} tone={needsReturn ? "warm" : "muted"} />
        <Cell label="Suggested next" value={suggested} tone="muted" />
      </div>
    </div>
  );
}

function Cell({
  label, value, tone,
}: { label: string; value: string; tone: "green" | "warm" | "muted" }) {
  const color =
    tone === "green" ? "var(--shadow-green)" :
    tone === "warm"  ? "var(--accent-warm)" :
    "var(--shadow-text-muted)";
  return (
    <div>
      <p
        className="text-[9px] font-mono uppercase tracking-[0.22em] mb-1"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {label}
      </p>
      <p
        className="text-[12.5px] leading-snug line-clamp-2"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}
