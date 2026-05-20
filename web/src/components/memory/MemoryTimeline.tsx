"use client";

import { useMemo, useState } from "react";
import type { Entry } from "@/types/db";
import { localDateKey, dayLabel, relativeTime } from "@/lib/time";
import { signalTypeColor } from "@/lib/life-areas/meta";

type AreaInfo = { name: string; slug: string; color: string };

type Props = {
  entries: Entry[];
  areaMap: Record<number, AreaInfo>;
};

type DayGroup = { key: string; label: string; entries: Entry[] };

export function MemoryTimeline({ entries, areaMap }: Props) {
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!filter) return entries;
    return entries.filter((e) => {
      if (filter === "unprocessed") return e.status === "unprocessed";
      return e.entry_type === filter;
    });
  }, [entries, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
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
  }, [filtered]);

  // Collect unique types for filter pills
  const types = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.entry_type) set.add(e.entry_type);
    }
    return [...set].sort();
  }, [entries]);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill
          label="All"
          active={filter === null}
          onClick={() => setFilter(null)}
        />
        {types.map((t) => (
          <FilterPill
            key={t}
            label={t}
            active={filter === t}
            color={signalTypeColor(t)}
            onClick={() => setFilter(filter === t ? null : t)}
          />
        ))}
      </div>

      <p className="text-[11px] text-zinc-500">
        {filtered.length} of {entries.length} entries
      </p>

      {/* Timeline */}
      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 sticky top-0 bg-[var(--bg-base)] py-1 z-10">
            {g.label}
          </h3>
          <div className="space-y-1.5 anim-stagger">
            {g.entries.map((e) => {
              const area = e.life_area_id != null ? areaMap[e.life_area_id] : null;
              return (
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
                          {e.raw_text.length > 150
                            ? `${e.raw_text.slice(0, 150)}...`
                            : e.raw_text}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {e.entry_type && (
                          <TypePill type={e.entry_type} />
                        )}
                        {area && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{
                              color: area.color,
                              backgroundColor: `${area.color}14`,
                              border: `1px solid ${area.color}33`,
                            }}
                          >
                            {area.name}
                          </span>
                        )}
                        {e.emotion_primary && (
                          <span className="text-[10px] text-zinc-600">
                            {e.emotion_primary}
                            {e.emotion_intensity != null &&
                              ` ${e.emotion_intensity}/10`}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-600 shrink-0">
                      {relativeTime(e.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  const c = color ?? "#C9A36A";
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-md transition-colors"
      style={{
        color: active ? c : "#71717a",
        backgroundColor: active ? `${c}20` : "transparent",
        border: `1px solid ${active ? `${c}40` : "transparent"}`,
      }}
    >
      {label}
    </button>
  );
}

function TypePill({ type }: { type: string }) {
  const color = signalTypeColor(type);
  return (
    <span
      className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        color,
        backgroundColor: `${color}14`,
        border: `1px solid ${color}33`,
      }}
    >
      {type}
    </span>
  );
}
