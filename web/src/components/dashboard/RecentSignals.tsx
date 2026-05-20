"use client";

import { useMemo, useState } from "react";
import { useEntries } from "@/lib/entries/useEntries";
import { relativeTime } from "@/lib/time";
import {
  lifeAreaColor,
  lifeAreaName,
  signalTypeColor,
} from "@/lib/life-areas/meta";
import { MoreHorizontal, Plus, MessageCircle, Route, CheckCircle, FileText } from "lucide-react";

const PREVIEW = 110;
const LIMIT = 6;

function derivePattern(
  entries: ReturnType<typeof useEntries>["entries"],
): string | null {
  if (entries.length < 3) return null;

  const areaCounts = new Map<string, number>();
  for (const e of entries) {
    if (!e.lifeAreaSlug) continue;
    areaCounts.set(e.lifeAreaSlug, (areaCounts.get(e.lifeAreaSlug) ?? 0) + 1);
  }

  if (areaCounts.size === 0) return null;

  const sorted = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topSlug = sorted[0][0];
  const topCount = sorted[0][1];
  const topName = lifeAreaName(topSlug) ?? topSlug;

  if (sorted.length === 1 || topCount >= entries.length * 0.6) {
    return `Most of today's signals connect to ${topName}.`;
  }

  if (sorted.length >= 2 && sorted[1][1] >= entries.length * 0.25) {
    const secondName = lifeAreaName(sorted[1][0]) ?? sorted[1][0];
    return `Today's signals flow between ${topName} and ${secondName}.`;
  }

  if (areaCounts.size >= 3) {
    return `Balanced day \u2014 signals spread across ${areaCounts.size} areas.`;
  }

  return null;
}

// Derive a short "Shadow read" micro-insight from signal metadata
function deriveShadowRead(e: SignalEntry): string | null {
  const parts: string[] = [];

  // Emotion as primary signal
  if (e.emotionPrimary) {
    const emo = e.emotionPrimary.toLowerCase();
    const NEGATIVE = ["sad", "angry", "anxious", "frustrated", "stressed", "overwhelmed", "tired", "resistance", "avoidance", "fear", "guilt"];
    const POSITIVE = ["joy", "happy", "excited", "grateful", "proud", "calm", "hopeful", "motivated", "motivation", "content", "love"];

    if (NEGATIVE.includes(emo)) {
      parts.push(emo);
    } else if (POSITIVE.includes(emo)) {
      parts.push(emo);
    }
  }

  // Area context
  if (e.lifeAreaSlug) {
    const area = lifeAreaName(e.lifeAreaSlug);
    if (area) {
      // Combine emotion + area for insight
      if (parts.length > 0) {
        return `${parts[0]} in ${area.toLowerCase()}`;
      }
      return `${area.toLowerCase()} signal`;
    }
  }

  // Type-based fallback
  if (e.entryType) {
    const type = e.entryType.toLowerCase();
    if (type === "feeling" && parts.length > 0) {
      return parts[0];
    }
    if (type === "task") return "task captured";
    if (type === "event") return "event logged";
    if (type === "goal") return "goal signal";
    if (type === "memory") return "memory stored";
    if (type === "idea") return "idea captured";
  }

  if (parts.length > 0) return parts[0];

  return null;
}

export function RecentSignals() {
  const { entries, mode } = useEntries(LIMIT);

  const pattern = useMemo(() => derivePattern(entries), [entries]);

  if (mode === "loading") {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-16 rounded-md skeleton" />
        <div className="h-16 rounded-md skeleton" />
        <div className="h-16 rounded-md skeleton" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] py-8 px-4 text-center">
        <p className="text-zinc-400 text-sm">No signals yet today.</p>
        <p className="text-[11px] text-zinc-600 mt-1">
          Drop a fragment in Inbox — Shadow will extract a signal from it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pattern && (
        <p className="text-[11px] text-zinc-400 italic px-1">
          {pattern}
        </p>
      )}
      <ul className="space-y-2 anim-stagger">
        {entries.slice(0, LIMIT).map((e) => (
          <SignalCard key={e.id} entry={e} />
        ))}
      </ul>
    </div>
  );
}

type SignalEntry = ReturnType<typeof useEntries>["entries"][number];

function SignalCard({ entry: e }: { entry: SignalEntry }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const source = e.summary ?? e.text;
  const text =
    source.length > PREVIEW ? `${source.slice(0, PREVIEW)}…` : source;

  const accent = e.lifeAreaSlug
    ? lifeAreaColor(e.lifeAreaSlug)
    : signalTypeColor(e.entryType);

  const areaLabel = lifeAreaName(e.lifeAreaSlug);
  const shadowRead = deriveShadowRead(e);

  return (
    <li
      className="card-hover relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elev2)] px-3 py-2.5"
      style={{ borderLeftColor: accent, borderLeftWidth: 2 }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-zinc-200 break-words flex-1 min-w-0 leading-snug">
          {text}
        </p>
        <span className="shrink-0 text-[10px] text-zinc-600 whitespace-nowrap">
          {relativeTime(e.createdAt)}
        </span>
      </div>

      {/* Shadow read micro-insight */}
      {shadowRead && e.status !== "unprocessed" && (
        <p className="mt-1.5 text-[11px] text-zinc-500 italic">
          Shadow read: {shadowRead}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <TypePill type={e.entryType ?? "raw"} />
        {areaLabel ? <AreaPill slug={e.lifeAreaSlug!} label={areaLabel} /> : null}
        {e.emotionPrimary ? <EmotionPill emotion={e.emotionPrimary} /> : null}
        {e.status === "unprocessed" ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-warm)] orb-pulse" />
            extracting…
          </span>
        ) : (
          <div className="ml-auto relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded hover:bg-[var(--bg-elev1)] text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="Signal actions"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-elev1)] shadow-lg py-1">
                  <ActionItem icon={Plus} label="Create task" onClick={() => setMenuOpen(false)} />
                  <ActionItem icon={MessageCircle} label="Ask follow-up" onClick={() => setMenuOpen(false)} />
                  <ActionItem icon={Route} label="Route" onClick={() => setMenuOpen(false)} />
                  <ActionItem icon={CheckCircle} label="Mark resolved" onClick={() => setMenuOpen(false)} />
                  <ActionItem icon={FileText} label="Add context" onClick={() => setMenuOpen(false)} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function ActionItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-[var(--bg-elev2)] transition-colors"
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function TypePill({ type }: { type: string }) {
  const color = signalTypeColor(type);
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
      style={{
        backgroundColor: `${color}1A`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {type}
    </span>
  );
}

function AreaPill({ slug, label }: { slug: string; label: string }) {
  const color = lifeAreaColor(slug);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]"
      style={{
        backgroundColor: `${color}14`,
        color: "#D4D4D8",
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function EmotionPill({ emotion }: { emotion: string }) {
  return (
    <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-zinc-400">
      {emotion}
    </span>
  );
}
