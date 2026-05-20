"use client";

import { cn } from "@/lib/cn";

export type Initiative = {
  id: string;
  title: string;
  reason: string;
  suggested_action: string | null;
  initiative_type: string;
  priority: number;
  pattern_duration: string | null;
  status: string;
};

type InitiativeCardProps = {
  initiative: Initiative;
  onAction: (id: string, action: "accept" | "dismiss" | "snooze") => void;
};

const TYPE_LABELS: Record<string, string> = {
  observation: "Observation",
  productive_nudge: "Nudge",
  pattern_alert: "Pattern",
  reflection_prompt: "Reflection",
  risk_signal: "Risk Signal",
  momentum_note: "Momentum",
};

const TYPE_BORDER_COLORS: Record<string, string> = {
  observation: "border-l-[var(--accent-warm)]",
  productive_nudge: "border-l-blue-500",
  pattern_alert: "border-l-amber-500",
  reflection_prompt: "border-l-violet-500",
  risk_signal: "border-l-red-500",
  momentum_note: "border-l-emerald-500",
};

const TYPE_TAG_COLORS: Record<string, string> = {
  observation: "bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]",
  productive_nudge: "bg-blue-500/10 text-blue-400",
  pattern_alert: "bg-amber-500/10 text-amber-400",
  reflection_prompt: "bg-violet-500/10 text-violet-400",
  risk_signal: "bg-red-500/10 text-red-400",
  momentum_note: "bg-emerald-500/10 text-emerald-400",
};

function formatType(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function patternLabel(duration: string | null): string | null {
  if (!duration) return null;
  const match = duration.match(/^(\d+)/);
  if (match) return `${match[1]}-day pattern`;
  return duration;
}

export function InitiativeCard({ initiative, onAction }: InitiativeCardProps) {
  const borderColor = TYPE_BORDER_COLORS[initiative.initiative_type] ?? "border-l-zinc-600";
  const tagColor = TYPE_TAG_COLORS[initiative.initiative_type] ?? "bg-zinc-700/30 text-zinc-400";
  const label = patternLabel(initiative.pattern_duration);

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-[rgba(20,20,27,0.9)] border-l-4 px-4 py-3 space-y-2 backdrop-blur-sm",
        borderColor,
      )}
    >
      {/* Header row: type tag + optional pattern badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
            tagColor,
          )}
        >
          {formatType(initiative.initiative_type)}
        </span>
        {label && (
          <span className="inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
            {label}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm text-zinc-100 font-medium leading-snug">{initiative.title}</p>

      {/* Reason */}
      <p className="text-xs text-zinc-400 leading-relaxed">{initiative.reason}</p>

      {/* Suggested action */}
      {initiative.suggested_action && (
        <div className="rounded-lg border border-dashed border-zinc-700 px-3 py-2">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1">Suggested action</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{initiative.suggested_action}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onAction(initiative.id, "dismiss")}
          className="rounded-md border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => onAction(initiative.id, "snooze")}
          className="rounded-md border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
        >
          Snooze
        </button>
        <button
          type="button"
          onClick={() => onAction(initiative.id, "accept")}
          className="ml-auto rounded-md bg-[var(--accent-warm)]/10 border border-[var(--accent-warm)]/30 px-2.5 py-1 text-[11px] text-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/20 transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
