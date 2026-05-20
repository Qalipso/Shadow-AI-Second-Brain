"use client";

import { useMemo, useState } from "react";
import { Pencil, Shuffle } from "lucide-react";

// Guided capture prompts. Hardcoded for MVP; later sourced from question_bank.
// Selecting one fires shadow:inbox:prompt — Composer listens, prefills, focuses.

const POOL: Array<{ id: string; title: string; hint: string }> = [
  {
    id: "head",
    title: "Describe what is taking the most space in your head.",
    hint: "Thought, worry, idea, or pattern.",
  },
  {
    id: "event",
    title: "Log one thing that happened today.",
    hint: "Event, conversation, decision, or moment.",
  },
  {
    id: "body",
    title: "Write about your energy, mood, or body.",
    hint: "How you actually feel right now.",
  },
  {
    id: "avoid",
    title: "What did you avoid today, and why?",
    hint: "Tasks, people, feelings — anything you postponed.",
  },
  {
    id: "money",
    title: "Note any money in or out today.",
    hint: "Expense, income, decision, or worry.",
  },
  {
    id: "alive",
    title: "Which life area felt most alive today?",
    hint: "Work, social, creativity, body, etc.",
  },
  {
    id: "intent",
    title: "What is the one thing that must happen today?",
    hint: "Single priority, the rest can wait.",
  },
  {
    id: "food",
    title: "What did you eat and how did it land?",
    hint: "Meals, snacks, energy after.",
  },
];

function pickThree(seed: number): typeof POOL {
  const arr = [...POOL];
  // Fisher-Yates with a seeded LCG for stable per-day rotation.
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}

function todaySeed(): number {
  const d = new Date();
  return (
    d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  );
}

export function InboxPrompts() {
  const [seed, setSeed] = useState<number>(() => todaySeed());
  const prompts = useMemo(() => pickThree(seed), [seed]);

  function choose(title: string) {
    window.dispatchEvent(
      new CustomEvent("shadow:inbox:prompt", { detail: { text: title } }),
    );
    // Smooth scroll the composer into view (it lives above the filter chips).
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(
        'textarea[aria-label="Capture entry"]',
      );
      ta?.focus();
      ta?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev1)] px-5 py-4 anim-fade-up">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--accent-warm)]">
            Choose what to capture
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Questions help Shadow understand what you may not know how to say.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-100 hover:bg-[var(--bg-elev2)]"
          aria-label="Shuffle prompts"
        >
          <Shuffle size={12} /> shuffle
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {prompts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => choose(p.title)}
            className="card-hover rounded-lg border border-[var(--border)] bg-[var(--bg-elev2)] px-3 py-3 text-left"
          >
            <p className="text-sm text-zinc-100 leading-snug">{p.title}</p>
            <p className="text-[10px] text-zinc-500 mt-1.5">{p.hint}</p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => choose("")}
          className="rounded-lg border border-dashed border-[var(--accent-warm)]/40 bg-transparent px-3 py-3 text-left hover:bg-[var(--bg-elev2)]"
        >
          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--accent-warm)]">
            <Pencil size={12} /> Write my own
          </span>
          <p className="text-[10px] text-zinc-500 mt-1.5">
            Anything: thought, task, feeling, expense, idea.
          </p>
        </button>
      </div>
    </div>
  );
}
