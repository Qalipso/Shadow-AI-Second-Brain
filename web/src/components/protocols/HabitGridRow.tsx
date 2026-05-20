"use client";

import { useState } from "react";
import type { Habit, HabitLog, HabitLogStatus } from "@/types/db";
import { strengthState } from "@/lib/protocols/strength";
import { toDateStr } from "@/lib/protocols/schedule";
import { HabitCell } from "./HabitCell";
import { HabitDrawer } from "./HabitDrawer";

const SPHERE_COLORS: Record<string, string> = {
  work: "#C9A36A",
  money: "#6FBF8A",
  health: "#6DBFA5",
  energy: "#FFD166",
  food: "#A8D5BA",
  mind: "#A78BFA",
  creativity: "#F472B6",
  social: "#60A5FA",
  emotion: "#FB923C",
  discipline: "#94A3B8",
  environment: "#34D399",
  meaning: "#E879F9",
};

interface Props {
  habit: Habit;
  dates: Date[];
  logsByDate: Map<string, HabitLog>;
  onLogUpdated: (log: HabitLog) => void;
}

export function HabitGridRow({ habit, dates, logsByDate, onLogUpdated }: Props) {
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const todayStr = toDateStr(new Date());
  const state = strengthState(habit.strength_score);

  const stateColor = {
    unstable: "var(--shadow-red)",
    forming: "rgba(214, 184, 116, 0.6)",
    stable: "var(--shadow-blue)",
    strong: "var(--shadow-violet)",
    automatic: "var(--shadow-green)",
  }[state];

  return (
    <>
      <div className="flex items-center gap-3 group">
        {/* Habit name + spheres */}
        <div className="w-44 flex-shrink-0 min-w-0">
          <p
            className="text-[12px] font-medium truncate"
            style={{ color: "var(--shadow-text)" }}
            title={habit.name}
          >
            {habit.name}
          </p>
          <div className="flex gap-1 mt-0.5">
            {habit.sphere_slugs.slice(0, 2).map((slug) => (
              <span
                key={slug}
                className="text-[9px] font-mono uppercase"
                style={{ color: `${SPHERE_COLORS[slug] ?? "var(--shadow-text-faint)"}aa` }}
              >
                {slug}
              </span>
            ))}
          </div>
        </div>

        {/* Cells */}
        <div className="flex gap-1.5">
          {dates.map((date) => {
            const dateStr = toDateStr(date);
            const log = logsByDate.get(dateStr);
            const status: HabitLogStatus | "empty" = (log?.status as HabitLogStatus) ?? "empty";
            const isToday = dateStr === todayStr;

            return (
              <HabitCell
                key={dateStr}
                status={status}
                isToday={isToday}
                hasNote={!!log?.note}
                onClick={() => setDrawerDate(dateStr)}
              />
            );
          })}
        </div>

        {/* Score + strength */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elev3)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${habit.strength_score}%`, background: stateColor }}
            />
          </div>
          <span className="text-[11px] font-mono w-8 text-right" style={{ color: stateColor }}>
            {Math.round(habit.strength_score)}%
          </span>
        </div>
      </div>

      {drawerDate && (
        <HabitDrawer
          habit={habit}
          log={logsByDate.get(drawerDate) ?? null}
          open={true}
          onClose={() => setDrawerDate(null)}
          date={drawerDate}
          onSaved={(log) => {
            onLogUpdated(log);
            setDrawerDate(null);
          }}
        />
      )}
    </>
  );
}
