"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Shuffle, ChevronLeft, ChevronRight } from "lucide-react";
import type { Question } from "@/types/db";
import { pickDailyQuestions } from "@/lib/pick";
import { cn } from "@/lib/cn";

// ─── Category color palette ───────────────────────────────────────────────────
type ColorSet = { glow: string; border: string; label: string; dot: string; num: string };

const CATEGORY_COLOR: Record<string, ColorSet> = {
  emotion:      { glow: "shadow-rose-500/10",    border: "border-rose-500/25",    label: "text-rose-400",   dot: "bg-rose-500",    num: "text-rose-500/30"    },
  mind:         { glow: "shadow-indigo-500/10",  border: "border-indigo-500/25",  label: "text-indigo-400", dot: "bg-indigo-500",  num: "text-indigo-500/30"  },
  body:         { glow: "shadow-emerald-500/10", border: "border-emerald-500/25", label: "text-emerald-400",dot: "bg-emerald-500", num: "text-emerald-500/30" },
  shadow:       { glow: "shadow-purple-500/10",  border: "border-purple-500/25",  label: "text-purple-400", dot: "bg-purple-500",  num: "text-purple-500/30"  },
  work:         { glow: "shadow-amber-500/10",   border: "border-amber-500/25",   label: "text-amber-400",  dot: "bg-amber-500",   num: "text-amber-500/30"   },
  productivity: { glow: "shadow-amber-500/10",   border: "border-amber-500/25",   label: "text-amber-400",  dot: "bg-amber-500",   num: "text-amber-500/30"   },
  energy:       { glow: "shadow-orange-500/10",  border: "border-orange-500/25",  label: "text-orange-400", dot: "bg-orange-500",  num: "text-orange-500/30"  },
  social:       { glow: "shadow-cyan-500/10",    border: "border-cyan-500/25",    label: "text-cyan-400",   dot: "bg-cyan-500",    num: "text-cyan-500/30"    },
  discipline:   { glow: "shadow-yellow-500/10",  border: "border-yellow-500/25",  label: "text-yellow-400", dot: "bg-yellow-500",  num: "text-yellow-500/30"  },
  goals:        { glow: "shadow-violet-500/10",  border: "border-violet-500/25",  label: "text-violet-400", dot: "bg-violet-500",  num: "text-violet-500/30"  },
  meaning:      { glow: "shadow-violet-500/10",  border: "border-violet-500/25",  label: "text-violet-400", dot: "bg-violet-500",  num: "text-violet-500/30"  },
  creativity:   { glow: "shadow-pink-500/10",    border: "border-pink-500/25",    label: "text-pink-400",   dot: "bg-pink-500",    num: "text-pink-500/30"    },
  relationships:{ glow: "shadow-cyan-500/10",    border: "border-cyan-500/25",    label: "text-cyan-400",   dot: "bg-cyan-500",    num: "text-cyan-500/30"    },
  state:        { glow: "shadow-[var(--accent-warm)]/10", border: "border-[var(--accent-warm)]/30", label: "text-[var(--accent-warm)]", dot: "bg-[var(--accent-warm)]", num: "text-[var(--accent-warm)]/20" },
};

const DEFAULT_COLOR: ColorSet = {
  glow:   "shadow-zinc-500/10",
  border: "border-zinc-700/40",
  label:  "text-zinc-400",
  dot:    "bg-zinc-500",
  num:    "text-zinc-700",
};

function colorFor(category: string | null | undefined): ColorSet {
  return CATEGORY_COLOR[(category ?? "").toLowerCase()] ?? DEFAULT_COLOR;
}

function depthDots(depth: number | null | undefined, dot: string) {
  const d = Math.min(Math.max(depth ?? 1, 1), 3);
  return (
    <span className="inline-flex gap-0.5 items-center" aria-label={`depth ${d}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("h-1 w-1 rounded-full", i <= d ? dot : "bg-zinc-800")}
        />
      ))}
    </span>
  );
}

export function TodayQuestions({ questions }: { questions: Question[] }) {
  const [shuffle, setShuffle] = useState(0);
  const [count, setCount] = useState(5);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const today = new Date().toISOString().slice(0, 10);
  const seed = `${today}::${shuffle}`;
  const picks = useMemo(
    () => pickDailyQuestions(questions, count, seed),
    [questions, seed, count],
  );

  // Reset active index when picks change.
  useEffect(() => setActive(0), [picks]);

  function openCheckIn() {
    window.dispatchEvent(new CustomEvent("shadow:check-in:open"));
  }

  function prev() {
    setActive((a) => Math.max(0, a - 1));
  }

  function next() {
    setActive((a) => Math.min(picks.length - 1, a + 1));
  }

  if (!mounted) {
    return <div className="h-48 rounded-xl skeleton" aria-hidden />;
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--accent-warm)]">
            Today's {count} questions
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Shadow picks these per day. Answer in the check-in to feed your state and life circle.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {[3, 5, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={
                count === n
                  ? "rounded-md bg-[var(--accent-warm)] text-black px-2 py-1 text-[11px] font-medium"
                  : "rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-100"
              }
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShuffle((s) => s + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-100"
          >
            <Shuffle size={12} /> shuffle
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Scroll container */}
        <div
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {picks.map((q, i) => {
            const c = colorFor(q.category);
            const isActive = i === active;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "snap-start flex-shrink-0 w-72 md:w-80 rounded-xl border text-left",
                  "relative overflow-hidden transition-all duration-300 cursor-pointer",
                  "p-4 flex flex-col gap-3",
                  isActive
                    ? cn("shadow-lg", c.glow, c.border, "scale-[1.02]")
                    : "border-zinc-800/60 bg-[var(--bg-elev2)] opacity-60 hover:opacity-80 scale-100",
                  isActive ? "bg-[var(--bg-elev2)]" : "",
                )}
              >
                {/* Active glow strip */}
                {isActive && (
                  <div
                    aria-hidden
                    className={cn(
                      "absolute inset-y-0 left-0 w-0.5 rounded-full",
                      c.dot,
                    )}
                  />
                )}

                {/* Number + category */}
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    "font-[family-name:var(--font-fraunces)] text-4xl leading-none select-none",
                    c.num,
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("text-[10px] uppercase tracking-[0.2em]", c.label)}>
                      {q.category ?? "trace"}
                    </span>
                    {depthDots(q.emotional_depth, c.dot)}
                  </div>
                </div>

                {/* Question text */}
                <p className={cn(
                  "text-sm leading-relaxed flex-1",
                  isActive ? "text-zinc-100" : "text-zinc-400",
                )}>
                  {q.text}
                </p>

                {/* Bottom meta */}
                <div className="flex items-center gap-1.5">
                  {q.time_of_day && q.time_of_day !== "any" && (
                    <span className="rounded-sm border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600">
                      {q.time_of_day}
                    </span>
                  )}
                  {q.is_state_question && (
                    <span className={cn("rounded-sm border px-1.5 py-0.5 text-[10px]", c.border, c.label)}>
                      state
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Prev / Next controls */}
        <div className="flex items-center justify-between mt-3">
          {/* Dot indicators */}
          <div className="flex gap-1.5 items-center">
            {picks.map((q, i) => {
              const c = colorFor(q.category);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Question ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    i === active
                      ? cn("h-1.5 w-4", c.dot)
                      : "h-1.5 w-1.5 bg-zinc-700 hover:bg-zinc-500",
                  )}
                />
              );
            })}
          </div>

          {/* Arrow buttons */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={prev}
              disabled={active === 0}
              aria-label="Previous"
              className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:text-zinc-100 disabled:opacity-20 transition-opacity"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={active === picks.length - 1}
              aria-label="Next"
              className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:text-zinc-100 disabled:opacity-20 transition-opacity"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Start CTA */}
      <button
        type="button"
        onClick={openCheckIn}
        className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-warm)] text-black px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        <Sparkles size={14} /> Start check-in
      </button>
    </div>
  );
}
