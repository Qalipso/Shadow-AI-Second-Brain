"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InterventionRow } from "@/lib/interventions/types";
import { type InterventionType, TOOL_LABELS } from "./types";
import { InterventionCard, InterventionCardSkeleton } from "./InterventionCard";
import { InterventionDetailDrawer } from "./InterventionDetailDrawer";

type StatusFilter = "all" | "active" | "completed" | "archived";
const STATUS_FILTERS: StatusFilter[] = ["all", "active", "completed", "archived"];
const TYPE_FILTERS: InterventionType[] = ["task_shatter", "dopamine_menu", "context_switch", "interest_filter"];

export function InterventionGallery({ items: initial }: { items: InterventionRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState<InterventionRow[]>(initial);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilters, setTypeFilters] = useState<Set<InterventionType>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleType = (t: InterventionType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const filtered = items.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (typeFilters.size > 0 && !typeFilters.has(row.type)) return false;
    return true;
  });

  const selectedRow = selectedId ? items.find((r) => r.id === selectedId) ?? null : null;

  const openDrawer = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const handleUpdated = (patch: Partial<InterventionRow>) => {
    setItems((prev) =>
      prev.map((r) => (r.id === selectedId ? { ...r, ...patch } : r)),
    );
    if (patch.status === "completed" || patch.status === "archived" || patch.status === "dismissed") {
      router.refresh();
    }
  };

  return (
    <>
      {/* Filter bar */}
      <div className="space-y-2">
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex flex-wrap gap-1.5"
        >
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              className={`text-[10px] uppercase tracking-[0.24em] px-3 py-1.5 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] ${
                statusFilter === s
                  ? "border-[var(--shadow-border-active)] text-[var(--shadow-gold)] bg-[rgba(214,184,116,0.07)]"
                  : "border-[var(--shadow-border)] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-text-muted)] hover:border-[rgba(180,170,220,0.18)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" aria-label="Filter by type">
          {TYPE_FILTERS.map((t) => {
            const active = typeFilters.has(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(t)}
                className={`text-[10px] uppercase tracking-[0.20em] px-2.5 py-1 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] ${
                  active
                    ? "border-[rgba(126,87,194,0.5)] text-[rgba(168,140,210,0.9)] bg-[rgba(126,87,194,0.08)]"
                    : "border-[var(--shadow-border)] text-[var(--shadow-text-faint)] hover:border-[rgba(126,87,194,0.25)]"
                }`}
              >
                {TOOL_LABELS[t].name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gallery grid */}
      {filtered.length === 0 ? (
        <div className="panel-ghost p-6 text-center">
          <p className="text-sm text-[var(--shadow-text-muted)] italic">
            No interventions match the current filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((row) => (
            <InterventionCard key={row.id} row={row} onClick={() => openDrawer(row.id)} />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <InterventionDetailDrawer
        row={selectedRow}
        open={drawerOpen}
        onClose={closeDrawer}
        onUpdated={handleUpdated}
      />
    </>
  );
}

export function InterventionGallerySkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {[80, 60, 90, 80].map((w, i) => (
          <div key={i} className="h-7 rounded-full bg-[rgba(255,255,255,0.05)] animate-pulse" style={{ width: w }} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <InterventionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
