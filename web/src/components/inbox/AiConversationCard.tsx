"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X } from "lucide-react";

type AiQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  created_at: string;
};

type Phase = "loading" | "idle" | "typing" | "submitting" | "done" | "empty";

const TYPE_LABELS: Record<string, string> = {
  identity: "who you are",
  motivation: "what drives you",
  friction: "what blocks you",
  pattern: "patterns",
  context: "context",
  reflection: "reflection",
  goal: "goals",
  habit: "habits",
  emotional_state: "emotional state",
};

export function AiConversationCard() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<AiQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-questions?status=pending&limit=1");
        if (!res.ok) { setPhase("empty"); return; }
        const json = await res.json() as { questions: AiQuestion[] };
        if (!json.questions?.length) { setPhase("empty"); return; }
        setQuestion(json.questions[0]!);
        setPhase("idle");
        // Mark as shown
        void fetch(`/api/ai-questions/${json.questions[0]!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "shown" }),
        });
      } catch {
        setPhase("empty");
      }
    }
    void load();
  }, []);

  async function submit() {
    if (!question || !answer.trim()) return;
    setPhase("submitting");
    try {
      await fetch(`/api/ai-questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "answered", answer_text: answer.trim() }),
      });
      setPhase("done");
    } catch {
      setPhase("idle");
    }
  }

  async function dismiss() {
    if (!question) return;
    setPhase("empty");
    void fetch(`/api/ai-questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "snoozed" }),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    }
  }

  if (phase === "loading") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev1)] px-5 py-4 anim-fade-up">
        <div className="h-3 w-1/3 rounded bg-zinc-800 animate-pulse" />
        <div className="mt-3 h-4 w-2/3 rounded bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (phase === "empty") return null;

  if (phase === "done") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev1)] px-5 py-4 anim-fade-up">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--accent-warm)] mb-1">
          Shadow heard you
        </p>
        <p className="text-sm text-zinc-400">
          Answer recorded. Shadow will remember this.
        </p>
      </div>
    );
  }

  const typeLabel = question ? (TYPE_LABELS[question.question_type] ?? "you") : "";

  return (
    <div className="rounded-2xl border border-[var(--accent-warm)]/20 bg-[var(--bg-elev1)] px-5 py-4 anim-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--accent-warm)]">
            Shadow wants to know about {typeLabel}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Answer when ready — or skip for later.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skip question"
          className="text-zinc-600 hover:text-zinc-400 mt-0.5 shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Question */}
      <p className="text-sm text-zinc-100 leading-snug mb-3">
        {question?.question_text}
      </p>

      {/* Answer input */}
      {(phase === "idle" || phase === "typing" || phase === "submitting") && (
        <div
          className="cursor-text rounded-xl border border-[var(--border)] bg-[var(--bg-elev2)] px-3 py-2.5 flex gap-2 items-end"
          onClick={() => { setPhase("typing"); textareaRef.current?.focus(); }}
          role="presentation"
        >
          {phase === "idle" && !answer ? (
            <span className="text-sm text-zinc-600 flex-1 leading-snug py-0.5">
              Type your answer…
            </span>
          ) : (
            <textarea
              ref={textareaRef}
              value={answer}
              autoFocus={phase === "typing"}
              onChange={(e) => {
                setAnswer(e.target.value);
                setPhase("typing");
              }}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Type your answer…"
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none leading-snug"
              disabled={phase === "submitting"}
            />
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void submit(); }}
            disabled={!answer.trim() || phase === "submitting"}
            aria-label="Send answer"
            className="shrink-0 text-[var(--accent-warm)] disabled:text-zinc-700 mb-0.5"
          >
            <Send size={14} />
          </button>
        </div>
      )}

      <p className="text-[10px] text-zinc-700 mt-1.5">⌘↵ to send</p>
    </div>
  );
}
