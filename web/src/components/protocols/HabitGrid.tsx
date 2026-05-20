"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Habit, HabitLog } from "@/types/db";
import { getWeekDates, getMonthDates, toDateStr } from "@/lib/protocols/schedule";
import { HabitGridRow } from "./HabitGridRow";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ViewMode = "week" | "month";

interface Props {
  habits: Habit[];
  initialLogs: HabitLog[];
}

export function HabitGrid({ habits, initialLogs }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [offset, setOffset] = useState(0);
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);

  const refDate = useMemo(() => {
    const d = new Date();
    if (viewMode === "week") {
      d.setDate(d.getDate() - offset * 7);
    } else {
      d.setMonth(d.getMonth() - offset);
    }
    return d;
  }, [viewMode, offset]);

  const dates = useMemo(
    () => viewMode === "week" ? getWeekDates(refDate) : getMonthDates(refDate),
    [viewMode, refDate],
  );

  const logIndex = useMemo(() => {
    const idx = new Map<string, Map<string, HabitLog>>();
    for (const log of logs) {
      if (!idx.has(log.habit_id)) idx.set(log.habit_id, new Map());
      idx.get(log.habit_id)!.set(log.log_date, log);
    }
    return idx;
  }, [logs]);

  function handleLogUpdated(updated: HabitLog) {
    setLogs((prev) => {
      const existing = prev.findIndex(
        (l) => l.habit_id === updated.habit_id && l.log_date === updated.log_date,
      );
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }

  const activeHabits = habits.filter((h) => h.is_active);
  const todayStr = toDateStr(new Date());

  const periodLabel = viewMode === "week"
    ? `${toDateStr(dates[0])} – ${toDateStr(dates[dates.length - 1])}`
    : `${MONTH_NAMES[refDate.getMonth()]} ${refDate.getFullYear()}`;

  const showDates = dates;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--shadow-border)", background: "var(--bg-elev1)" }}
    >
      {/* Grid toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--shadow-border)" }}
      >
        <div className="flex items-center gap-1">
          <button
            className="px-3 py-1 rounded-lg text-[12px] font-mono transition-all"
            style={{
              background: viewMode === "week" ? "rgba(126,87,194,0.14)" : "transparent",
              border: `1px solid ${viewMode === "week" ? "rgba(126,87,194,0.35)" : "transparent"}`,
              color: viewMode === "week" ? "var(--shadow-violet)" : "var(--shadow-text-muted)",
            }}
            onClick={() => { setViewMode("week"); setOffset(0); }}
          >
            Week
          </button>
          <button
            className="px-3 py-1 rounded-lg text-[12px] font-mono transition-all"
            style={{
              background: viewMode === "month" ? "rgba(126,87,194,0.14)" : "transparent",
              border: `1px solid ${viewMode === "month" ? "rgba(126,87,194,0.35)" : "transparent"}`,
              color: viewMode === "month" ? "var(--shadow-violet)" : "var(--shadow-text-muted)",
            }}
            onClick={() => { setViewMode("month"); setOffset(0); }}
          >
            Month
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
            {periodLabel}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setOffset((o) => o + 1)}
              className="p-1 rounded transition-colors hover:bg-[var(--bg-elev3)]"
              style={{ color: "var(--shadow-text-muted)" }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              disabled={offset === 0}
              className="p-1 rounded transition-colors hover:bg-[var(--bg-elev3)] disabled:opacity-30"
              style={{ color: "var(--shadow-text-muted)" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="min-w-max">
          <div
            className="flex items-center gap-3 px-4 py-2 border-b"
            style={{ borderColor: "var(--shadow-border)" }}
          >
            <div className="w-44 flex-shrink-0" />
            <div className="flex gap-1.5">
              {showDates.map((date) => {
                const dateStr = toDateStr(date);
                const isToday = dateStr === todayStr;
                const dayIdx = (date.getDay() + 6) % 7;
                const label = viewMode === "week"
                  ? DAY_LABELS[dayIdx]
                  : String(date.getDate());

                return (
                  <div
                    key={dateStr}
                    className="flex items-center justify-center text-[10px] font-mono"
                    style={{
                      width: 32,
                      color: isToday ? "var(--shadow-gold)" : "var(--shadow-text-faint)",
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="w-24 flex-shrink-0" />
          </div>

          {/* Rows */}
          {activeHabits.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px]" style={{ color: "var(--shadow-text-faint)" }}>
                No rituals yet. Create your first one.
              </p>
            </div>
          ) : (
            <div className="px-4 py-2 space-y-2">
              {activeHabits.map((habit) => (
                <HabitGridRow
                  key={habit.id}
                  habit={habit}
                  dates={showDates}
                  logsByDate={logIndex.get(habit.id) ?? new Map()}
                  onLogUpdated={handleLogUpdated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
