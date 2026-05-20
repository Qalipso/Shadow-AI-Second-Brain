import Link from "next/link";
import type { InterventionRow } from "@/lib/interventions/types";
import { TOOL_LABELS } from "./types";

function rel(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
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
    case "task_shatter":
      return String(i.task ?? "—");
    case "dopamine_menu":
      return String(i.intent ?? row.mood ?? "Menu");
    case "context_switch":
      return `${String(i.finished ?? "?")} → ${String(i.next ?? "?")}`;
    case "interest_filter":
      return `${String(i.task ?? "?")} · ${String(i.interest ?? "?")}`;
  }
}

export function RecentInterventions({ items }: { items: InterventionRow[] }) {
  if (items.length === 0) {
    return (
      <div className="panel-ghost p-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-2">
          Empty chamber
        </p>
        <p className="text-sm text-[var(--shadow-text-muted)] italic">
          No interventions yet. Pick a tool above when something feels stuck.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
        Recent
      </p>
      <ul className="panel-ghost divide-y divide-[rgba(255,255,255,0.05)]">
        {items.map((row) => {
          const meta = TOOL_LABELS[row.type];
          return (
            <li key={row.id}>
              <Link
                href={`/interventions/${meta.slug}?id=${row.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--shadow-gold)] opacity-50" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--shadow-text-faint)]">
                    {meta.name}
                  </p>
                  <p className="text-sm text-[var(--shadow-text)] truncate">
                    {inputSummary(row)}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--shadow-text-faint)]">
                  {rel(row.created_at)}
                </span>
                <span
                  className={`text-[9px] uppercase tracking-[0.22em] px-2 py-0.5 rounded border ${
                    row.status === "active"
                      ? "border-[var(--shadow-border-active)] text-[var(--shadow-gold)]"
                      : row.status === "completed"
                        ? "border-[rgba(113,179,139,0.4)] text-[rgba(143,209,169,0.9)]"
                        : row.status === "archived"
                          ? "border-[rgba(126,87,194,0.4)] text-[rgba(168,140,210,0.9)]"
                          : "border-[var(--shadow-border)] text-[var(--shadow-text-faint)]"
                  }`}
                >
                  {row.status}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
