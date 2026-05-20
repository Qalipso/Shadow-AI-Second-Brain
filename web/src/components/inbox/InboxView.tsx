"use client";

import { useState } from "react";
import { Composer } from "./Composer";
import { EntryList, type EntryFilter, type EntryPeriod } from "./EntryList";
import { InboxPrompts } from "./InboxPrompts";
import { AiConversationCard } from "./AiConversationCard";

const FILTERS: { id: EntryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unprocessed", label: "Raw" },
  { id: "processed", label: "Processed" },
];

const PERIODS: { id: EntryPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All time" },
];

export function InboxView() {
  const [filter, setFilter] = useState<EntryFilter>("all");
  const [period, setPeriod] = useState<EntryPeriod>("week");

  return (
    <div className="space-y-6">
      <AiConversationCard />
      <InboxPrompts />
      <Composer />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={
                filter === f.id
                  ? "rounded-md bg-[var(--bg-elev2)] border border-[var(--accent-warm)]/40 px-3 py-1 text-xs text-[var(--accent-warm)]"
                  : "rounded-md border border-[var(--border)] px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-[var(--bg-elev2)]"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              aria-pressed={period === p.id}
              className={
                period === p.id
                  ? "rounded-md bg-[var(--bg-elev2)] border border-zinc-600 px-2.5 py-1 text-[11px] text-zinc-200"
                  : "rounded-md border border-transparent px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300"
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <EntryList filter={filter} period={period} />
    </div>
  );
}
