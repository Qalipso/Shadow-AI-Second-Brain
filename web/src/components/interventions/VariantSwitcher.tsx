"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { InterventionType } from "./types";
import { TOOL_LABELS } from "./types";

type Variant = {
  id: string;
  user_input: Record<string, unknown>;
  status: string;
  created_at: string;
  first_action: string | null;
};

function rel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function preview(type: InterventionType, ui: Record<string, unknown>): string {
  switch (type) {
    case "task_shatter":
      return String(ui.task ?? "—");
    case "dopamine_menu":
      return String(ui.intent ?? "menu");
    case "context_switch":
      return `${String(ui.finished ?? "?")} → ${String(ui.next ?? "?")}`;
    case "interest_filter":
      return `${String(ui.task ?? "?")} · ${String(ui.interest ?? "?")}`;
  }
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-[var(--shadow-text-faint)]",
  active: "bg-[var(--shadow-gold)] shadow-[0_0_10px_rgba(214,184,116,0.5)]",
  completed: "bg-[rgba(113,179,139,0.8)]",
  archived: "bg-[rgba(126,87,194,0.8)]",
  dismissed: "bg-[var(--shadow-text-faint)]",
};

export function VariantSwitcher({
  type,
  activeId,
}: {
  type: InterventionType;
  activeId: string | null;
}) {
  const [items, setItems] = useState<Variant[] | null>(null);
  const slug = TOOL_LABELS[type].slug;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/interventions?type=${type}&limit=8`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => {
        if (!cancelled) setItems(j.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
    // Refetch when active changes (a new variant was generated)
  }, [type, activeId]);

  if (!items) {
    return (
      <div className="panel-ambient p-4 h-[120px] animate-pulse" />
    );
  }
  if (items.length === 0) return null;

  return (
    <div className="panel-ghost p-3 space-y-1">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] px-1 pb-1">
        Variants · {items.length}
      </p>
      <ul className="space-y-0.5">
        {items.map((v) => {
          const isActive = v.id === activeId;
          return (
            <li key={v.id}>
              <Link
                href={`/interventions/${slug}?id=${v.id}`}
                scroll={false}
                className={`group flex items-start gap-2 rounded-md px-2 py-2 transition-all ${
                  isActive
                    ? "bg-[rgba(214,184,116,0.08)] border border-[var(--shadow-border-active)]"
                    : "border border-transparent hover:bg-[rgba(255,255,255,0.025)]"
                }`}
              >
                <span
                  className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[v.status] ?? "bg-[var(--shadow-text-faint)]"}`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs truncate ${
                      isActive
                        ? "text-[var(--shadow-gold)]"
                        : "text-[var(--shadow-text-muted)] group-hover:text-[var(--shadow-text)]"
                    }`}
                  >
                    {preview(type, v.user_input)}
                  </p>
                  {v.first_action && (
                    <p className="text-[10px] text-[var(--shadow-text-faint)] truncate italic mt-0.5">
                      {v.first_action}
                    </p>
                  )}
                </div>
                <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--shadow-text-faint)] shrink-0 mt-1">
                  {rel(v.created_at)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
