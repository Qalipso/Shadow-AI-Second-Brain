"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyWheelScore, LifeArea, LifeAreaScore } from "@/types/db";
import { useEntries } from "@/lib/entries/useEntries";
import { localDateKey } from "@/lib/time";
import { wheelScoreToScoreMap } from "@/lib/reflection/wheel-utils";
import { ShadowCore, type Stat } from "./ShadowCore";
import { AreaPanel } from "./AreaPanel";
import { AreaGallery } from "./AreaGallery";
import { EveningRitual } from "@/components/reflection/EveningRitual";

// ─── Summary helpers ─────────────────────────────────────────────────────────
function overallBalance(areas: LifeArea[], scoreMap: Map<number, LifeAreaScore>): number | null {
  const scored = areas.filter((a) => scoreMap.has(a.id));
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, a) => acc + (scoreMap.get(a.id)?.score ?? 0), 0);
  return sum / scored.length;
}

function avgConfidence(areas: LifeArea[], scoreMap: Map<number, LifeAreaScore>): number {
  const scored = areas.filter((a) => scoreMap.has(a.id));
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, a) => acc + (scoreMap.get(a.id)?.confidence ?? 0), 0);
  return sum / scored.length;
}

function confidenceLabel(c: number): string {
  if (c > 0.65) return "confident";
  if (c > 0.35) return "partial";
  return "low";
}

// ─── Component ───────────────────────────────────────────────────────────────
type Props = {
  areas: LifeArea[];
  scores: LifeAreaScore[];
  yesterdayScores: LifeAreaScore[];
  reflection: DailyWheelScore | null;
};

export function AreasView({ areas, scores, yesterdayScores, reflection }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Optimistic reflection: updated immediately after ritual save, before router.refresh()
  const [localReflection, setLocalReflection] = useState<DailyWheelScore | null>(null);

  useEffect(() => {
    function handleSaved(e: Event) {
      const detail = (e as CustomEvent<{ reflection?: DailyWheelScore }>).detail;
      if (detail?.reflection) setLocalReflection(detail.reflection);
    }
    window.addEventListener("shadow:reflection:saved", handleSaved);
    return () => window.removeEventListener("shadow:reflection:saved", handleSaved);
  }, []);

  // Cleanup scroll timer on unmount.
  useEffect(() => () => { if (scrollTimerRef.current != null) clearTimeout(scrollTimerRef.current); }, []);

  const effectiveReflection = localReflection ?? reflection;

  const { entries } = useEntries(200);

  const scoreMap = useMemo(() => {
    if (effectiveReflection) return wheelScoreToScoreMap(effectiveReflection);
    const m = new Map<number, LifeAreaScore>();
    for (const s of scores) m.set(s.life_area_id, s);
    return m;
  }, [scores, effectiveReflection]);

  const yesterdayMap = useMemo(() => {
    const m = new Map<number, LifeAreaScore>();
    for (const s of yesterdayScores) m.set(s.life_area_id, s);
    return m;
  }, [yesterdayScores]);

  // Build stat map from entries — same logic as AreaGrid
  const statMap = useMemo(() => {
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

  // Summary metrics
  const balance = overallBalance(areas, scoreMap);
  const conf = avgConfidence(areas, scoreMap);
  const calibratedCount = areas.filter((a) => scoreMap.has(a.id)).length;
  const needsCalibration = areas.length - calibratedCount;
  const activeToday = [...statMap.values()].filter((s) => s.today > 0).length;

  const selectedArea = areas.find((a) => a.id === selectedId) ?? null;
  const selectedScore = selectedId != null ? scoreMap.get(selectedId) : undefined;
  const selectedStat = selectedArea
    ? (statMap.get(selectedArea.slug) ?? { total: 0, today: 0, lastTs: null })
    : { total: 0, today: 0, lastTs: null };

  function handleSelect(area: LifeArea) {
    setSelectedId((prev) => (prev === area.id ? null : area.id));
    // On mobile, scroll panel into view — clear previous timer to avoid stacking.
    if (scrollTimerRef.current != null) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      scrollTimerRef.current = null;
    }, 50);
  }

  const reflectionScores = useMemo<LifeAreaScore[]>(() => {
    if (!effectiveReflection) return scores;
    return [...wheelScoreToScoreMap(effectiveReflection).values()];
  }, [effectiveReflection, scores]);

  // ── Signal strip helpers ─────────────────────────────────────────────────
  let weakestArea: LifeArea | null = null;
  let worstScore = Infinity;
  for (const a of areas) {
    const s = scoreMap.get(a.id);
    if (s && s.score < worstScore) {
      worstScore = s.score;
      weakestArea = a;
    }
  }
  const weakestScore = weakestArea ? (scoreMap.get(weakestArea.id)?.score ?? null) : null;

  const suggestAreas = areas
    .filter((a) => (statMap.get(a.slug)?.today ?? 0) === 0)
    .sort((a, b) => (scoreMap.get(a.id)?.score ?? 0) - (scoreMap.get(b.id)?.score ?? 0))
    .slice(0, 3);

  function openRitual() {
    window.dispatchEvent(new CustomEvent("shadow:reflection:open"));
  }

  return (
    <div className="relative space-y-6">
      {/* ── Ambient background particles ────────────────────────────────── */}
      <div className="pointer-events-none absolute -inset-12 -z-10 overflow-hidden" aria-hidden>
        {[
          { top: "12%", left: "8%", size: 3, dur: "11s", delay: "0s", color: "rgba(201,163,106,0.45)" },
          { top: "68%", left: "3%", size: 2, dur: "14s", delay: "2.5s", color: "rgba(109,123,255,0.35)" },
          { top: "22%", right: "6%", size: 2.5, dur: "9s", delay: "1.2s", color: "rgba(201,163,106,0.30)" },
          { top: "55%", right: "10%", size: 2, dur: "13s", delay: "4s", color: "rgba(126,87,194,0.40)" },
          { top: "80%", left: "45%", size: 1.5, dur: "10s", delay: "6s", color: "rgba(201,163,106,0.25)" },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full atlas-particle"
            style={{
              top: p.top,
              left: "left" in p ? p.left : undefined,
              right: "right" in p ? (p as { right: string }).right : undefined,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              "--dur": p.dur,
              "--delay": p.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── Signal Header Strip — 4 metric cards ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 anim-stagger">
        {/* Balance Index */}
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "rgba(201,163,106,0.055)",
            border: "1px solid rgba(201,163,106,0.16)",
          }}
        >
          <p className="eyebrow mb-2">Balance Index</p>
          <p
            className="font-[family-name:var(--font-fraunces)] text-[26px] leading-none"
            style={{ color: "var(--accent-warm)" }}
          >
            {balance != null ? balance.toFixed(1) : "—"}
          </p>
          <p className="text-[10px] mt-1.5" style={{ color: "var(--shadow-text-faint)" }}>/ 10</p>
        </div>

        {/* Signal Confidence */}
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "rgba(255,255,255,0.022)",
            border: "1px solid var(--shadow-border)",
          }}
        >
          <p className="eyebrow mb-2">Signal Conf.</p>
          <p
            className="text-[15px] font-medium capitalize leading-none"
            style={{
              color: conf > 0.65 ? "#6FBF8A" : conf > 0.35 ? "#C9A36A" : "#E36161",
            }}
          >
            {confidenceLabel(conf)}
          </p>
          <p className="text-[10px] mt-1.5" style={{ color: "var(--shadow-text-faint)" }}>
            {Math.round(conf * 100)}% avg
          </p>
        </div>

        {/* Active Today */}
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "rgba(255,255,255,0.022)",
            border: "1px solid var(--shadow-border)",
          }}
        >
          <p className="eyebrow mb-2">Active Today</p>
          <p
            className="font-[family-name:var(--font-fraunces)] text-[26px] leading-none"
            style={{ color: "var(--shadow-text)" }}
          >
            {activeToday}
          </p>
          <p className="text-[10px] mt-1.5" style={{ color: "var(--shadow-text-faint)" }}>
            / {areas.length} areas
          </p>
        </div>

        {/* Weakest Signal */}
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "rgba(255,255,255,0.022)",
            border: "1px solid var(--shadow-border)",
          }}
        >
          <p className="eyebrow mb-2">Weakest Signal</p>
          {weakestArea ? (
            <>
              <p
                className="text-[14px] font-medium leading-none truncate"
                style={{ color: weakestArea.color_hint ?? "var(--accent-warm)" }}
              >
                {weakestArea.name}
              </p>
              <p className="text-[10px] mt-1.5" style={{ color: "var(--shadow-text-faint)" }}>
                {weakestScore != null ? `${weakestScore.toFixed(1)} / 10` : "uncalibrated"}
              </p>
            </>
          ) : (
            <p className="text-[14px] leading-none" style={{ color: "var(--shadow-text-faint)" }}>—</p>
          )}
        </div>
      </div>

      {/* ── Calibration prompt when nothing scored ─────────────────────── */}
      {calibratedCount === 0 && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl"
          style={{
            background: "rgba(201,163,106,0.04)",
            border: "1px solid rgba(201,163,106,0.16)",
          }}
        >
          <div>
            <p className="text-[11px] font-mono" style={{ color: "var(--accent-warm)" }}>
              Shadow Core is uncalibrated
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--shadow-text-faint)" }}>
              Rate each life area 0–10 to build your map. Takes ~2 min.
            </p>
          </div>
          <button
            onClick={openRitual}
            className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium text-black transition-all"
            style={{ backgroundColor: "var(--accent-warm)" }}
          >
            Calibrate now
          </button>
        </div>
      )}

      {/* ── Core + Panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Shadow Core mandala with ambient glow */}
        <div className="w-full lg:w-auto lg:flex-shrink-0 lg:w-[340px] relative">
          {/* Ambient radial glow behind mandala */}
          <div
            className="absolute pointer-events-none -z-10"
            style={{
              inset: "-20%",
              background: "radial-gradient(50% 50% at 50% 50%, rgba(201,163,106,0.07) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <p
            className="eyebrow mb-3 text-center"
          >
            Shadow Core
          </p>
          <ShadowCore
            areas={areas}
            scoreMap={scoreMap}
            statMap={statMap}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
          <div className="mt-3 text-center">
            <button
              onClick={openRitual}
              className={[
                "rounded-lg px-4 py-2 text-[11px] font-medium transition-all",
                effectiveReflection
                  ? "hover:text-zinc-200"
                  : "border border-[var(--accent-warm)] text-[var(--accent-warm)] hover:bg-[var(--accent-warm)] hover:text-black",
              ].join(" ")}
              style={effectiveReflection ? { color: "var(--shadow-text-faint)" } : undefined}
            >
              {effectiveReflection ? "Your reflection today · tap to edit" : "Close the day"}
            </button>
          </div>
        </div>

        {/* Area inspector panel */}
        <div ref={panelRef} className="w-full lg:flex-1 min-w-0">
          <AreaPanel
            area={selectedArea}
            score={selectedScore}
            stat={selectedStat}
            onClose={selectedId != null ? () => setSelectedId(null) : undefined}
          />
        </div>
      </div>

      <div className="glow-line" />

      {/* ── Today Coverage — constellation ───────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{
          background: "rgba(255,255,255,0.018)",
          border: "1px solid var(--shadow-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="eyebrow">Today Coverage</p>
          <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
            {activeToday} / {areas.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          {areas.map((a) => {
            const isActive = (statMap.get(a.slug)?.today ?? 0) > 0;
            const color = a.color_hint ?? "#C9A36A";
            return (
              <div key={a.id} className="flex flex-col items-center gap-1.5">
                <span
                  title={a.name}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${isActive ? "atlas-beacon" : ""}`}
                  style={{
                    backgroundColor: isActive ? color : "rgba(255,255,255,0.07)",
                    boxShadow: isActive ? `0 0 6px ${color}80` : "none",
                    "--bc": `${color}60`,
                  } as React.CSSProperties}
                />
                <span
                  className="text-[8px] font-mono uppercase tracking-wide"
                  style={{ color: isActive ? color : "rgba(255,255,255,0.18)" }}
                >
                  {a.name.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Shadow Suggests ──────────────────────────────────────────────── */}
      {suggestAreas.length > 0 && (
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(201,163,106,0.06) 0%, rgba(109,123,255,0.03) 100%)",
            border: "1px solid rgba(201,163,106,0.14)",
          }}
        >
          <p className="eyebrow mb-2">Shadow Suggests</p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
            Start with{" "}
            <span style={{ color: "var(--accent-warm)" }}>
              {suggestAreas.map((a) => a.name).join(", ")}
            </span>
            {" "}—{" "}
            {suggestAreas.length === 1 ? "this area needs" : "these areas need"} signal today.
          </p>
        </div>
      )}

      {/* ── Area gallery ─────────────────────────────────────────────────── */}
      <div>
        <div className="glow-line mb-5" />
        <AreaGallery
          areas={areas}
          scores={reflectionScores}
          yesterdayScores={yesterdayScores}
        />
      </div>

      <EveningRitual />
    </div>
  );
}
