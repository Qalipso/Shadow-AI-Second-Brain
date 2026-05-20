"use client";

import type { Habit } from "@/types/db";
import { rhythmLabel, rhythmColor, ritualNextMove } from "./lib";

// Replaces "Return Threads". Surfaces rituals that are fading or lost
// and offers a gentle re-entry path.

export function NeedsReturn({
  habits, onReturn, onOpen,
}: {
  habits: Habit[];
  onReturn: (habit: Habit) => void;
  onOpen: (habit: Habit) => void;
}) {
  const fading = habits.filter((h) => {
    if (!h.is_active) return false;
    const l = rhythmLabel(h);
    return l === "fragile" || l === "fading" || l === "lost";
  });

  if (fading.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.28em]"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          Needs Return
        </p>
        <span className="text-[10px] font-mono"
          style={{ color: "var(--shadow-text-faint)" }}>
          {fading.length} thread{fading.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-2">
        {fading.map((habit) => {
          const label = rhythmLabel(habit);
          const color = rhythmColor(label);
          const verb = label === "lost" ? "is lost" : label === "fading" ? "is fading" : "is fragile";
          const areas = habit.sphere_slugs.slice(0, 3).map(cap).join(", ");
          return (
            <div
              key={habit.id}
              className="rounded-xl px-4 py-3.5"
              style={{
                background: "rgba(126,87,194,0.045)",
                border: "1px solid rgba(126,87,194,0.16)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpen(habit)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p
                    className="text-[13.5px] leading-snug font-[family-name:var(--font-fraunces)] font-light"
                    style={{ color: "var(--shadow-text)" }}
                  >
                    {habit.name}
                  </p>
                  <p className="text-[11.5px] mt-1 leading-relaxed"
                    style={{ color: "var(--shadow-text-muted)" }}>
                    This ritual {verb}.
                    {areas && <> It supports {areas}.</>}
                  </p>
                  <p className="text-[11.5px] mt-1.5"
                    style={{ color: "var(--accent-warm)" }}>
                    Suggested return — {ritualNextMove(habit)}
                  </p>
                </button>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider"
                    style={{ color }}
                  >
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onReturn(habit)}
                    className="px-3 py-1.5 rounded-md text-[10.5px] font-mono transition-all"
                    style={{
                      background: "rgba(201,163,106,0.14)",
                      border: "1px solid rgba(201,163,106,0.32)",
                      color: "var(--accent-warm)",
                    }}
                  >
                    Return Today
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function cap(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
