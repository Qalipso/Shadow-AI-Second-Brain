"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LifeArea, LifeAreaScore } from "@/types/db";
import { useEntries } from "@/lib/entries/useEntries";
import { localDateKey, relativeTime } from "@/lib/time";
import type { Stat } from "./ShadowCore";

// ─── Area visual SVG art (per slug, with active animations) ──────────────────
function AreaArt({ slug, color, active = false }: { slug: string; color: string; active?: boolean }) {
  const c = color;
  const loop = "infinite";
  const ease = "ease-in-out";

  switch (slug) {
    case "work":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g style={active ? { animation: `art-work-float 2.4s ${ease} ${loop}`, animationDelay: "0ms" } : {}}>
            <rect x="20" y="20" width="28" height="28" rx="3" stroke={c} strokeOpacity="0.25" strokeWidth="1.2" />
            <rect x="56" y="20" width="28" height="28" rx="3" stroke={c} strokeOpacity="0.55" strokeWidth="1.4" fill={c} fillOpacity="0.10" />
            <rect x="92" y="20" width="28" height="28" rx="3" stroke={c} strokeOpacity="0.20" strokeWidth="1.2" />
          </g>
          <g style={active ? { animation: `art-work-float 2.4s ${ease} ${loop}`, animationDelay: "400ms" } : {}}>
            <rect x="20" y="56" width="28" height="28" rx="3" stroke={c} strokeOpacity="0.15" strokeWidth="1.2" />
            <rect x="56" y="56" width="28" height="28" rx="3" stroke={c} strokeOpacity="0.60" strokeWidth="1.5" fill={c} fillOpacity="0.14" />
            <rect x="92" y="56" width="28" height="28" rx="3" stroke={c} strokeOpacity="0.30" strokeWidth="1.2" />
          </g>
          <rect x="38" y="92" width="28" height="12" rx="2" stroke={c} strokeOpacity="0.18" strokeWidth="1" />
          <rect x="74" y="92" width="50" height="12" rx="2" stroke={c} strokeOpacity="0.12" strokeWidth="1" />
        </svg>
      );
    case "money":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="80" cy="58" r="40" stroke={c} strokeOpacity="0.12" strokeWidth="1" />
          <g style={active ? { animation: `art-spin-slow 8s linear ${loop}`, transformOrigin: "80px 58px" } : {}}>
            <circle cx="80" cy="58" r="28" stroke={c} strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="4 6" />
          </g>
          <g style={active ? { animation: `art-spin-slow 5s linear ${loop} reverse`, transformOrigin: "80px 58px" } : {}}>
            <circle cx="80" cy="58" r="16" stroke={c} strokeOpacity="0.45" strokeWidth="1.5" fill={c} fillOpacity="0.06" />
          </g>
          <circle cx="80" cy="58" r="5" fill={c} fillOpacity={active ? 0.55 : 0.35} />
          <line x1="80" y1="14" x2="80" y2="24" stroke={c} strokeOpacity="0.20" strokeWidth="1" />
          <line x1="80" y1="92" x2="80" y2="102" stroke={c} strokeOpacity="0.20" strokeWidth="1" />
          <line x1="36" y1="58" x2="46" y2="58" stroke={c} strokeOpacity="0.20" strokeWidth="1" />
          <line x1="114" y1="58" x2="124" y2="58" stroke={c} strokeOpacity="0.20" strokeWidth="1" />
        </svg>
      );
    case "health":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path
            d="M10 60 Q30 30 50 60 Q70 90 90 40 Q110 10 130 55 Q145 65 150 60"
            stroke={c} strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round"
            strokeDasharray={active ? "8 4" : "none"}
            style={active ? { animation: `art-health-wave 2s linear ${loop}` } : {}}
          />
          <path d="M10 75 Q30 55 50 75 Q70 95 90 60 Q110 30 130 70" stroke={c} strokeOpacity="0.18" strokeWidth="1" strokeLinecap="round" />
          <circle
            cx="90" cy="40" r="4"
            fill={c} fillOpacity={active ? 0.65 : 0.40}
            style={active ? { animation: `art-energy-pulse 1.5s ${ease} ${loop}` } : {}}
          />
        </svg>
      );
    case "energy":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="80" cy="60" r="8" fill={c} fillOpacity="0.30"
            style={active ? { animation: `art-energy-pulse 1.2s ${ease} ${loop}` } : {}} />
          {[
            { x1: 96, y1: 60, x2: 104, y2: 60, op: 0.45, w: 1.5, delay: 0 },
            { x1: 93.86, y1: 68, x2: 105.98, y2: 75, op: 0.20, w: 1, delay: 100 },
            { x1: 88, y1: 73.86, x2: 98, y2: 91.18, op: 0.45, w: 1, delay: 200 },
            { x1: 80, y1: 76, x2: 80, y2: 84, op: 0.20, w: 1.5, delay: 300 },
            { x1: 72, y1: 73.86, x2: 65, y2: 85.98, op: 0.45, w: 1, delay: 400 },
            { x1: 66.14, y1: 68, x2: 48.82, y2: 78, op: 0.20, w: 1, delay: 500 },
            { x1: 64, y1: 60, x2: 56, y2: 60, op: 0.45, w: 1.5, delay: 600 },
            { x1: 66.14, y1: 52, x2: 54.02, y2: 45, op: 0.20, w: 1, delay: 700 },
            { x1: 72, y1: 46.14, x2: 62, y2: 28.82, op: 0.45, w: 1, delay: 800 },
            { x1: 80, y1: 44, x2: 80, y2: 36, op: 0.20, w: 1.5, delay: 900 },
            { x1: 88, y1: 46.14, x2: 95, y2: 34.02, op: 0.45, w: 1, delay: 1000 },
            { x1: 93.86, y1: 52, x2: 111.18, y2: 42, op: 0.20, w: 1, delay: 1100 },
          ].map((ray, i) => (
            <line key={i} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2}
              stroke={c} strokeOpacity={ray.op} strokeWidth={ray.w} strokeLinecap="round"
              style={active ? { animation: `art-energy-pulse 1.4s ${ease} ${loop}`, animationDelay: `${ray.delay}ms` } : {}}
            />
          ))}
          <circle cx="80" cy="60" r="36" stroke={c} strokeOpacity="0.08" strokeWidth="1" />
          <circle cx="80" cy="60" r="48" stroke={c} strokeOpacity="0.05" strokeWidth="1" />
        </svg>
      );
    case "food":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g style={active ? { animation: `art-scale-breathe 2.5s ${ease} ${loop}`, transformOrigin: "80px 58px" } : {}}>
            <path d="M80 20 C60 30 45 50 50 70 C55 85 70 95 80 95 C90 95 105 85 110 70 C115 50 100 30 80 20Z" stroke={c} strokeOpacity="0.30" strokeWidth="1.2" fill={c} fillOpacity="0.05" />
            <path d="M80 35 C68 42 62 55 65 68 C68 78 74 84 80 84 C86 84 92 78 95 68 C98 55 92 42 80 35Z" stroke={c} strokeOpacity="0.50" strokeWidth="1" fill={c} fillOpacity="0.10" />
          </g>
          <path d="M65 58 Q72 52 80 58 Q88 64 95 58" stroke={c} strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="80" cy="60" r="4" fill={c} fillOpacity="0.35" />
        </svg>
      );
    case "mind":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {([
            [80, 35], [110, 50], [120, 80], [95, 100], [65, 100], [40, 80], [50, 50],
          ] as [number, number][]).map(([x, y], i, arr) => (
            <g key={i}>
              <circle
                cx={x} cy={y}
                r={i === 0 ? 3.5 : 2.5}
                fill={c}
                fillOpacity={i === 0 ? 0.60 : 0.35}
                style={active ? { animation: `art-energy-pulse ${1.6 + i * 0.2}s ${ease} ${loop}`, animationDelay: `${i * 150}ms` } : {}}
              />
              {arr.slice(i + 1).map(([x2, y2], j) => (
                (i === 0 || j === 0) ? (
                  <line key={j} x1={x} y1={y} x2={x2} y2={y2} stroke={c} strokeOpacity={i === 0 ? 0.25 : 0.10} strokeWidth="0.8" />
                ) : null
              ))}
            </g>
          ))}
        </svg>
      );
    case "emotion":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g style={active ? { animation: `art-scale-breathe 1.8s ${ease} ${loop}`, transformOrigin: "80px 58px" } : {}}>
            <path d="M80 95 C40 75 20 55 25 38 C30 22 50 18 65 30 C72 35 77 42 80 48 C83 42 88 35 95 30 C110 18 130 22 135 38 C140 55 120 75 80 95Z" stroke={c} strokeOpacity="0.45" strokeWidth="1.4" fill={c} fillOpacity="0.09" />
            <path d="M80 80 C58 65 44 52 48 40 C51 30 62 29 72 37 C75.5 39.5 78 43 80 47 C82 43 84.5 39.5 88 37 C98 29 109 30 112 40 C116 52 102 65 80 80Z" stroke={c} strokeOpacity="0.25" strokeWidth="1" fill={c} fillOpacity="0.05" />
          </g>
        </svg>
      );
    case "social":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {([
            [80, 55, 5, 0.60, 0],
            [45, 35, 3.5, 0.40, 200], [115, 35, 3.5, 0.40, 400],
            [30, 70, 3, 0.30, 600], [80, 90, 3, 0.35, 800], [130, 70, 3, 0.30, 1000],
            [55, 90, 2.5, 0.22, 1200], [105, 90, 2.5, 0.22, 1400],
          ] as [number, number, number, number, number][]).map(([x, y, r, op, delay], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={c} fillOpacity={op}
              style={active ? { animation: `art-energy-pulse ${1.8 + i * 0.1}s ${ease} ${loop}`, animationDelay: `${delay}ms` } : {}}
            />
          ))}
          {([
            [80, 55, 45, 35], [80, 55, 115, 35], [80, 55, 80, 90],
            [45, 35, 30, 70], [115, 35, 130, 70], [80, 90, 55, 90],
            [80, 90, 105, 90], [30, 70, 55, 90], [130, 70, 105, 90],
          ] as [number, number, number, number][]).map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeOpacity="0.20" strokeWidth="0.8" />
          ))}
        </svg>
      );
    case "creativity":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g style={active ? { animation: `art-spin-slow 12s linear ${loop}`, transformOrigin: "80px 58px" } : {}}>
            <path
              d={(() => {
                let d = "M 80 58";
                let r = 4;
                for (let i = 0; i < 48; i++) {
                  const angle = (i / 8) * Math.PI;
                  r += 2.8;
                  const px = Math.round((80 + Math.cos(angle) * r) * 100) / 100;
                  const py = Math.round((58 + Math.sin(angle) * r) * 100) / 100;
                  d += ` L ${px} ${py}`;
                }
                return d;
              })()}
              stroke={c} strokeOpacity="0.45" strokeWidth="1.2" fill="none" strokeLinecap="round"
            />
          </g>
          <circle cx="80" cy="58" r="4" fill={c} fillOpacity="0.35" />
        </svg>
      );
    case "meaning":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const inner = i % 2 === 0 ? 18 : 32;
            return (
              <line
                key={deg}
                x1={80} y1={60}
                x2={80 + Math.cos(rad) * inner}
                y2={60 + Math.sin(rad) * inner}
                stroke={c}
                strokeOpacity={i % 2 === 0 ? 0.55 : 0.20}
                strokeWidth={i % 2 === 0 ? 1.5 : 0.8}
                strokeLinecap="round"
                style={active ? { animation: `art-energy-pulse ${2 + i * 0.15}s ${ease} ${loop}`, animationDelay: `${i * 120}ms` } : {}}
              />
            );
          })}
          <circle cx="80" cy="60" r="5" fill={c} fillOpacity="0.30"
            style={active ? { animation: `art-energy-pulse 1.5s ${ease} ${loop}` } : {}} />
          <circle cx="80" cy="60" r="44" stroke={c} strokeOpacity="0.08" strokeWidth="1" />
        </svg>
      );
    case "discipline":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {[25, 45, 65, 85, 105, 125].map((x) => (
            <line key={x} x1={x} y1="20" x2={x} y2="100" stroke={c} strokeOpacity="0.12" strokeWidth="0.8" />
          ))}
          {[28, 44, 60, 76, 92].map((y) => (
            <line key={y} x1="20" y1={y} x2="140" y2={y} stroke={c} strokeOpacity="0.12" strokeWidth="0.8" />
          ))}
          <rect x="35" y="36" width="24" height="16" rx="2" fill={c} fillOpacity="0.18" stroke={c} strokeOpacity="0.45" strokeWidth="1.2"
            style={active ? { animation: `art-work-float 2s ${ease} ${loop}`, animationDelay: "0ms" } : {}} />
          <rect x="79" y="52" width="24" height="16" rx="2" fill={c} fillOpacity="0.10" stroke={c} strokeOpacity="0.30" strokeWidth="1"
            style={active ? { animation: `art-work-float 2s ${ease} ${loop}`, animationDelay: "250ms" } : {}} />
          <rect x="57" y="68" width="24" height="16" rx="2" fill={c} fillOpacity="0.08" stroke={c} strokeOpacity="0.22" strokeWidth="1"
            style={active ? { animation: `art-work-float 2s ${ease} ${loop}`, animationDelay: "500ms" } : {}} />
          <line x1="47" y1="52" x2="79" y2="60" stroke={c} strokeOpacity="0.20" strokeWidth="0.8" />
          <line x1="91" y1="68" x2="69" y2="68" stroke={c} strokeOpacity="0.15" strokeWidth="0.8" />
        </svg>
      );
    case "environment":
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M10 90 Q40 50 80 60 Q120 70 150 35" stroke={c} strokeOpacity="0.18" strokeWidth="1" strokeLinecap="round" />
          <path d="M10 80 Q50 40 80 50 Q110 58 150 28" stroke={c} strokeOpacity="0.30" strokeWidth="1.2" strokeLinecap="round" />
          <g style={active ? { animation: `art-work-float 3s ${ease} ${loop}`, transformOrigin: "80px 60px" } : {}}>
            <path d="M60 80 L80 40 L100 80Z" stroke={c} strokeOpacity="0.45" strokeWidth="1.2" fill={c} fillOpacity="0.08" />
            <path d="M75 80 L90 52 L105 80Z" stroke={c} strokeOpacity="0.28" strokeWidth="1" fill={c} fillOpacity="0.05" />
          </g>
          <line x1="80" y1="80" x2="80" y2="95" stroke={c} strokeOpacity="0.30" strokeWidth="1.2" />
          <line x1="68" y1="95" x2="92" y2="95" stroke={c} strokeOpacity="0.20" strokeWidth="1" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="80" cy="60" r="30" stroke={c} strokeOpacity="0.30" strokeWidth="1.2" fill={c} fillOpacity="0.05" />
          <circle cx="80" cy="60" r="8" fill={c} fillOpacity="0.25" />
        </svg>
      );
  }
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 40 }: { score: number; color: string; size?: number }) {
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeOpacity={0.75}
        strokeWidth="2.5"
        strokeDasharray={`${(score / 10) * circ} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Status helpers (shared) ──────────────────────────────────────────────────
function statusColor(score: number): string {
  if (score >= 8.5) return "#6FBF8A";
  if (score >= 6.5) return "#C9A36A";
  if (score >= 4.5) return "#6D7BFF";
  if (score >= 2.5) return "#E0B25C";
  return "#E36161";
}

function statusLabel(score: number): string {
  if (score >= 8.5) return "Thriving";
  if (score >= 6.5) return "Active";
  if (score >= 4.5) return "Stable";
  if (score >= 2.5) return "Needs attention";
  return "Low signal";
}

function confLabel(c: number | null | undefined): string {
  if (c == null) return "—";
  if (c > 0.65) return "high";
  if (c > 0.35) return "medium";
  return "low";
}

// ─── Expanded insights panel (shown below gallery) ────────────────────────────
function AreaInsightPanel({
  area,
  score,
  stat,
  onClose,
}: {
  area: LifeArea;
  score: LifeAreaScore | undefined;
  stat: Stat;
  onClose: () => void;
}) {
  const color = area.color_hint ?? "#C9A36A";
  const hasScore = score != null;
  const router = useRouter();

  function nextAction(): string {
    if (!hasScore) return `Answer baseline questions to calibrate ${area.name}.`;
    if (stat.today === 0) return `Add at least one signal to ${area.name} today.`;
    if (score.score < 4) return `${area.name} is under pressure — acknowledge it in your next capture.`;
    if ((score.confidence ?? 0) < 0.35) return `More signals needed before Shadow can read ${area.name} clearly.`;
    return `Keep observing ${area.name}. Shadow is tracking.`;
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${color}25` }}
    >
      {/* Header — reveal 1 */}
      <div
        className="panel-reveal-1 px-5 py-4 flex items-start justify-between gap-3"
        style={{ background: `linear-gradient(135deg, ${color}0a 0%, transparent 60%)` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, opacity: 0.8 }} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Area insight</p>
            <p className="font-[family-name:var(--font-fraunces)] text-lg leading-tight" style={{ color }}>
              {area.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasScore && (
            <div className="relative flex items-center justify-center">
              <ScoreRing score={score.score} color={color} size={44} />
              <span
                className="absolute font-[family-name:var(--font-fraunces)] text-sm leading-none"
                style={{ color }}
              >
                {score.score.toFixed(1)}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close insights"
            className="text-zinc-600 hover:text-zinc-300 text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Stats row — reveal 2 */}
      <div className="panel-reveal-2 grid grid-cols-4 divide-x divide-zinc-800/60 border-t border-zinc-800/60">
        {[
          ["Status", hasScore ? statusLabel(score.score) : "—"],
          ["Confidence", confLabel(score?.confidence)],
          ["Today", stat.today > 0 ? `${stat.today} signal${stat.today > 1 ? "s" : ""}` : "None"],
          ["Last signal", stat.lastTs ? relativeTime(stat.lastTs) : "Never"],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">{label}</p>
            <p className="text-xs text-zinc-300 mt-0.5 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Shadow read — reveal 3 */}
        {hasScore && score.rationale && (
          <div className="panel-reveal-3 rounded-xl border border-zinc-800 bg-[var(--bg-elev2)] px-4 py-3">
            <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 mb-1.5">Shadow read</p>
            <p className="text-[13px] text-zinc-300 leading-relaxed">{score.rationale}</p>
          </div>
        )}

        {/* Next move — reveal 4 */}
        <div
          className="panel-reveal-4 rounded-xl border px-4 py-3"
          style={{ borderColor: `${color}20`, background: `${color}06` }}
        >
          <p className="text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: `${color}80` }}>
            Next move
          </p>
          <p className="text-[13px] text-zinc-400 leading-relaxed">{nextAction()}</p>
        </div>

        {/* Score bar — reveal 5 */}
        {hasScore && (
          <div className="panel-reveal-5">
            <div className="flex justify-between text-[10px] text-zinc-600 mb-1.5">
              <span>Score</span>
              <span style={{ color: statusColor(score.score) }}>{statusLabel(score.score)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="bar-grow h-full rounded-full"
                style={{ width: `${(score.score / 10) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )}

        {/* CTAs — reveal 6 */}
        <div className="panel-reveal-6 flex flex-wrap gap-2 pt-1">
          {!hasScore && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("shadow:reflection:open"))}
              className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-black"
              style={{ backgroundColor: color }}
            >
              Calibrate
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/inbox")}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-[var(--bg-elev2)]"
          >
            Add signal
          </button>
          <button
            type="button"
            onClick={() => router.push(`/areas/${area.slug}`)}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-[var(--bg-elev2)]"
          >
            Deep dive →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single gallery card ──────────────────────────────────────────────────────
function AreaGalleryCard({
  area,
  score,
  stat,
  active,
  dimmed,
  onClick,
}: {
  area: LifeArea;
  score: LifeAreaScore | undefined;
  stat: Stat;
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const color = area.color_hint ?? "#C9A36A";
  const hasScore = score != null;
  const highConf = hasScore && (score.confidence ?? 0) > 0.4;

  // One-shot pop animation on selection; delayed float bob after expansion
  const [isPopping, setIsPopping] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const floatTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (active && !isPopping) {
      // Start float bob after the expansion transition finishes
      floatTimerRef.current = setTimeout(() => setIsFloating(true), 400);
    } else {
      clearTimeout(floatTimerRef.current);
      setIsFloating(false);
    }
    return () => clearTimeout(floatTimerRef.current);
  }, [active, isPopping]);

  function handleClick() {
    if (!active) {
      setIsPopping(true);
      setIsFloating(false);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsPopping(false), 560);
    }
    onClick();
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden text-left${isPopping ? " card-pop" : isFloating ? " area-card-floating" : ""}`}
      style={{
        width: active ? "340px" : "172px",
        opacity: dimmed ? 0.38 : 1,
        filter: dimmed ? "blur(0.6px) saturate(0.6)" : "none",
        border: active ? `1px solid ${color}55` : `1px solid rgba(255,255,255,0.08)`,
        background: active
          ? `linear-gradient(165deg, ${color}16 0%, rgba(10,9,20,0.97) 55%)`
          : `linear-gradient(165deg, rgba(255,255,255,0.04) 0%, rgba(10,9,20,0.97) 60%)`,
        boxShadow: active
          ? `0 2px 0 rgba(255,255,255,0.09) inset, 0 -1px 0 rgba(0,0,0,0.6) inset, 0 24px 60px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.55), 0 0 0 1px ${color}35, 0 32px 80px ${color}22, 0 2px 12px ${color}18`
          : `0 2px 0 rgba(255,255,255,0.05) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 4px 16px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)`,
        transform: isFloating ? undefined : (active && !isPopping ? "translateY(-20px) scale(1.015)" : isPopping ? undefined : "translateY(0) scale(1)"),
        transition: isPopping || isFloating
          ? "none"
          : "width 0.4s cubic-bezier(.34,1.4,.64,1), transform 0.35s cubic-bezier(.14,1.2,.34,1), box-shadow 0.3s ease, border-color 0.25s ease, background 0.3s ease, opacity 0.25s ease, filter 0.25s ease",
      }}
    >
      {/* Glass highlight top edge */}
      <div
        className="absolute top-0 left-3 right-3 h-px rounded-full"
        style={{
          background: active
            ? `linear-gradient(90deg, transparent, ${color}65, transparent)`
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
          transition: "background 0.3s ease",
        }}
      />

      {/* Ambient color overlay — breathing glow when active */}
      {active && (
        <div
          className="absolute inset-0 pointer-events-none area-card-overlay-breathe"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${color}12 0%, transparent 65%)`,
          }}
        />
      )}

      {/* Art area */}
      <div
        className="w-full relative"
        style={{
          height: active ? "160px" : "116px",
          background: `radial-gradient(ellipse at 50% 90%, ${color}${active ? "20" : "10"} 0%, transparent 65%)`,
          transition: "height 0.35s cubic-bezier(.34,1.2,.64,1), background 0.4s ease",
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-3"
          style={{
            filter: active ? `drop-shadow(0 0 10px ${color}55)` : "none",
            transition: "filter 0.4s ease",
          }}
        >
          <AreaArt slug={area.slug} color={color} active={active} />
        </div>

        {/* Today pulse */}
        {stat.today > 0 && (
          <span
            className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full area-pulse"
            style={{ backgroundColor: color }}
          />
        )}
      </div>

      {/* Separator line */}
      <div
        className="h-px mx-3"
        style={{
          background: active ? `${color}35` : "rgba(255,255,255,0.05)",
          transition: "background 0.3s ease",
        }}
      />

      {/* Info bottom strip */}
      <div className="px-3 pb-3.5 pt-2.5">
        <p
          className="font-[family-name:var(--font-fraunces)] text-[15px] leading-tight truncate"
          style={{
            color: active ? color : "rgba(255,255,255,0.75)",
            transition: "color 0.25s ease",
          }}
        >
          {area.name}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          {hasScore ? (
            <span
              className="text-[24px] leading-none font-[family-name:var(--font-fraunces)]"
              style={{
                color: highConf ? color : "#5E5867",
                textShadow: active && highConf ? `0 0 20px ${color}70` : "none",
                transition: "text-shadow 0.3s ease",
              }}
            >
              {score.score.toFixed(1)}
            </span>
          ) : (
            <span className="text-[18px] leading-none font-[family-name:var(--font-fraunces)] text-zinc-700">—</span>
          )}
          {hasScore && (
            <div
              className="relative w-6 h-6"
              style={{
                opacity: active ? 0.9 : 0.42,
                transition: "opacity 0.3s ease",
              }}
            >
              <ScoreRing score={score.score} color={color} size={24} />
            </div>
          )}
        </div>
        <p
          className="text-[9px] mt-0.5 truncate"
          style={{ color: stat.today > 0 ? color : "#404040" }}
        >
          {stat.today > 0 ? `${stat.today} today` : stat.lastTs ? relativeTime(stat.lastTs) : "no signals"}
        </p>
      </div>
    </button>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
type Props = {
  areas: LifeArea[];
  scores?: LifeAreaScore[];
  yesterdayScores?: LifeAreaScore[];
};

export function AreaGallery({ areas, scores = [] }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { entries } = useEntries(200);

  const scoreMap = useMemo(() => {
    const m = new Map<number, LifeAreaScore>();
    for (const s of scores) m.set(s.life_area_id, s);
    return m;
  }, [scores]);

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

  const selectedArea = areas.find((a) => a.id === selectedId) ?? null;

  // Plain list — no ghost clones, no infinite loop.
  const displayList = useMemo(
    () => areas.map((area) => ({ area, isClone: false })),
    [areas],
  );

  // Initialise scroll so the gallery starts at the left edge.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || areas.length === 0) return;
    container.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
  }, [areas]);

  // Helper: smooth-scroll to a specific displayIdx (could be a real or ghost slot).
  const scrollToDisplayIdx = useCallback(
    (displayIdx: number, behavior: ScrollBehavior = "smooth") => {
      const container = scrollRef.current;
      if (!container) return;
      const cardStep = 172 + 12;
      const expandedWidth = 340;
      const containerWidth = container.clientWidth;
      const cardLeft = displayIdx * cardStep;
      const targetScroll = cardLeft - (containerWidth - expandedWidth) / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior });
    },
    [],
  );

  const scrollToCard = useCallback((areaId: number) => {
    requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      const realIdx = areas.findIndex((a) => a.id === areaId);
      if (realIdx === -1) return;
      scrollToDisplayIdx(realIdx, "smooth");
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 540);
    });
  }, [areas, scrollToDisplayIdx]);

  const handleSelect = useCallback((area: LifeArea) => {
    const opening = selectedId !== area.id;
    setSelectedId(opening ? area.id : null);
    if (opening) scrollToCard(area.id);
  }, [selectedId, scrollToCard]);

  // ResizeObserver — re-center the currently selected card (or first real
  // card if none selected) whenever the viewport / container width changes.
  // selectedId is read via ref so the observer is created once per areas
  // change rather than rebuilt on every card click.
  const selectedIdRef = useRef<number | null>(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || areas.length === 0) return;
    let raf = 0;
    const recenter = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sid = selectedIdRef.current;
        const realIdx =
          sid !== null ? areas.findIndex((a) => a.id === sid) : 0;
        if (realIdx === -1) return;
        const cardStep = 172 + 12;
        const expandedWidth = 340;
        const containerWidth = container.clientWidth;
        const cardLeft = realIdx * cardStep;
        const targetScroll = cardLeft - (containerWidth - expandedWidth) / 2;
        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: "instant" as ScrollBehavior,
        });
      });
    };
    const ro = new ResizeObserver(recenter);
    ro.observe(container);
    window.addEventListener("resize", recenter);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recenter);
      cancelAnimationFrame(raf);
    };
  }, [areas]);

  // Keyboard navigation — ArrowLeft/Right, wraps around all 12 areas
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // Only intercept when a card is selected or gallery scroll container is focused
      const inGallery = selectedId !== null || scrollRef.current?.contains(document.activeElement);
      if (!inGallery) return;
      e.preventDefault();
      const currentIdx = selectedId !== null ? areas.findIndex((a) => a.id === selectedId) : -1;
      // Clamp at the ends — no wrap-around. List is finite.
      const nextIdx =
        e.key === "ArrowRight"
          ? Math.min(areas.length - 1, currentIdx + 1)
          : Math.max(0, currentIdx - 1);
      if (nextIdx === currentIdx) return;
      handleSelect(areas[nextIdx]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, areas, handleSelect]);

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Horizontal scroll gallery */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto w-full min-w-0"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          gap: "12px",
          perspective: "1200px",
          paddingTop: "36px",
          paddingBottom: "48px",
        }}
      >
        {displayList.map(({ area, isClone }, idx) => {
          const isActive = selectedId === area.id;
          return (
            <motion.div
              key={`${isClone ? "c" : "r"}-${area.id}-${idx}`}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.4, ease: [0.14, 1, 0.34, 1] }}
              {...(!isClone ? { "data-area-id": area.id } : {})}
              style={{ flexShrink: 0 }}
            >
              <AreaGalleryCard
                area={area}
                score={scoreMap.get(area.id)}
                stat={statMap.get(area.slug) ?? { total: 0, today: 0, lastTs: null }}
                active={isActive}
                dimmed={selectedId !== null && !isActive}
                onClick={() => handleSelect(area)}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Expanded insight panel */}
      {selectedArea && (
        <div ref={panelRef}>
          <AreaInsightPanel
            area={selectedArea}
            score={scoreMap.get(selectedArea.id)}
            stat={statMap.get(selectedArea.slug) ?? { total: 0, today: 0, lastTs: null }}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
