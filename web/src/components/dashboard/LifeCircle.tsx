"use client";

import { useMemo } from "react";
import type { LifeArea, LifeAreaScore } from "@/types/db";
import { useEntries } from "@/lib/entries/useEntries";
import { localDateKey } from "@/lib/time";

type AreaStat = {
  total: number;
  today: number;
  lastTs: string | null;
  emotions: string[];
};

type Status =
  | { kind: "empty"; label: string; color: string }
  | { kind: "active"; label: string; color: string }
  | { kind: "attention"; label: string; color: string }
  | { kind: "balanced"; label: string; color: string }
  | { kind: "overloaded"; label: string; color: string };

function statusFor(stat: AreaStat): Status {
  if (stat.total === 0)
    return { kind: "empty", label: "No data yet", color: "#5E5867" };
  if (stat.today >= 5)
    return { kind: "overloaded", label: "Overloaded", color: "#E36161" };
  if (stat.today >= 1)
    return { kind: "active", label: "Active today", color: "#6FBF8A" };
  if (stat.total >= 3)
    return { kind: "balanced", label: "Tracked", color: "#6D7BFF" };
  return { kind: "attention", label: "Needs attention", color: "#E0B25C" };
}

function scoreLabel(score: number): string {
  if (score <= 0) return "No data";
  if (score <= 3) return "Low signal";
  if (score <= 6) return "Tracked";
  if (score <= 8) return "Active";
  return "Strong";
}

function trendArrow(
  today: LifeAreaScore | undefined,
  yesterday: LifeAreaScore | undefined,
): { symbol: string; color: string } | null {
  if (!today || !yesterday) return null;
  if ((today.confidence ?? 0) <= 0.4 || (yesterday.confidence ?? 0) <= 0.4) return null;
  const diff = today.score - yesterday.score;
  if (diff >= 0.5) return { symbol: "\u25B2", color: "#6FBF8A" };
  if (diff <= -0.5) return { symbol: "\u25BC", color: "#E36161" };
  return { symbol: "\u2192", color: "#71717a" };
}

const NEGATIVE_EMOTIONS = new Set(["sad", "angry", "anxious", "frustrated", "stressed", "overwhelmed", "tired", "resistance", "avoidance", "fear"]);
const POSITIVE_EMOTIONS = new Set(["joy", "happy", "excited", "grateful", "proud", "calm", "hopeful", "motivated", "motivation", "content"]);

function deriveInsight(stat: AreaStat): string | null {
  if (stat.total === 0) return null;

  const negCount = stat.emotions.filter((e) => NEGATIVE_EMOTIONS.has(e.toLowerCase())).length;
  const posCount = stat.emotions.filter((e) => POSITIVE_EMOTIONS.has(e.toLowerCase())).length;

  if (negCount > posCount && negCount >= 2) return "Friction signals detected.";
  if (posCount > negCount && posCount >= 2) return "Positive momentum here.";
  if (stat.today >= 3) return "High activity today.";
  if (stat.today >= 1) return "Active signal flow.";
  if (stat.total >= 3) return "Tracked but quiet today.";
  return "Low signal.";
}

function deriveNextAction(stat: AreaStat, status: Status): string | null {
  if (stat.total === 0) return null;
  if (status.kind === "overloaded") return "Lower intensity.";
  if (status.kind === "attention") return "Add one signal or task.";
  if (status.kind === "active" && stat.today >= 2) return "Check if a task can be closed.";
  return null;
}

type Props = {
  areas: LifeArea[];
  scores?: LifeAreaScore[];
  yesterdayScores?: LifeAreaScore[];
};

export function LifeCircle({ areas, scores = [], yesterdayScores = [] }: Props) {
  const { entries, mode } = useEntries(200);

  const scoreMap = useMemo(() => {
    const m = new Map<number, LifeAreaScore>();
    for (const s of scores) m.set(s.life_area_id, s);
    return m;
  }, [scores]);

  const yesterdayMap = useMemo(() => {
    const m = new Map<number, LifeAreaScore>();
    for (const s of yesterdayScores) m.set(s.life_area_id, s);
    return m;
  }, [yesterdayScores]);

  const stats = useMemo(() => {
    const today = localDateKey(new Date().toISOString());
    const out = new Map<string, AreaStat>();
    for (const a of areas) {
      out.set(a.slug, { total: 0, today: 0, lastTs: null, emotions: [] });
    }
    for (const e of entries) {
      if (!e.lifeAreaSlug) continue;
      const s = out.get(e.lifeAreaSlug);
      if (!s) continue;
      s.total += 1;
      if (localDateKey(e.createdAt) === today) s.today += 1;
      if (!s.lastTs || e.createdAt > s.lastTs) s.lastTs = e.createdAt;
      if (e.emotionPrimary) s.emotions.push(e.emotionPrimary);
    }
    return out;
  }, [areas, entries]);

  const totalSignals = entries.filter((e) => e.lifeAreaSlug).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>{areas.length} areas · your current life map</span>
        <span>
          {mode === "loading"
            ? "syncing..."
            : `${totalSignals} signal${totalSignals === 1 ? "" : "s"} routed`}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 anim-stagger">
        {areas.map((a) => {
          const stat = stats.get(a.slug) ?? {
            total: 0,
            today: 0,
            lastTs: null,
            emotions: [],
          };
          const status = statusFor(stat);
          const color = a.color_hint ?? "#C9A36A";
          const areaScore = scoreMap.get(a.id);
          const yesterdayScore = yesterdayMap.get(a.id);
          const hasScore = areaScore != null;
          const highConfidence = hasScore && (areaScore.confidence ?? 0) > 0.4;
          const activityPct = Math.min(100, stat.today * 20);
          const trend = trendArrow(areaScore, yesterdayScore);
          const insight = deriveInsight(stat);
          const nextAction = deriveNextAction(stat, status);

          return (
            <a
              key={a.id}
              href={`/areas/${a.slug}`}
              className="card-hover card-glow group relative rounded-xl border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3 block"
              style={{ borderTopColor: color, borderTopWidth: 2 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-100 truncate font-medium">
                    {a.name}
                  </p>
                  {stat.today > 0 && (
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {stat.today} signal{stat.today === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1${stat.today > 0 ? " dot-breathe" : ""}`}
                  style={{
                    backgroundColor: color,
                    boxShadow: stat.today > 0 ? `0 0 10px ${color}80` : "none",
                  }}
                />
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                {hasScore ? (
                  <span className="flex items-baseline gap-1">
                    <span
                      className="font-[family-name:var(--font-fraunces)] text-2xl"
                      style={{
                        color: highConfidence ? color : "#5E5867",
                        opacity: highConfidence ? 1 : 0.6,
                      }}
                    >
                      {areaScore.score.toFixed(1)}
                    </span>
                    {trend && (
                      <span
                        className="text-[11px] leading-none"
                        style={{ color: trend.color }}
                        title={`vs yesterday: ${yesterdayScore?.score.toFixed(1) ?? "?"}`}
                      >
                        {trend.symbol}
                      </span>
                    )}
                  </span>
                ) : (
                  <span
                    className="font-[family-name:var(--font-fraunces)] text-2xl"
                    style={{ color: stat.total > 0 ? color : "#5E5867" }}
                  >
                    {stat.total > 0 ? stat.total : "\u2014"}
                  </span>
                )}
                <span className="text-[10px] text-zinc-500">
                  {hasScore
                    ? scoreLabel(areaScore.score)
                    : stat.today > 0
                      ? `${stat.today} today`
                      : "no entries today"}
                </span>
              </div>

              {/* Area insight */}
              {insight && (
                <p className="mt-2 text-[11px] text-zinc-400 leading-snug">
                  {insight}
                </p>
              )}

              {/* Next action suggestion */}
              {nextAction && (
                <p className="mt-1 text-[10px] text-[var(--accent-warm)] leading-snug">
                  Next: {nextAction}
                </p>
              )}

              <div className="mt-2 h-1 w-full rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: hasScore
                      ? `${(areaScore.score / 10) * 100}%`
                      : `${activityPct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]"
                  style={{
                    backgroundColor: `${status.color}14`,
                    color: status.color,
                    border: `1px solid ${status.color}33`,
                  }}
                >
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.label}
                </span>
                {hasScore && !highConfidence && (
                  <span className="text-[9px] text-zinc-600">low signal</span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
