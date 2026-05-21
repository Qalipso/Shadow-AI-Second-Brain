"use client";
import type { InterventionRow } from "@/lib/interventions/types";
import { TOOL_LABELS } from "./types";

const TYPE_COLOR: Record<string, string> = {
  task_shatter:   "rgba(126,87,194,0.85)",
  dopamine_menu:  "var(--shadow-gold)",
  context_switch: "rgba(100,120,180,0.85)",
  interest_filter:"rgba(113,179,139,0.85)",
};

const STATUS_STYLE: Record<string, string> = {
  draft:     "border-[var(--shadow-border)] text-[var(--shadow-text-faint)]",
  active:    "border-[var(--shadow-border-active)] text-[var(--shadow-gold)] shadow-[0_0_10px_rgba(214,184,116,0.18)]",
  completed: "border-[rgba(113,179,139,0.45)] text-[rgba(143,209,169,0.95)]",
  archived:  "border-[rgba(126,87,194,0.40)] text-[rgba(168,140,210,0.90)]",
  dismissed: "border-[var(--shadow-border)] text-[var(--shadow-text-faint)]",
};

function rel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function inputSummary(row: InterventionRow): string {
  const i = row.user_input;
  switch (row.type) {
    case "task_shatter":   return String(i.task ?? "—");
    case "dopamine_menu":  return String(i.intent || row.mood || "Menu");
    case "context_switch": return `${String(i.finished ?? "?")} → ${String(i.next ?? "?")}`;
    case "interest_filter":return `${String(i.task ?? "?")} · ${String(i.interest ?? "?")}`;
  }
}

export function InterventionCard({
  row,
  onClick,
}: {
  row: InterventionRow;
  onClick: () => void;
}) {
  const meta = TOOL_LABELS[row.type];
  const color = TYPE_COLOR[row.type] ?? "var(--shadow-text-faint)";
  const summary = inputSummary(row);

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      aria-label={`Open intervention: ${meta.name} — ${summary}`}
      className="group w-full text-left rounded-xl panel-ambient relative overflow-hidden p-4 space-y-3 transition-all duration-200 hover:border-[rgba(214,184,116,0.22)] hover:shadow-[0_0_24px_rgba(214,184,116,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)]"
      style={{ border: "1px solid var(--shadow-border)" }}
    >
      {/* Ambient bloom on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "radial-gradient(60% 60% at 0% 0%, rgba(214,184,116,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <span
          className="text-[9px] uppercase tracking-[0.24em] px-2 py-0.5 rounded-full"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}40`,
            color,
          }}
        >
          {meta.name}
        </span>
        <span
          className={`text-[9px] uppercase tracking-[0.22em] px-2 py-0.5 rounded border shrink-0 ${STATUS_STYLE[row.status] ?? STATUS_STYLE.draft}`}
        >
          {row.status}
        </span>
      </div>

      <div className="relative space-y-1">
        <p className="text-sm text-[var(--shadow-text)] leading-snug font-medium truncate">
          {summary}
        </p>
        {row.first_action && (
          <p className="text-xs text-[var(--shadow-text-faint)] italic truncate leading-relaxed">
            {row.first_action}
          </p>
        )}
      </div>

      <div className="relative flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--shadow-text-faint)]">
          {rel(row.created_at)}
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-gold)] opacity-0 group-hover:opacity-80 transition-opacity">
          Open →
        </span>
      </div>
    </button>
  );
}

export function InterventionCardSkeleton() {
  return (
    <div className="rounded-xl panel-ambient p-4 space-y-3 animate-pulse" style={{ border: "1px solid var(--shadow-border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 w-28 rounded-full bg-[rgba(255,255,255,0.06)]" />
        <div className="h-4 w-16 rounded bg-[rgba(255,255,255,0.04)]" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 w-full rounded bg-[rgba(255,255,255,0.05)]" />
        <div className="h-3 w-3/4 rounded bg-[rgba(255,255,255,0.03)]" />
      </div>
      <div className="h-3 w-16 rounded bg-[rgba(255,255,255,0.04)]" />
    </div>
  );
}
