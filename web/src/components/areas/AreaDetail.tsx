"use client";

import { useMemo } from "react";
import type { Entry } from "@/types/db";
import { localDateKey, dayLabel, relativeTime } from "@/lib/time";
import { signalTypeColor } from "@/lib/life-areas/meta";

type Props = {
  entries: Entry[];
  color: string;
  areaName: string;
};

type DayGroup = { key: string; label: string; entries: Entry[] };

export function AreaDetail({ entries, color, areaName }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const key = localDateKey(e.created_at);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.map(
      ([key, items]): DayGroup => ({
        key,
        label: dayLabel(key),
        entries: items,
      }),
    );
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev2)] p-8 text-center">
        <p className="text-zinc-500 text-sm">
          No entries linked to {areaName} yet.
        </p>
        <p className="text-zinc-600 text-[11px] mt-1">
          New captures classified into this area will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-zinc-500">
        {entries.length} entry{entries.length === 1 ? "" : " entries"} linked to{" "}
        {areaName}
      </p>

      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            {g.label}
          </h3>
          <div className="space-y-1.5 anim-stagger">
            {g.entries.map((e) => (
              <div
                key={e.id}
                className="card-hover rounded-lg border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {e.summary ? (
                      <p className="text-sm text-zinc-200">{e.summary}</p>
                    ) : (
                      <p className="text-sm text-zinc-400 italic">
                        {e.raw_text.length > 120
                          ? `${e.raw_text.slice(0, 120)}...`
                          : e.raw_text}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {e.entry_type && (
                        <span
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            color: signalTypeColor(e.entry_type),
                            backgroundColor: `${signalTypeColor(e.entry_type)}14`,
                            border: `1px solid ${signalTypeColor(e.entry_type)}33`,
                          }}
                        >
                          {e.entry_type}
                        </span>
                      )}
                      {e.emotion_primary && (
                        <span className="text-[10px] text-zinc-600">
                          {e.emotion_primary}
                          {e.emotion_intensity != null &&
                            ` · ${e.emotion_intensity}/10`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0">
                    {relativeTime(e.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
