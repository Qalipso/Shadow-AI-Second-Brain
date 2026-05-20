"use client";

import type { Habit, HabitLog } from "@/types/db";
import {
  rhythmLabel, rhythmColor, ritualTypeLabel,
  ritualTraceText, ritualPurpose, ritualNextMove, ritualStatusLabel,
} from "./lib";

// One ritual card. Quiet, not gamified. Action buttons hidden on completed.

export function RitualCard({
  habit, todayLog, onOpen, onStart, onSkip,
}: {
  habit: Habit;
  todayLog: HabitLog | null;
  onOpen: () => void;
  onStart?: () => void;
  onSkip?: () => void;
}) {
  const status = ritualStatusLabel(habit, todayLog);
  const label = rhythmLabel(habit);
  const color = rhythmColor(label);
  const isDone = todayLog?.status === "done"
    || todayLog?.status === "partial"
    || todayLog?.status === "recovered";

  return (
    <div
      className="rounded-2xl p-5 transition-all"
      style={{
        background: isDone
          ? "rgba(113,179,139,0.035)"
          : "rgba(255,255,255,0.022)",
        border: `1px solid ${isDone ? "rgba(113,179,139,0.22)" : "var(--shadow-border)"}`,
        boxShadow: isDone ? "0 0 24px rgba(111,191,138,0.10)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-0 text-left"
        >
          <p
            className="text-[14.5px] leading-snug font-[family-name:var(--font-fraunces)] font-light"
            style={{
              color: isDone ? "var(--shadow-text-muted)" : "var(--shadow-text)",
              textDecoration: isDone ? "line-through" : "none",
              textDecorationColor: "var(--shadow-text-faint)",
            }}
          >
            {habit.name}
          </p>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "var(--shadow-text-faint)" }}
          >
            {ritualPurpose(habit)}
          </p>
        </button>
        <span
          className="text-[10px] font-mono uppercase tracking-wider shrink-0"
          style={{ color: status.color }}
        >
          {status.label}
        </span>
      </div>

      {/* Areas + type */}
      <div className="flex flex-wrap items-center gap-1 mt-3">
        <span
          className="text-[9.5px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider"
          style={{
            background: "rgba(126,87,194,0.08)",
            color: "rgba(180,155,230,0.85)",
          }}
        >
          {ritualTypeLabel(habit)}
        </span>
        {habit.sphere_slugs.slice(0, 4).map((s) => (
          <span
            key={s}
            className="text-[9.5px] font-mono px-1.5 py-0.5 rounded capitalize"
            style={{
              background: "rgba(201,163,106,0.08)",
              color: "rgba(201,163,106,0.78)",
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Trace + meta */}
      <div className="mt-3 space-y-1.5">
        <Meta label="Trace" value={ritualTraceText(habit)} />
        {!isDone && <Meta label="Next move" value={ritualNextMove(habit)} />}
        {isDone && habit.streak_current > 0 && (
          <Meta label="Streak" value={`${habit.streak_current} in a row`} />
        )}
      </div>

      {/* Pulse thread */}
      <div
        className="mt-4 h-px rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(habit.strength_score ?? 0, 4)}%`,
            background: color,
            opacity: isDone ? 1 : 0.7,
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        {!isDone && onStart && (
          <button
            type="button"
            onClick={onStart}
            className="px-3 py-1.5 rounded-md text-[11px] font-mono transition-all"
            style={{
              background: "rgba(201,163,106,0.14)",
              border: "1px solid rgba(201,163,106,0.32)",
              color: "var(--accent-warm)",
            }}
          >
            Start Ritual
          </button>
        )}
        {!isDone && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-3 py-1.5 rounded-md text-[11px] font-mono transition-all"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid var(--shadow-border)",
              color: "var(--shadow-text-faint)",
            }}
          >
            Skip Today
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="ml-auto px-3 py-1.5 rounded-md text-[11px] font-mono transition-all"
          style={{
            background: "transparent",
            color: "var(--shadow-text-faint)",
          }}
        >
          Open →
        </button>
      </div>
    </div>
  );
}

function Meta({
  label, value, valueColor,
}: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p
        className="text-[9px] font-mono uppercase tracking-[0.22em] mb-0.5"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {label}
      </p>
      <p
        className="text-[11.5px] leading-snug line-clamp-2"
        style={{ color: valueColor ?? "var(--shadow-text-muted)" }}
      >
        {value}
      </p>
    </div>
  );
}
