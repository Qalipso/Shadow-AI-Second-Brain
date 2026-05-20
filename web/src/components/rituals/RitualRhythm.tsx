"use client";

import type { Habit, HabitLog } from "@/types/db";
import { getWeekDates, isScheduledOn, toDateStr } from "@/lib/protocols/schedule";
import { rhythmColor, rhythmLabel } from "./lib";

// Week view as a soft trace, not a grid. One row per ritual.

type CellState = "done" | "partial" | "recovered" | "missed" | "skipped" | "empty" | "future";

export function RitualRhythm({
  habits, weekLogs,
}: { habits: Habit[]; weekLogs: HabitLog[] }) {
  const active = habits.filter((h) => h.is_active);
  if (active.length === 0) return null;

  const dates = getWeekDates(new Date());
  const today = toDateStr(new Date());

  // index logs by habit_id + date
  const logIndex = new Map<string, HabitLog>();
  for (const l of weekLogs) {
    logIndex.set(`${l.habit_id}:${l.log_date}`, l);
  }

  function cellState(habit: Habit, date: Date): CellState {
    const dateStr = toDateStr(date);
    const log = logIndex.get(`${habit.id}:${dateStr}`);
    const scheduled = isScheduledOn(habit.schedule, date);
    if (!scheduled) return "empty";
    if (log) {
      if (log.status === "done") return "done";
      if (log.status === "partial") return "partial";
      if (log.status === "recovered") return "recovered";
      if (log.status === "skipped") return "skipped";
      return "missed";
    }
    if (dateStr > today) return "future";
    return "missed";
  }

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.018)",
        border: "1px solid var(--shadow-border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.28em]"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          Ritual Rhythm
        </p>
        <div className="hidden sm:flex items-center gap-3 text-[9px] font-mono"
          style={{ color: "var(--shadow-text-faint)" }}>
          <Legend color="var(--shadow-green)" label="done" />
          <Legend color="var(--shadow-gold)" label="returned" />
          <Legend color="var(--accent-warm)" label="partial" />
          <Legend color="var(--shadow-red)" label="missed" />
        </div>
      </div>

      <ul className="space-y-3">
        {active.map((habit) => {
          const label = rhythmLabel(habit);
          const color = rhythmColor(label);
          const cells = dates.map((d) => cellState(habit, d));
          return (
            <li key={habit.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
              <div className="min-w-0">
                <p
                  className="text-[12.5px] truncate"
                  style={{ color: "var(--shadow-text)" }}
                >
                  {habit.name}
                </p>
                <p
                  className="text-[10px] font-mono uppercase tracking-wider truncate"
                  style={{ color: "var(--shadow-text-faint)" }}
                >
                  {habit.sphere_slugs.slice(0, 3).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {cells.map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full transition-all"
                        style={{
                          background: cellBg(c, color),
                          border: c === "empty" || c === "future"
                            ? "1px dashed var(--shadow-border)"
                            : `1px solid ${cellBorder(c, color)}`,
                          opacity: c === "future" ? 0.35 : 1,
                        }}
                      />
                      <span
                        className="text-[8.5px] font-mono"
                        style={{ color: "var(--shadow-text-faint)" }}
                      >
                        {dayLabels[i]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="ml-3 text-right min-w-[68px]">
                  <p
                    className="text-[10px] font-mono uppercase tracking-wider"
                    style={{ color }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-[10px] font-mono tabular-nums"
                    style={{ color: "var(--shadow-text-faint)" }}
                  >
                    {habit.strength_score ?? 0}%
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function cellBg(c: CellState, color: string): string {
  switch (c) {
    case "done":      return "var(--shadow-green)";
    case "recovered": return "var(--shadow-gold)";
    case "partial":   return color;
    case "missed":    return "rgba(172,82,101,0.25)";
    case "skipped":   return "rgba(255,255,255,0.04)";
    case "empty":
    case "future":    return "transparent";
  }
}
function cellBorder(c: CellState, color: string): string {
  switch (c) {
    case "done":      return "var(--shadow-green)";
    case "recovered": return "var(--shadow-gold)";
    case "partial":   return color;
    case "missed":    return "rgba(172,82,101,0.5)";
    case "skipped":   return "var(--shadow-border)";
    case "empty":
    case "future":    return "var(--shadow-border)";
  }
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
