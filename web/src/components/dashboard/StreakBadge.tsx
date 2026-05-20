interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak < 2) return null;

  const label =
    streak >= 30
      ? "month streak"
      : streak >= 7
        ? "week streak"
        : "day streak";

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{
        background: "rgba(124,92,255,0.12)",
        border: "1px solid rgba(124,92,255,0.25)",
        color: "rgb(167,139,250)",
      }}
      title={`${streak}-day check-in streak`}
    >
      <span aria-hidden>◆</span>
      <span>
        {streak} {label}
      </span>
    </div>
  );
}
