"use client";

import { useMemo, useState } from "react";
import type { LifeArea, LifeAreaScore } from "@/types/db";
import { useEntries } from "@/lib/entries/useEntries";
import { localDateKey, relativeTime } from "@/lib/time";

type Stat = { total: number; today: number; lastTs: string | null };

// ─── 8-state status ──────────────────────────────────────────────────────────
type Status = {
  label: string;
  color: string;
  dot?: boolean; // pulse dot
};

function areaStatus(
  stat: Stat,
  score: LifeAreaScore | undefined,
  yesterday: LifeAreaScore | undefined,
): Status {
  const hasScore = score != null;
  const conf = score?.confidence ?? 0;
  const s = score?.score ?? 0;

  let trend: "up" | "down" | null = null;
  if (hasScore && yesterday && conf > 0.35 && (yesterday.confidence ?? 0) > 0.35) {
    const diff = s - yesterday.score;
    if (diff >= 0.5) trend = "up";
    else if (diff <= -0.5) trend = "down";
  }

  if (stat.today > 0) return { label: "Updated today", color: "#6FBF8A", dot: true };
  if (hasScore && s <= 3.5) return { label: "Attention", color: "#E36161" };
  if (trend === "down") return { label: "Declining", color: "#E36161" };
  if (trend === "up") return { label: "Improving", color: "#5BB88A" };
  if (hasScore && conf <= 0.35) return { label: "Low confidence", color: "#8B7FBF" };
  if (hasScore && conf > 0.65) return { label: "Baseline", color: "#6D7BFF" };
  if (hasScore) return { label: "Stable", color: "#71717a" };
  return { label: "Needs signal", color: "#5E5867" };
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

function confLabel(c: number | null | undefined): string {
  if (c == null) return "unknown";
  if (c > 0.65) return "high";
  if (c > 0.35) return "medium";
  return "low";
}

// ─── Why? hover popover ───────────────────────────────────────────────────────
function WhyPopover({
  stat,
  score,
  yesterday,
}: {
  stat: Stat;
  score: LifeAreaScore | undefined;
  yesterday: LifeAreaScore | undefined;
}) {
  const [open, setOpen] = useState(false);

  function trendText(): string {
    if (!score || !yesterday) return "no data";
    const diff = score.score - yesterday.score;
    if (Math.abs(diff) < 0.5) return "stable →";
    return diff > 0
      ? `+${diff.toFixed(1)} improving ↑`
      : `${diff.toFixed(1)} declining ↓`;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="text-[9px] text-zinc-700 hover:text-zinc-400 transition-colors px-1.5 py-0.5 rounded border border-zinc-800 hover:border-zinc-600"
        aria-label="Why this score?"
      >
        Why?
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 z-20 rounded-lg border border-zinc-700 bg-zinc-950/98 backdrop-blur-sm px-3 py-3 shadow-2xl w-[204px]"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <p className="text-[10px] text-zinc-400 mb-2 font-medium tracking-wide">
            Score estimated from:
          </p>
          <div className="space-y-1.5">
            {(
              [
                ["Signals today", String(stat.today)],
                ["Total signals", String(stat.total)],
                ["Score", score ? `${score.score.toFixed(1)} / 10` : "—"],
                ["Confidence", confLabel(score?.confidence)],
                ["Trend vs yesterday", trendText()],
                ["Last signal", stat.lastTs ? relativeTime(stat.lastTs) : "never"],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-[10px]">
                <span className="text-zinc-600">{k}</span>
                <span className="text-zinc-300 text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Individual card ─────────────────────────────────────────────────────────
function AreaCardItem({
  area,
  stat,
  score,
  yesterday,
}: {
  area: LifeArea;
  stat: Stat;
  score: LifeAreaScore | undefined;
  yesterday: LifeAreaScore | undefined;
}) {
  const status = areaStatus(stat, score, yesterday);
  const color = area.color_hint ?? "#C9A36A";
  const hasScore = score != null;
  const highConfidence = hasScore && (score.confidence ?? 0) > 0.4;
  const trend = trendArrow(score, yesterday);

  return (
    <a
      id={area.slug}
      href={`/areas/${area.slug}`}
      className="card-hover rounded-xl border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-4 block relative"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: color,
                boxShadow: stat.today > 0 ? `0 0 8px ${color}` : "none",
              }}
            />
            <p className="font-[family-name:var(--font-fraunces)] text-lg text-zinc-100">
              {area.name}
            </p>
          </div>
          {area.description ? (
            <p className="text-xs text-zinc-500 mt-1.5">{area.description}</p>
          ) : null}
        </div>
        {hasScore ? (
          <span className="flex items-baseline gap-1 shrink-0">
            <span
              className="font-[family-name:var(--font-fraunces)] text-3xl leading-none"
              style={{
                color: highConfidence ? color : "#5E5867",
                opacity: highConfidence ? 1 : 0.6,
              }}
            >
              {score.score.toFixed(1)}
            </span>
            {trend && (
              <span
                className="text-xs leading-none"
                style={{ color: trend.color }}
                title={`vs yesterday: ${yesterday?.score.toFixed(1) ?? "?"}`}
              >
                {trend.symbol}
              </span>
            )}
          </span>
        ) : (
          <span
            className="font-[family-name:var(--font-fraunces)] text-3xl shrink-0 leading-none"
            style={{ color: stat.total > 0 ? color : "#5E5867" }}
          >
            {stat.total > 0 ? stat.total : "\u2014"}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{stat.today > 0 ? `${stat.today} today` : "no entries today"}</span>
        <span>{stat.lastTs ? `last · ${relativeTime(stat.lastTs)}` : "never"}</span>
      </div>

      <div className="mt-2 h-1 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: hasScore
              ? `${(score.score / 10) * 100}%`
              : `${Math.min(100, stat.today * 20)}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]"
          style={{
            backgroundColor: `${status.color}14`,
            color: status.color,
            border: `1px solid ${status.color}33`,
          }}
        >
          <span
            className={["h-1 w-1 rounded-full", status.dot ? "area-pulse" : ""].join(" ")}
            style={{ backgroundColor: status.color }}
          />
          {status.label}
        </span>
        <WhyPopover stat={stat} score={score} yesterday={yesterday} />
      </div>
    </a>
  );
}

// ─── Grid ────────────────────────────────────────────────────────────────────
type Props = {
  areas: LifeArea[];
  scores?: LifeAreaScore[];
  yesterdayScores?: LifeAreaScore[];
};

export function AreaGrid({ areas, scores = [], yesterdayScores = [] }: Props) {
  const { entries } = useEntries(200);

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
    const out = new Map<string, Stat>();
    for (const a of areas) out.set(a.slug, { total: 0, today: 0, lastTs: null });
    for (const e of entries) {
      if (!e.lifeAreaSlug) continue;
      const s = out.get(e.lifeAreaSlug);
      if (!s) continue;
      s.total += 1;
      if (localDateKey(e.createdAt) === today) s.today += 1;
      if (!s.lastTs || e.createdAt > s.lastTs) s.lastTs = e.createdAt;
    }
    return out;
  }, [areas, entries]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 anim-stagger">
      {areas.map((a) => (
        <AreaCardItem
          key={a.id}
          area={a}
          stat={stats.get(a.slug) ?? { total: 0, today: 0, lastTs: null }}
          score={scoreMap.get(a.id)}
          yesterday={yesterdayMap.get(a.id)}
        />
      ))}
    </div>
  );
}
