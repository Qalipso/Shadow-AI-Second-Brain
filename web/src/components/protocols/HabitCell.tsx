"use client";

import type { HabitLogStatus } from "@/types/db";

const STATUS_CONFIG: Record<
  HabitLogStatus | "empty",
  { bg: string; border: string; animClass?: string; label: string }
> = {
  empty: {
    bg: "var(--cell-empty)",
    border: "rgba(180, 170, 220, 0.08)",
    label: "–",
  },
  done: {
    bg: "rgba(113, 179, 139, 0.18)",
    border: "rgba(113, 179, 139, 0.40)",
    animClass: "cell-done-anim",
    label: "✓",
  },
  partial: {
    bg: "rgba(126, 87, 194, 0.16)",
    border: "rgba(126, 87, 194, 0.35)",
    label: "◐",
  },
  skipped: {
    bg: "rgba(100, 116, 139, 0.10)",
    border: "rgba(100, 116, 139, 0.20)",
    label: "–",
  },
  missed: {
    bg: "rgba(172, 82, 101, 0.10)",
    border: "rgba(172, 82, 101, 0.22)",
    label: "✕",
  },
  failed: {
    bg: "rgba(172, 82, 101, 0.18)",
    border: "rgba(172, 82, 101, 0.38)",
    animClass: "cell-failed-anim",
    label: "✕",
  },
  recovered: {
    bg: "rgba(214, 184, 116, 0.14)",
    border: "rgba(214, 184, 116, 0.38)",
    animClass: "cell-recovered-anim",
    label: "↑",
  },
};

interface Props {
  status: HabitLogStatus | "empty";
  isToday?: boolean;
  hasNote?: boolean;
  onClick?: () => void;
}

export function HabitCell({ status, isToday, hasNote, onClick }: Props) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      onClick={onClick}
      title={status}
      className={`relative flex items-center justify-center rounded cursor-pointer transition-all duration-150 hover:scale-110 hover:z-10 ${cfg.animClass ?? ""}`}
      style={{
        width: 32,
        height: 32,
        background: isToday && status === "empty"
          ? "rgba(214, 184, 116, 0.05)"
          : cfg.bg,
        border: `1px solid ${isToday && status === "empty" ? "rgba(214, 184, 116, 0.22)" : cfg.border}`,
        boxShadow: isToday && status === "empty"
          ? "0 0 6px rgba(214,184,116,0.08)"
          : "none",
      }}
    >
      <span
        className="text-[10px] select-none"
        style={{
          color: status === "empty"
            ? isToday ? "rgba(214,184,116,0.4)" : "var(--shadow-text-faint)"
            : "var(--shadow-text-muted)",
          fontFamily: "monospace",
        }}
      >
        {cfg.label}
      </span>

      {/* Evidence dot */}
      {hasNote && (
        <div
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--shadow-gold)" }}
        />
      )}
    </div>
  );
}
