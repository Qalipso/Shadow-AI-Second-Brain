import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import type { Habit, HabitLog } from "@/types/db";
import { isScheduledToday } from "@/lib/protocols/schedule";

interface Props {
  habits: Habit[];
  todayLogs: HabitLog[];
}

export function ProtocolsStatusCard({ habits, todayLogs }: Props) {
  if (habits.length === 0) {
    return (
      <Link
        href="/protocols"
        className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all hover:border-opacity-80 group"
        style={{ borderColor: "var(--shadow-border)", background: "var(--shadow-panel-soft)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "var(--shadow-text-faint)" }} />
          <span className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
            No rituals yet
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--shadow-text-faint)" }}>
          Create first →
        </span>
      </Link>
    );
  }

  const scheduled = habits.filter((h) => h.is_active && isScheduledToday(h.schedule));
  const logMap = new Map(todayLogs.map((l) => [l.habit_id, l]));
  const confirmed = scheduled.filter((h) => {
    const log = logMap.get(h.id);
    return log?.status === "done" || log?.status === "partial" || log?.status === "recovered";
  });
  const pending = scheduled.filter((h) => !logMap.has(h.id));
  const atRisk = habits.filter(
    (h) => h.is_active && h.strength_score < 30,
  );

  const allDone = confirmed.length === scheduled.length && scheduled.length > 0;

  return (
    <Link
      href="/protocols"
      className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all group"
      style={{
        borderColor: allDone ? "var(--shadow-border-active)" : "var(--shadow-border)",
        background: allDone ? "rgba(214, 184, 116, 0.04)" : "var(--shadow-panel-soft)",
      }}
    >
      <div className="flex items-center gap-3">
        <Sparkles
          size={14}
          style={{ color: allDone ? "var(--shadow-gold)" : "var(--shadow-text-muted)" }}
        />
        <div>
          <span
            className="text-[12px] font-medium"
            style={{ color: allDone ? "var(--shadow-gold)" : "var(--shadow-text)" }}
          >
            {confirmed.length}/{scheduled.length} traces today
          </span>
          <div className="flex items-center gap-3 mt-0.5">
            {pending.length > 0 && (
              <span className="text-[11px]" style={{ color: "var(--shadow-text-faint)" }}>
                {pending.length} pending
              </span>
            )}
            {atRisk.length > 0 && (
              <span className="text-[11px]" style={{ color: "var(--shadow-red)" }}>
                {atRisk.length} fading
              </span>
            )}
          </div>
        </div>
      </div>

      <ArrowRight
        size={13}
        className="transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--shadow-text-faint)" }}
      />
    </Link>
  );
}
