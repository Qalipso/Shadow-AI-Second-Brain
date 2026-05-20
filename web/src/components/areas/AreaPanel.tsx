"use client";

import Link from "next/link";
import type { LifeArea, LifeAreaScore } from "@/types/db";
import { relativeTime } from "@/lib/time";
import type { Stat } from "./ShadowCore";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function confidenceLabel(c: number | null | undefined): string {
  const v = c ?? 0;
  if (v > 0.65) return "high";
  if (v > 0.35) return "medium";
  return "low";
}

function scoreStatus(score: number): { label: string; color: string } {
  if (score >= 8.5) return { label: "Thriving", color: "#6FBF8A" };
  if (score >= 6.5) return { label: "Active", color: "#C9A36A" };
  if (score >= 4.5) return { label: "Stable", color: "#6D7BFF" };
  if (score >= 2.5) return { label: "Needs attention", color: "#E0B25C" };
  return { label: "Low signal", color: "#E36161" };
}

function nextAction(area: LifeArea, score: LifeAreaScore | undefined, stat: Stat): string {
  if (!score) return `Answer baseline questions to calibrate ${area.name}.`;
  if (stat.today === 0) return `Add at least one signal to ${area.name} today.`;
  if (score.score < 4) return `${area.name} is under pressure — acknowledge it in your next capture.`;
  if ((score.confidence ?? 0) < 0.35) return `More signals needed before Shadow can read ${area.name} clearly.`;
  return `Keep observing ${area.name}. Shadow is tracking.`;
}

// ─── Component ───────────────────────────────────────────────────────────────
type Props = {
  area: LifeArea | null;
  score: LifeAreaScore | undefined;
  stat: Stat;
  onClose?: () => void;
};

export function AreaPanel({ area, score, stat, onClose }: Props) {
  if (!area) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full min-h-[280px] rounded-2xl px-6 py-10 text-center"
        style={{
          background: "rgba(255,255,255,0.018)",
          border: "1px solid var(--shadow-border)",
        }}
      >
        <div
          className="w-14 h-14 rounded-full shadow-core-breathe mb-5"
          style={{
            background: "radial-gradient(circle at 35% 35%, rgba(201,163,106,0.10), rgba(10,9,20,0.85))",
            border: "1px solid rgba(201,163,106,0.10)",
            boxShadow: "0 0 28px rgba(201,163,106,0.06)",
          }}
        />
        <p className="eyebrow mb-2">Area Inspector</p>
        <p className="text-[12px] leading-relaxed max-w-[180px]" style={{ color: "var(--shadow-text-faint)" }}>
          Select an area from the circle to read its current state.
        </p>
      </div>
    );
  }

  const color = area.color_hint ?? "#C9A36A";
  const hasScore = score != null;
  const status = hasScore ? scoreStatus(score.score) : null;
  const action = nextAction(area, score, stat);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${color}09 0%, rgba(14,13,22,0.92) 48%)`,
        border: `1px solid ${color}28`,
        backdropFilter: "blur(18px) saturate(1.3)",
        WebkitBackdropFilter: "blur(18px) saturate(1.3)",
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: `${color}14` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Life area</p>
            <h3
              className="font-[family-name:var(--font-fraunces)] text-xl mt-0.5"
              style={{ color }}
            >
              {area.name}
            </h3>
            {area.description && (
              <p className="text-[11px] text-zinc-500 mt-0.5">{area.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Score ring */}
            <div className="relative h-12 w-12 flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#ffffff0a" strokeWidth="3" />
                {hasScore && (
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeOpacity={0.7}
                    strokeDasharray={`${(score.score / 10) * 125.7} 125.7`}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <span
                className="font-[family-name:var(--font-fraunces)] text-sm leading-none z-10"
                style={{ color: hasScore ? color : "#5E5867" }}
              >
                {hasScore ? score.score.toFixed(1) : "—"}
              </span>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="text-zinc-600 hover:text-zinc-300 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Status row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em]">Status</p>
            <p className="text-xs mt-0.5" style={{ color: status?.color ?? "#5E5867" }}>
              {status?.label ?? "Not calibrated"}
            </p>
          </div>
          <div className="rounded-md px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em]">Confidence</p>
            <p className="text-xs text-zinc-300 mt-0.5">
              {hasScore ? confidenceLabel(score.confidence) : "—"}
            </p>
          </div>
          <div className="rounded-md px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em]">Today</p>
            <p className="text-xs text-zinc-300 mt-0.5">
              {stat.today > 0 ? `${stat.today} signal${stat.today > 1 ? "s" : ""}` : "None"}
            </p>
          </div>
          <div className="rounded-md px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em]">Last signal</p>
            <p className="text-xs text-zinc-300 mt-0.5">
              {stat.lastTs ? relativeTime(stat.lastTs) : "Never"}
            </p>
          </div>
        </div>

        {/* Insight */}
        {hasScore && score.rationale && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--shadow-border)" }}>
            <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "var(--shadow-text-faint)" }}>Shadow read</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>{score.rationale}</p>
          </div>
        )}

        {/* Next action */}
        <div className="rounded-md border px-3 py-2.5" style={{ borderColor: `${color}22` }}>
          <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: `${color}88` }}>
            Next move
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed">{action}</p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!hasScore && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("shadow:reflection:open"))}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-black"
              style={{ backgroundColor: color }}
            >
              Calibrate
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("shadow:inbox:prefill", {
                  detail: { area: area.slug },
                }),
              );
              document.querySelector<HTMLElement>("[data-inbox-input]")?.focus();
            }}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-[var(--bg-elev2)]"
          >
            Add signal
          </button>
          <Link
            href={`/areas/${area.slug}`}
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-[var(--bg-elev2)]"
          >
            Open area →
          </Link>
        </div>
      </div>
    </div>
  );
}
