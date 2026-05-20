"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type AIQuestion = {
  id: string;
  question_text: string;
  question_type: string;
};

export type AIQuestionBlockProps = {
  question: AIQuestion;
  onAnswer: (questionId: string, answer: string) => void;
  onSkip: (questionId: string) => void;
  onDismiss: (questionId: string) => void;
  compact?: boolean;
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  reflection: "Reflection",
  clarification: "Clarification",
  pattern_check: "Pattern Check",
  future_intent: "Future Intent",
  values_probe: "Values",
  emotional_check: "Emotional Check",
  open: "Open",
};

function formatQuestionType(type: string): string {
  return (
    QUESTION_TYPE_LABELS[type] ??
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function AIQuestionBlock({
  question,
  onAnswer,
  onSkip,
  onDismiss,
  compact = false,
}: AIQuestionBlockProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAnswer() {
    const trimmed = answer.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAnswer(question.id, trimmed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-[rgba(20,20,27,0.9)] backdrop-blur-sm",
        compact ? "px-3 py-2.5" : "px-4 py-4",
        "space-y-3",
      )}
    >
      {/* Label */}
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
        Shadow wants to understand you better
      </p>

      {/* Type badge */}
      <span className="inline-block rounded-full bg-[var(--accent-warm)]/10 px-2 py-0.5 text-[10px] text-[var(--accent-warm)] tracking-wide">
        {formatQuestionType(question.question_type)}
      </span>

      {/* Question text */}
      <p
        className={cn(
          "text-zinc-100 leading-relaxed",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {question.question_text}
      </p>

      {/* Answer input */}
      {compact ? (
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAnswer();
          }}
          placeholder="Your answer…"
          disabled={submitting}
          className="w-full rounded-md border border-zinc-800 bg-[var(--bg-elev2)] px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--accent-warm)] disabled:opacity-50"
        />
      ) : (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer…"
          rows={3}
          disabled={submitting}
          className="w-full rounded-md border border-zinc-800 bg-[var(--bg-elev2)] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--accent-warm)] resize-none disabled:opacity-50"
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDismiss(question.id)}
          className="rounded-md border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => onSkip(question.id)}
          className="rounded-md border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleAnswer}
          disabled={!answer.trim() || submitting}
          className="ml-auto rounded-md bg-[var(--accent-warm)] text-black px-3 py-1 text-[11px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {submitting ? "Saving…" : "Answer"}
        </button>
      </div>
    </div>
  );
}
