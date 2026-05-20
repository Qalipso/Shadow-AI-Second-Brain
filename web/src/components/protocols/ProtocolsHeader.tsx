import type { Habit, HabitLog } from "@/types/db";
import { strengthState } from "@/lib/protocols/strength";
import { isScheduledToday } from "@/lib/protocols/schedule";

interface Props {
  habits: Habit[];
  todayLogs: HabitLog[];
}

export function ProtocolsHeader({ habits, todayLogs }: Props) {
  const active = habits.filter((h) => h.is_active);
  const scheduledToday = active.filter((h) => isScheduledToday(h.schedule));

  const logMap = new Map(todayLogs.map((l) => [l.habit_id, l]));
  const confirmedToday = scheduledToday.filter((h) => {
    const log = logMap.get(h.id);
    return log?.status === "done" || log?.status === "partial" || log?.status === "recovered";
  });

  const avgStrength = active.length > 0
    ? Math.round(active.reduce((s, h) => s + h.strength_score, 0) / active.length)
    : 0;

  const unstable = active.filter((h) => strengthState(h.strength_score) === "unstable");
  const rising = active
    .filter((h) => h.streak_current > 2)
    .sort((a, b) => b.streak_current - a.streak_current)[0];

  const riskHabit = unstable[0];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
      {/* System label */}
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full dot-breathe flex-shrink-0"
          style={{ background: avgStrength >= 60 ? "var(--shadow-gold)" : "var(--shadow-red)" }}
        />
        <span
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          Shadow Protocols
        </span>
      </div>

      <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
        {confirmedToday.length}<span style={{ color: "var(--shadow-border)" }}>/</span>{scheduledToday.length}
      </span>

      <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
        {avgStrength}%
      </span>

      {riskHabit && (
        <span className="text-[11px] font-mono truncate max-w-[120px]" style={{ color: "var(--shadow-red)" }}>
          {riskHabit.name}
        </span>
      )}
    </div>
  );
}
