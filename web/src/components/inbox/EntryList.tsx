"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { InboxEntry } from "@/lib/entries/types";
import { useEntries } from "@/lib/entries/useEntries";
import { useToast } from "@/components/Toast";
import { dayLabel, localDateKey, relativeTime } from "@/lib/time";

const PREVIEW_CHARS = 200;

export type EntryFilter = "all" | "unprocessed" | "processed";
export type EntryPeriod = "today" | "week" | "month" | "all";

function periodCutoff(period: EntryPeriod): Date | null {
  const now = new Date();
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

function groupByDay(list: InboxEntry[]): Array<{ key: string; items: InboxEntry[] }> {
  const map = new Map<string, InboxEntry[]>();
  for (const e of list) {
    const k = localDateKey(e.createdAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)?.push(e);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, items]) => ({ key, items }));
}

export function EntryList({ filter = "all", period = "week" }: { filter?: EntryFilter; period?: EntryPeriod }) {
  const { entries, mode } = useEntries(200);

  const filtered = useMemo(() => {
    let result = entries;
    const cutoff = periodCutoff(period);
    if (cutoff) {
      result = result.filter((e) => new Date(e.createdAt) >= cutoff);
    }
    if (filter !== "all") {
      result = result.filter((e) => e.status === filter);
    }
    return result;
  }, [entries, filter, period]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  if (mode === "loading") {
    return (
      <ul className="space-y-2" aria-hidden>
        <li className="h-16 rounded-md skeleton" />
        <li className="h-16 rounded-md skeleton" />
      </ul>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] py-10 text-center">
        <p className="text-zinc-500 text-sm">
          {filter === "all" ? "No captures yet." : `No ${filter} entries.`}
        </p>
        <p className="text-[11px] text-zinc-600 mt-1">
          Write to the composer above. ⌘+Enter sends.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <header className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
              {dayLabel(g.key)}
            </p>
            <span className="text-[11px] text-zinc-600">{g.items.length}</span>
          </header>
          <ul className="space-y-2 anim-stagger">
            {g.items.map((e) => (
              <EntryItem key={e.id} entry={e} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryItem({ entry }: { entry: InboxEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const text = entry.summary ?? entry.text;
  const overflow = text.length > PREVIEW_CHARS;
  const body = !expanded && overflow ? `${text.slice(0, PREVIEW_CHARS)}…` : text;

  function handleDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          toast(data.error ?? "Delete failed.", "error");
          return;
        }
        setDeleted(true);
        window.dispatchEvent(new CustomEvent("shadow:entries:changed"));
        toast("Entry deleted.", "success");
      } catch (e) {
        toast((e as Error).message, "error");
      }
    });
  }

  if (deleted) return null;

  return (
    <li className="card-hover rounded-md border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words flex-1 min-w-0">
          {body}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={entry.status} />
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            aria-label="Delete entry"
            className="text-zinc-700 hover:text-[var(--state-danger)] disabled:opacity-40 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {entry.entryType ? <Pill tone="accent">{entry.entryType}</Pill> : null}
        {entry.lifeAreaSlug ? <Pill>{entry.lifeAreaSlug}</Pill> : null}
        {entry.emotionPrimary ? <Pill>{entry.emotionPrimary}</Pill> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-zinc-600">
        <span>{relativeTime(entry.createdAt)}</span>
        {overflow ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="hover:text-zinc-300"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </div>
      {entry.summary && entry.summary !== entry.text && expanded ? (
        <details className="mt-2">
          <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300">
            Show raw
          </summary>
          <p className="mt-1.5 text-[11px] text-zinc-500 whitespace-pre-wrap">
            {entry.text}
          </p>
        </details>
      ) : null}
    </li>
  );
}

function StatusBadge({ status }: { status: InboxEntry["status"] }) {
  const klass =
    status === "unprocessed"
      ? "border-[var(--accent-warm)]/30 text-[var(--accent-warm)]"
      : status === "processed"
        ? "border-[var(--state-success)]/30 text-[var(--state-success)]"
        : "border-[var(--state-danger)]/30 text-[var(--state-danger)]";
  return (
    <span
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ${klass}`}
    >
      {status === "unprocessed" ? "raw" : status}
    </span>
  );
}

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent";
}) {
  const klass =
    tone === "accent"
      ? "border-[var(--accent-warm)]/30 text-[var(--accent-warm)]"
      : "border-[var(--border)] text-zinc-400";
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] ${klass}`}>
      {children}
    </span>
  );
}
