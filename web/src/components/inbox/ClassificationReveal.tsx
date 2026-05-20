"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, BookMarked, Check, Lightbulb } from "lucide-react";

// Visible payload from POST /api/classify response.
export type RevealPayload = {
  entryId: string | null;
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

const AUTO_DISMISS_MS = 16_000;
const FIRST_INSIGHT_KEY = "shadow:insights:first_done";

type MemoryState = "idle" | "saving" | "saved" | "error";

type InstantInsight = {
  text: string;
  follow_up: string;
};

export function ClassificationReveal({
  payload,
  onDismiss,
  onMemorySaved,
}: {
  payload: RevealPayload;
  onDismiss: () => void;
  onMemorySaved?: () => void;
}) {
  const [memoryState, setMemoryState] = useState<MemoryState>("idle");
  const [insight, setInsight] = useState<InstantInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Auto-dismiss after a beat. Pause while saving or after insight shown.
  useEffect(() => {
    if (memoryState === "saving" || insight) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss, memoryState, insight]);

  async function saveToMemory() {
    if (!payload.summary || memoryState !== "idle") return;
    setMemoryState("saving");

    try {
      const res = await fetch("/api/memory/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: payload.summary.slice(0, 120),
          content: payload.summary,
          source_type: "inbox",
          source_id: payload.entryId ?? undefined,
          tags: payload.lifeAreaSlug ? [payload.lifeAreaSlug] : [],
        }),
      });

      if (!res.ok) {
        setMemoryState("error");
        return;
      }

      setMemoryState("saved");
      onMemorySaved?.();

      // Generate instant insight for first-time saves only.
      let isFirst = false;
      try {
        isFirst = !localStorage.getItem(FIRST_INSIGHT_KEY);
      } catch {
        // localStorage unavailable — skip
      }

      if (isFirst && payload.entryId && payload.summary) {
        setInsightLoading(true);
        try {
          const ir = await fetch("/api/insights/instant", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              entry_id: payload.entryId,
              summary: payload.summary,
              life_area_slug: payload.lifeAreaSlug,
              emotion: payload.emotion,
            }),
          });
          if (ir.ok) {
            const data = (await ir.json()) as {
              insight?: { text: string; follow_up: string };
            };
            if (data.insight) {
              setInsight(data.insight);
              try {
                localStorage.setItem(FIRST_INSIGHT_KEY, "1");
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // Insight failure is non-critical — don't show error
        } finally {
          setInsightLoading(false);
        }
      }
    } catch {
      setMemoryState("error");
    }
  }

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

          <div className="flex flex-wrap gap-1.5 mb-3">
            {typeLabel ? <Pill kind="type">{typeLabel}</Pill> : null}
            {areaLabel ? <Pill kind="area">{areaLabel}</Pill> : null}
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

          {/* Memory action */}
          {payload.summary ? (
            <div className="flex items-center gap-2 mb-2">
              {memoryState === "saved" ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px]"
                  style={{ color: "var(--accent-warm)" }}
                >
                  <Check size={11} />
                  Saved to memory
                </span>
              ) : (
                <button
                  type="button"
                  onClick={saveToMemory}
                  disabled={memoryState === "saving"}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-opacity disabled:opacity-50"
                  style={{
                    background: "rgba(201,163,106,0.10)",
                    border: "1px solid rgba(201,163,106,0.25)",
                    color: "var(--accent-warm)",
                  }}
                >
                  <BookMarked size={11} />
                  {memoryState === "saving" ? "Saving…" : "Save to memory"}
                </button>
              )}
              {memoryState === "error" ? (
                <span className="text-[11px] text-red-400">Save failed — try again</span>
              ) : null}
            </div>
          ) : null}

          {/* Instant insight — shown after first memory save */}
          {insightLoading ? (
            <p
              className="text-[11px] font-mono animate-pulse"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Shadow is reflecting…
            </p>
          ) : null}

          {insight ? (
            <div
              className="mt-3 rounded-lg px-3 py-2.5 anim-fade-up"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-start gap-2">
                <Lightbulb
                  size={12}
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: "var(--accent-warm)" }}
                  aria-hidden
                />
                <div>
                  <p
                    className="text-[10px] font-mono uppercase tracking-[0.18em] mb-1"
                    style={{ color: "var(--accent-warm)" }}
                  >
                    First mirror
                  </p>
                  <p className="text-[12px] text-zinc-300 leading-relaxed mb-1.5">
                    {insight.text}
                  </p>
                  {insight.follow_up ? (
                    <p className="text-[11px] text-zinc-500 italic">
                      {insight.follow_up}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
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
