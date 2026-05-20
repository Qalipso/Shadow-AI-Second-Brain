"use client";

import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";

// Visible payload from POST /api/classify response.
export type RevealPayload = {
  summary: string | null;
  entryType: string | null;
  lifeAreaSlug: string | null;
  emotion: { primary: string; intensity: number } | null;
  extractedTask: { title: string } | null;
};

// Display labels for the 12 life-area slugs. Keeps reveal self-contained
// without a server roundtrip for area names.
const AREA_LABEL: Record<string, string> = {
  work: "Work",
  money: "Money",
  health: "Health",
  energy: "Energy",
  food: "Food",
  mind: "Mind",
  creativity: "Creativity",
  social: "Social",
  emotion: "Emotion",
  discipline: "Discipline",
  environment: "Environment",
  meaning: "Meaning",
};

const TYPE_LABEL: Record<string, string> = {
  thought: "Thought",
  task: "Task",
  feeling: "Feeling",
  question: "Question",
  event: "Event",
  expense: "Expense",
  food: "Food",
};

const AUTO_DISMISS_MS = 12_000;

export function ClassificationReveal({
  payload,
  onDismiss,
}: {
  payload: RevealPayload;
  onDismiss: () => void;
}) {
  // Auto-dismiss after a beat so the inbox doesn't pile up reveal cards.
  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const areaLabel = payload.lifeAreaSlug
    ? AREA_LABEL[payload.lifeAreaSlug] ?? payload.lifeAreaSlug
    : null;
  const typeLabel = payload.entryType
    ? TYPE_LABEL[payload.entryType] ?? payload.entryType
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 rounded-xl border border-[var(--accent-warm)]/25 bg-[var(--bg-elev1)] px-4 py-3.5 anim-fade-up"
      style={{
        boxShadow: "0 0 24px rgba(201,163,106,0.06), 0 4px 16px rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-start gap-3">
        <Sparkles
          size={14}
          className="mt-0.5 flex-shrink-0"
          style={{ color: "var(--accent-warm)" }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.22em] mb-1.5"
            style={{ color: "var(--accent-warm)" }}
          >
            Shadow read
          </p>

          {payload.summary ? (
            <p className="text-sm text-zinc-200 leading-snug mb-2.5">
              {payload.summary}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {typeLabel ? (
              <Pill kind="type">{typeLabel}</Pill>
            ) : null}
            {areaLabel ? (
              <Pill kind="area">{areaLabel}</Pill>
            ) : null}
            {payload.emotion ? (
              <Pill kind="emotion">
                {payload.emotion.primary}
                <span className="opacity-60 ml-1">· {payload.emotion.intensity}/10</span>
              </Pill>
            ) : null}
            {payload.extractedTask ? (
              <Pill kind="task">→ {payload.extractedTask.title}</Pill>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded-md p-1 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

type PillKind = "type" | "area" | "emotion" | "task";

const PILL_STYLES: Record<PillKind, { bg: string; border: string; color: string }> = {
  type:    { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)", color: "rgb(228,228,231)" },
  area:    { bg: "rgba(201,163,106,0.10)", border: "rgba(201,163,106,0.28)", color: "rgb(232,205,159)" },
  emotion: { bg: "rgba(126,87,194,0.12)",  border: "rgba(126,87,194,0.34)",  color: "rgb(199,178,233)" },
  task:    { bg: "rgba(109,123,255,0.10)", border: "rgba(109,123,255,0.28)", color: "rgb(178,189,255)" },
};

function Pill({ kind, children }: { kind: PillKind; children: React.ReactNode }) {
  const s = PILL_STYLES[kind];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {children}
    </span>
  );
}
