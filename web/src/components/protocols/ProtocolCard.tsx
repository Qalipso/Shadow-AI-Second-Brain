"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Habit, HabitLog, HabitLogStatus } from "@/types/db";
import { strengthState } from "@/lib/protocols/strength";
import { HabitDrawer } from "./HabitDrawer";

const SPHERE_COLORS: Record<string, string> = {
  work:        "#C9A36A",
  money:       "#6FBF8A",
  health:      "#6DBFA5",
  energy:      "#FFD166",
  food:        "#A8D5BA",
  mind:        "#A78BFA",
  creativity:  "#F472B6",
  social:      "#60A5FA",
  emotion:     "#FB923C",
  discipline:  "#94A3B8",
  environment: "#34D399",
  meaning:     "#E879F9",
};

interface Props {
  habit: Habit;
  log: HabitLog | null;
  onLogged: (log: HabitLog, points: number, soulsAwarded: number) => void;
}

export function ProtocolCard({ habit, log, onLogged }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const state = strengthState(habit.strength_score);

  const isDone =
    log?.status === "done" ||
    log?.status === "partial" ||
    log?.status === "recovered";

  const statusLabel = (): string => {
    if (!log) return "pending";
    const map: Partial<Record<HabitLogStatus, string>> = {
      done:      "done",
      partial:   "partial",
      recovered: "returned",
      skipped:   "skipped",
      missed:    "missed",
      failed:    "failed",
    };
    return map[log.status] ?? log.status;
  };

  const statusColor = (): string => {
    if (!log) return "var(--shadow-text-faint)";
    if (log.status === "done") return "var(--shadow-green)";
    if (log.status === "partial") return "var(--shadow-violet)";
    if (log.status === "recovered") return "var(--shadow-gold)";
    if (log.status === "skipped") return "var(--shadow-text-faint)";
    return "var(--shadow-red)";
  };

  const barColor = isDone
    ? "var(--shadow-gold)"
    : state === "unstable"
      ? "var(--shadow-red)"
      : "var(--shadow-violet)";

  return (
    <>
      <div
        className="rounded-2xl border px-5 py-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background: isDone
            ? "rgba(113, 179, 139, 0.035)"
            : "var(--shadow-panel-soft)",
          borderColor: isDone
            ? "var(--shadow-border-active)"
            : "var(--shadow-border)",
          boxShadow: isDone ? "var(--shadow-glow-gold)" : "none",
        }}
        onClick={() => setDrawerOpen(true)}
      >
        {/* Name row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          {isDone ? (
            <CheckCircle2
              size={14}
              className="flex-shrink-0"
              style={{ color: "var(--shadow-gold)" }}
            />
          ) : (
            <div
              className="w-3.5 h-3.5 rounded-full border flex-shrink-0"
              style={{ borderColor: "var(--shadow-text-faint)" }}
            />
          )}

          <span
            className={`flex-1 text-[14px] font-medium leading-snug min-w-0 truncate${isDone ? " line-through decoration-[var(--shadow-text-faint)]" : ""}`}
            style={{ color: isDone ? "var(--shadow-text-muted)" : "var(--shadow-text)" }}
          >
            {habit.name}
          </span>

          {/* Status — minimal right label */}
          <span
            className="text-[10px] font-mono flex-shrink-0"
            style={{ color: statusColor() }}
          >
            {statusLabel()}
          </span>
        </div>

        {/* Sphere dots — colored circles, no text */}
        <div className="flex items-center gap-1.5 ml-6 mb-3">
          {habit.sphere_slugs.slice(0, 5).map((slug) => (
            <span
              key={slug}
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              title={slug}
              style={{ background: `${SPHERE_COLORS[slug] ?? "#6D7BFF"}99` }}
            />
          ))}
        </div>

        {/* Strength thread — 1px, bottom */}
        <div
          className="h-px rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${habit.strength_score}%`, background: barColor }}
          />
        </div>
      </div>

      <HabitDrawer
        habit={habit}
        log={log}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={(savedLog, points, soulsAwarded) => {
          setDrawerOpen(false);
          onLogged(savedLog, points, soulsAwarded);
        }}
      />
    </>
  );
}
