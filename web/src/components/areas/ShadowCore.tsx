"use client";

import { useRef, useState } from "react";
import type { LifeArea, LifeAreaScore } from "@/types/db";

// ─── Geometry ───────────────────────────────────────────────────────────────
const CX = 140, CY = 140;
const INNER_R = 40;
const MAX_OUTER_R = 116;
const GHOST_OUTER_R = 46;
const LABEL_R = MAX_OUTER_R + 16; // 132 — just outside max ring
const SECTOR_DEG = 30; // 360 / 12
const GAP_DEG = 2.4;

export type Stat = { total: number; today: number; lastTs: string | null };

function scoreToOuterR(score: number | null | undefined): number {
  if (score == null) return GHOST_OUTER_R;
  const s = Math.min(10, Math.max(0, score));
  return 50 + (s / 10) * (MAX_OUTER_R - 50);
}

function polar(r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

function sector(ir: number, or: number, a0: number, a1: number): string {
  const [ix1, iy1] = polar(ir, a0).map(r6) as [number, number];
  const [ox1, oy1] = polar(or, a0).map(r6) as [number, number];
  const [ox2, oy2] = polar(or, a1).map(r6) as [number, number];
  const [ix2, iy2] = polar(ir, a1).map(r6) as [number, number];
  return `M${ix1},${iy1} L${ox1},${oy1} A${or},${or} 0 0,1 ${ox2},${oy2} L${ix2},${iy2} A${ir},${ir} 0 0,0 ${ix1},${iy1}Z`;
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Tooltip = {
  area: LifeArea;
  score: LifeAreaScore | undefined;
  stat: Stat;
  x: number;
  y: number;
};

type Props = {
  areas: LifeArea[];
  scoreMap: Map<number, LifeAreaScore>;
  statMap: Map<string, Stat>;
  selectedId: number | null;
  onSelect: (area: LifeArea) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────
export function ShadowCore({ areas, scoreMap, statMap, selectedId, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // Core orb grows as more areas calibrated: 30% → 100% of INNER_R
  const calibratedFraction = areas.length > 0
    ? areas.filter((a) => scoreMap.has(a.id)).length / areas.length
    : 0;
  const coreDisplayR = Math.round(INNER_R * (0.3 + 0.7 * calibratedFraction));

  function trackMouse(e: React.MouseEvent, area: LifeArea, score: LifeAreaScore | undefined, stat: Stat) {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setTooltip({ area, score, stat, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  return (
    <div ref={wrapRef} className="relative select-none w-full max-w-[340px] mx-auto">
      {/* Expanded viewBox gives room for outside labels */}
      <svg
        viewBox="-16 -12 312 304"
        className="w-full"
        aria-label="Shadow Core — life circle visualization"
      >
        <defs>
          <filter id="sc-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feFlood floodColor="currentColor" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          <filter id="sc-hover" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          <filter id="sc-grain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="linearRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="multiply" result="b" />
            <feComposite in="b" in2="SourceGraphic" operator="in" />
          </filter>

          <radialGradient id="sc-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#08080e" />
            <stop offset="60%" stopColor="#0f0f18" />
            <stop offset="100%" stopColor="#18182a" />
          </radialGradient>

          <radialGradient id="sc-halo" cx="50%" cy="50%" r="50%">
            <stop offset="50%" stopColor="#C9A36A" stopOpacity="0" />
            <stop offset="100%" stopColor="#C9A36A" stopOpacity="0.04" />
          </radialGradient>
        </defs>

        {/* Outer ambient halo */}
        <circle cx={CX} cy={CY} r={MAX_OUTER_R + 14} fill="url(#sc-halo)" />

        {/* Guide rings */}
        {[0.35, 0.68, 1].map((t) => (
          <circle
            key={t}
            cx={CX} cy={CY}
            r={INNER_R + t * (MAX_OUTER_R - INNER_R)}
            fill="none"
            stroke="white"
            strokeOpacity={t === 1 ? 0.04 : 0.025}
            strokeWidth={t === 1 ? 0.8 : 0.5}
            strokeDasharray={t < 1 ? "1.5 5" : undefined}
          />
        ))}

        {/* Sectors with grain */}
        <g filter="url(#sc-grain)">
          {areas.map((area, i) => {
            const a0 = i * SECTOR_DEG + GAP_DEG;
            const a1 = (i + 1) * SECTOR_DEG - GAP_DEG;
            const score = scoreMap.get(area.id);
            const stat = statMap.get(area.slug) ?? { total: 0, today: 0, lastTs: null };
            const hasScore = score != null;
            const isGhost = !hasScore;
            const isSelected = selectedId === area.id;
            const isHovered = hoveredId === area.id;
            const isActive = stat.today > 0;
            const color = area.color_hint ?? "#C9A36A";

            const outerR = scoreToOuterR(score?.score);
            const expandedR = isSelected ? outerR + 6 : isHovered ? outerR + 3 : outerR;

            return (
              <g
                key={area.id}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => { setHoveredId(area.id); trackMouse(e, area, score, stat); }}
                onMouseMove={(e) => trackMouse(e, area, score, stat)}
                onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
                onClick={() => onSelect(area)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect(area)}
                aria-label={`${area.name}: ${hasScore ? `${score!.score.toFixed(1)}/10` : "not calibrated"}`}
              >
                {/* Active today pulse ring */}
                {isActive && !isSelected && (
                  <path
                    d={sector(outerR + 1, outerR + 7, a0, a1)}
                    fill={color}
                    fillOpacity={0.08}
                    stroke={color}
                    strokeOpacity={0.18}
                    strokeWidth={0.4}
                    className="area-pulse"
                  />
                )}

                {/* Main sector */}
                <path
                  d={sector(INNER_R, expandedR, a0, a1)}
                  fill={isGhost ? "#1e1e2a" : color}
                  fillOpacity={
                    isGhost ? 0.5
                    : isSelected ? 0.85
                    : isHovered ? 0.55
                    : 0.32
                  }
                  stroke={color}
                  strokeOpacity={
                    isGhost ? 0.08
                    : isSelected ? 0.75
                    : isHovered ? 0.3
                    : 0.12
                  }
                  strokeWidth={isSelected ? 1 : 0.4}
                  strokeDasharray={isGhost ? "2 3.5" : undefined}
                  style={{ color }}
                  filter={isSelected ? "url(#sc-glow)" : isHovered ? "url(#sc-hover)" : undefined}
                />

                {/* Selected sector outer accent ring */}
                {isSelected && (
                  <path
                    d={sector(expandedR + 1.5, expandedR + 3, a0, a1)}
                    fill={color}
                    fillOpacity={0.35}
                    strokeWidth={0}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Center dark core — size tracks calibration (30%→100% of INNER_R) */}
        <circle
          cx={CX} cy={CY} r={coreDisplayR}
          fill="url(#sc-core)"
          stroke="white"
          strokeOpacity={0.06}
          strokeWidth={0.6}
          className="shadow-core-breathe"
          style={{ transition: "r 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />

        {/* Inner ring accent */}
        <circle
          cx={CX} cy={CY} r={Math.max(4, coreDisplayR - 4)}
          fill="none"
          stroke="#C9A36A"
          strokeOpacity={0.08}
          strokeWidth={0.5}
        />

        {/* Center dot */}
        <circle cx={CX} cy={CY} r={3} fill="#C9A36A" fillOpacity={0.25} className="shadow-core-breathe" />

        {/* ── Area labels outside the ring ─────────────────────────────────── */}
        {areas.map((area, i) => {
          const midAngle = i * SECTOR_DEG + SECTOR_DEG / 2;
          const [lx, ly] = polar(LABEL_R, midAngle);
          const isSelected = selectedId === area.id;
          const isHovered = hoveredId === area.id;
          const color = area.color_hint ?? "#C9A36A";

          // Text-anchor based on horizontal position
          const anchor = lx > CX + 8 ? "start" : lx < CX - 8 ? "end" : "middle";

          return (
            <text
              key={`lbl-${area.id}`}
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={6}
              fill={isSelected || isHovered ? color : "white"}
              fillOpacity={isSelected ? 1 : isHovered ? 0.75 : 0.38}
              style={{ pointerEvents: "none", userSelect: "none", letterSpacing: "0.02em" }}
            >
              {area.name}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <p className="text-center text-[9px] text-zinc-700 mt-1 tracking-wide leading-relaxed">
        size = score &nbsp;·&nbsp; glow = signal today &nbsp;·&nbsp; click to explore
      </p>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-30 rounded-lg border border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-3 py-2.5 shadow-xl min-w-[148px] max-w-[200px]"
          style={{
            left: Math.min(tooltip.x + 14, (wrapRef.current?.offsetWidth ?? 280) - 210),
            top: Math.max(tooltip.y - 64, 4),
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.2em] font-medium"
            style={{ color: tooltip.area.color_hint ?? "#C9A36A" }}
          >
            {tooltip.area.name}
          </p>
          <p className="text-sm text-zinc-100 mt-0.5 font-[family-name:var(--font-fraunces)]">
            {tooltip.score ? `${tooltip.score.score.toFixed(1)} / 10` : "Not calibrated"}
          </p>
          <div className="mt-1.5 space-y-0.5">
            <p className="text-[10px] text-zinc-500">
              {tooltip.stat.today > 0
                ? `${tooltip.stat.today} signal${tooltip.stat.today > 1 ? "s" : ""} today`
                : "no signals today"}
            </p>
            {tooltip.score && (
              <p className="text-[10px] text-zinc-600">
                confidence:{" "}
                {(tooltip.score.confidence ?? 0) > 0.6
                  ? "high"
                  : (tooltip.score.confidence ?? 0) > 0.3
                    ? "medium"
                    : "low"}
              </p>
            )}
            {tooltip.score?.rationale && (
              <p className="text-[10px] text-zinc-500 mt-1 pt-1 border-t border-zinc-800 leading-relaxed">
                {tooltip.score.rationale.slice(0, 72)}
                {tooltip.score.rationale.length > 72 ? "…" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
