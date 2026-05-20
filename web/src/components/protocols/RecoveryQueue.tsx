import type { Habit } from "@/types/db";
import { strengthState } from "@/lib/protocols/strength";

interface Props {
  habits: Habit[];
}

export function RecoveryQueue({ habits }: Props) {
  const struggling = habits.filter(
    (h) => h.is_active && (strengthState(h.strength_score) === "unstable" || strengthState(h.strength_score) === "forming"),
  );

  if (struggling.length === 0) return null;

  return (
    <div>
      <p
        className="text-[10px] font-mono uppercase tracking-widest mb-3"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        Return Threads
      </p>

      <div className="space-y-1">
        {struggling.map((habit) => {
          const state = strengthState(habit.strength_score);
          return (
            <div
              key={habit.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: "rgba(126, 87, 194, 0.04)",
                border: "1px solid rgba(126,87,194,0.1)",
              }}
            >
              <span
                className="flex-1 text-[13px] truncate"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                {habit.name}
              </span>
              <span
                className="text-[10px] font-mono tabular-nums flex-shrink-0"
                style={{ color: state === "unstable" ? "var(--shadow-red)" : "var(--shadow-text-faint)" }}
              >
                {Math.round(habit.strength_score)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
