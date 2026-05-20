"use client";

import { useMemo, useState } from "react";
import type { Question } from "@/types/db";

const CATEGORY_HINT: Record<string, string> = {
  state: "Snapshot of mood, energy, stress.",
  intent: "Today’s direction and priorities.",
  reflection: "Deeper look at what surfaced.",
  balance: "Which areas felt alive or neglected.",
  focus: "Where attention landed.",
  energy: "Body, fuel, recovery.",
  emotion: "Feelings, processing, regulation.",
  body: "Sleep, movement, health.",
  food: "What you ate, when, how it landed.",
  money: "Income, spend, financial mood.",
  work: "Output, focus, decisions.",
  creativity: "Making, ideas, expression.",
  relationships: "People and connections.",
  discipline: "Habits and follow-through.",
  meaning: "Purpose, direction, longer arc.",
};

function groupByCategory(qs: Question[]): Record<string, Question[]> {
  const out: Record<string, Question[]> = {};
  for (const q of qs) {
    const key = q.category ?? "uncategorized";
    if (!out[key]) out[key] = [];
    out[key].push(q);
  }
  return out;
}

export function QuestionBank({ questions }: { questions: Question[] }) {
  const grouped = useMemo(() => groupByCategory(questions), [questions]);
  const categories = useMemo(
    () => Object.keys(grouped).sort(),
    [grouped],
  );
  const [filter, setFilter] = useState<string>("all");

  const visible = filter === "all" ? categories : [filter];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          all · {questions.length}
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c}
            active={filter === c}
            onClick={() => setFilter(c)}
          >
            {c} · {grouped[c].length}
          </FilterChip>
        ))}
      </div>

      <div className="space-y-6">
        {visible.map((category) => {
          const list = grouped[category] ?? [];
          return (
            <section key={category}>
              <header className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-300">
                    {category}{" "}
                    <span className="text-zinc-700">· {list.length}</span>
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    {CATEGORY_HINT[category] ?? ""}
                  </p>
                </div>
              </header>
              <div className="space-y-2">
                {list.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-elev2)] px-3 py-2.5"
                  >
                    <p className="text-sm text-zinc-200 leading-snug">
                      {q.text}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Pill>{q.type ?? "open"}</Pill>
                      <Pill>{q.time_of_day ?? "any"}</Pill>
                      <Pill>depth {q.emotional_depth ?? 1}</Pill>
                      {q.is_state_question ? (
                        <Pill tone="accent">
                          state · {q.state_key ?? "?"}
                        </Pill>
                      ) : null}
                      {q.is_active === false ? (
                        <Pill tone="muted">inactive</Pill>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-md bg-[var(--bg-elev2)] border border-[var(--accent-warm)]/40 px-2.5 py-1 text-[11px] text-[var(--accent-warm)]"
          : "rounded-md border border-[var(--border)] px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-[var(--bg-elev2)]"
      }
    >
      {children}
    </button>
  );
}

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent";
}) {
  const klass =
    tone === "accent"
      ? "border-[var(--accent-warm)]/30 text-[var(--accent-warm)]"
      : "border-[var(--border)] text-zinc-500";
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] ${klass}`}>
      {children}
    </span>
  );
}
