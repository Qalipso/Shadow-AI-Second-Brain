"use client";

import type { DailyWheelScore } from "@/types/db";
import type { GamificationResult } from "@/lib/gamification/points";
import { LEVEL_THRESHOLDS } from "@/lib/gamification/points";
import { MAIN_QUESTIONS } from "@/lib/reflection/questions";

type Props = {
  scores: Partial<Record<string, number | null>>;
  reflection: DailyWheelScore | null;
  gamification: GamificationResult | null;
  onEdit: () => void;
  onClose: () => void;
};

const ATMOSPHERIC_PHRASES = [
  "The day has been folded away. Shadow holds what you couldn't carry.",
  "Each number is a mirror. Honest reflection is its own kind of rest.",
  "You showed up to yourself. That's rarer than it sounds.",
  "The wheel turns. You've marked where you stand.",
  "Another day witnessed. Not judged — just seen.",
];

function pickPhrase(date: string, avg: number): string {
  const seed =
    date.split("-").reduce((a, b) => a + parseInt(b, 10), 0) + Math.floor(avg);
  return ATMOSPHERIC_PHRASES[seed % ATMOSPHERIC_PHRASES.length];
}

const SLOT_LABELS: Record<string, string> = {
  work: "Work", money: "Money", health: "Health", energy: "Energy",
  food: "Food", mind: "Mind", creativity: "Creativity", social: "Social",
  emotion: "Emotion", discipline: "Discipline", environment: "Environment",
  meaning: "Meaning",
};

// ─── Level progress bar ───────────────────────────────────────────────────────
function LevelBar({ total, level }: { total: number; level: number }) {
  const lo = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const hi = LEVEL_THRESHOLDS[level] ?? null;
  if (hi === null) return null;
  const pct = Math.min(100, Math.round(((total - lo) / (hi - lo)) * 100));
  return (
    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: "var(--accent-warm)" }}
      />
    </div>
  );
}

export function ReflectionSummary({ scores, reflection, gamification, onEdit, onClose }: Props) {
  const today = reflection?.scored_date ?? new Date().toISOString().slice(0, 10);

  const ranked = MAIN_QUESTIONS
    .map((q) => ({ slot: q.slot, score: scores[q.slot] ?? null }))
    .filter((a) => a.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Only show top/bottom split when enough distinct items exist.
  const half = Math.floor(ranked.length / 2);
  const top3 = ranked.slice(0, Math.min(3, half));
  const bottom3 = ranked.slice(-Math.min(3, half)).reverse();
  const avg = ranked.length
    ? ranked.reduce((s, a) => s + (a.score ?? 0), 0) / ranked.length
    : 0;

  const innerNoise = scores["inner_noise"] ?? null;
  const phrase = pickPhrase(today, avg);

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* ── Gamification block ──────────────────────────────────────────── */}
      {gamification && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Level {gamification.level}
              </span>
              <span className="text-[12px] text-zinc-300 font-medium">{gamification.levelName}</span>
              {gamification.leveledUp && (
                <span className="rounded-full bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                  Level Up
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {gamification.streak > 1 && (
                <span className="text-[11px] text-zinc-400">{gamification.streak}d streak</span>
              )}
              {gamification.pointsEarned > 0 && (
                <span
                  className="font-[family-name:var(--font-fraunces)] text-xl"
                  style={{ color: "var(--accent-warm)" }}
                >
                  +{gamification.pointsEarned}
                </span>
              )}
            </div>
          </div>

          {gamification.pointsToNext !== null ? (
            <>
              <LevelBar total={gamification.newTotal} level={gamification.level} />
              <span className="text-[10px] text-zinc-600">
                {gamification.newTotal} pts · {gamification.pointsToNext} to next level
              </span>
            </>
          ) : (
            <span className="text-[10px] text-zinc-500">Max level reached.</span>
          )}
        </div>
      )}

      {/* Atmospheric phrase */}
      <p className="font-[family-name:var(--font-fraunces)] text-xl text-zinc-200 leading-snug">
        {phrase}
      </p>

      {/* Overall score */}
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Average</span>
        <span className="font-[family-name:var(--font-fraunces)] text-3xl text-zinc-100">
          {avg.toFixed(1)}
        </span>
        <span className="text-zinc-600 text-sm">/ 10</span>
      </div>

      {/* Top / Bottom */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Strongest</p>
          <div className="space-y-1">
            {top3.map((a) => (
              <div key={a.slot} className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-zinc-400">{SLOT_LABELS[a.slot] ?? a.slot}</span>
                <span className="text-[13px] text-zinc-100 tabular-nums">{a.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Attention</p>
          <div className="space-y-1">
            {bottom3.map((a) => (
              <div key={a.slot} className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-zinc-400">{SLOT_LABELS[a.slot] ?? a.slot}</span>
                <span className="text-[13px] text-zinc-100 tabular-nums">{a.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inner noise callout */}
      {innerNoise != null && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Inner load today</p>
          <p className="text-zinc-200">
            <span className="font-[family-name:var(--font-fraunces)] text-xl">{innerNoise}</span>
            <span className="text-zinc-600 text-sm"> / 10</span>
            {innerNoise >= 7 && (
              <span className="ml-2 text-[11px] text-zinc-500">— high noise. Be gentle.</span>
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onEdit}
          className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-[12px] text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
        >
          Edit answers
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-lg bg-[var(--accent-warm)] px-4 py-2.5 text-[12px] text-black font-medium hover:opacity-90 transition-opacity"
        >
          Done
        </button>
      </div>
    </div>
  );
}
