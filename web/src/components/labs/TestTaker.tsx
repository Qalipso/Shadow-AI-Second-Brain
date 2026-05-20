"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LabsQuestion, LabsAnswerOption } from "@/types/db";

type QuestionWithOptions = LabsQuestion & { answer_options: LabsAnswerOption[] };

type TestTakerProps = {
  testSlug: string;
  testTitle: string;
  questions: QuestionWithOptions[];
  sessionId: string;
  startedAt: string;
};

// Red (1) → orange (2) → yellow (3) → lime (4) → neon green (5)
const VALUE_COLORS: Record<number, string> = {
  1: "#FF3B3B",
  2: "#FF8C42",
  3: "#F0C040",
  4: "#6BCB77",
  5: "#39FF6A",
};

function getValueColor(value: number): string {
  return VALUE_COLORS[value] ?? "#6D7BFF";
}

function ScaleNode({
  opt,
  isSelected,
  onSelect,
  totalOptions,
}: {
  opt: LabsAnswerOption;
  isSelected: boolean;
  onSelect: () => void;
  totalOptions: number;
}) {
  const [hovered, setHovered] = useState(false);
  const color = getValueColor(opt.value);
  const active = isSelected || hovered;

  return (
    <div className="relative flex flex-col items-center flex-1" style={{ zIndex: 1 }}>
      {/* Tooltip */}
      <div
        className="absolute pointer-events-none transition-all duration-150"
        style={{
          bottom: "calc(100% + 10px)",
          left: "50%",
          opacity: active ? 1 : 0,
          transform: `translateX(-50%) translateY(${active ? "0px" : "4px"})`,
          whiteSpace: "nowrap",
          padding: "3px 10px",
          borderRadius: "6px",
          fontSize: "10px",
          background: "rgba(14,14,20,0.95)",
          border: `1px solid ${active && isSelected ? color + "50" : "rgba(255,255,255,0.08)"}`,
          color: isSelected ? color : "rgba(255,255,255,0.5)",
          boxShadow: isSelected ? `0 0 10px ${color}20` : undefined,
        }}
      >
        {opt.label}
      </div>

      {/* Circle */}
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onSelect}
        className="relative flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none"
        style={{
          width: 40,
          height: 40,
          background: isSelected ? `${color}22` : "rgba(255,255,255,0.03)",
          border: `2px solid ${isSelected ? color : hovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
          boxShadow: isSelected
            ? `0 0 28px ${color}70, 0 0 10px ${color}50, inset 0 0 10px ${color}18`
            : hovered
            ? `0 0 10px ${color}30`
            : undefined,
          transform: isSelected ? "scale(1.22)" : hovered ? "scale(1.08)" : "scale(1)",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontFamily: "monospace",
            fontWeight: 500,
            color: isSelected ? color : hovered ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)",
          }}
        >
          {opt.value}
        </span>

        {isSelected && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle at center, ${color}50 0%, transparent 65%)` }}
          />
        )}
      </button>
    </div>
  );
}

export function TestTaker({ testSlug, testTitle, questions, sessionId, startedAt }: TestTakerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = (currentIndex / totalQuestions) * 100;
  const isLast = currentIndex === totalQuestions - 1;
  const hasAnswer = current && answers[current.id] !== undefined;

  const DIMENSION_ACCENTS: Record<string, string> = {
    openness: "#6D7BFF", conscientiousness: "#9B7FFF", extraversion: "#C9A36A",
    agreeableness: "#6FBF8A", neuroticism: "#FF7B7B", autonomy: "#6D7BFF",
    achievement: "#C9A36A", security: "#9B7FFF", creativity: "#FF9B7B",
    stimulation: "#FFB347", connection: "#6FBF8A", care: "#7BC4C4",
    status: "#C9A36A", pleasure: "#FF9B9B", meaning: "#A78BFA",
    energy: "#6FBF8A", emotional_state: "#7BC4C4", recovery: "#9B7FFF",
    cognitive_load: "#6D7BFF", wellbeing: "#A78BFA",
  };
  const dimAccent = DIMENSION_ACCENTS[current?.dimension ?? ""] ?? "#6D7BFF";

  const selectAnswer = useCallback((questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleNext = useCallback(async () => {
    if (!hasAnswer) return;
    if (isLast) {
      await handleSubmit();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [hasAnswer, isLast, answers]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        raw_value: answers[q.id] ?? 3,
        dimension: q.dimension,
        reverse_scored: q.reverse_scored,
        question_text: q.question_text,
      }));

      const res = await fetch(`/api/labs/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, started_at: startedAt }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Submission failed.");
      }

      router.push(`/labs/${testSlug}/results/${sessionId}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }, [questions, answers, sessionId, startedAt, testSlug, router]);

  if (!current) return null;

  const options = [...current.answer_options].sort((a, b) => a.order_index - b.order_index);
  const selected = answers[current.id];

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-zinc-600">{currentIndex + 1} / {totalQuestions}</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em]"
            style={{ color: dimAccent + "90" }}
          >
            {current.dimension.replace(/_/g, " ")}
          </span>
        </div>
        <div className="h-px rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${dimAccent}50, ${dimAccent})`,
              boxShadow: `0 0 6px ${dimAccent}30`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-14 anim-fade-in" key={currentIndex}>
        <p className="text-[20px] font-[family-name:var(--font-fraunces)] leading-relaxed text-zinc-100 mb-12 text-center">
          {current.question_text}
        </p>

        {/* Endpoint labels */}
        <div className="flex justify-between text-[9px] font-mono text-zinc-600 mb-4 px-1">
          <span>{options[0]?.label}</span>
          <span>{options[options.length - 1]?.label}</span>
        </div>

        {/* Scale nodes — no connecting line */}
        <div className="flex items-center">
          {options.map((opt) => (
            <ScaleNode
              key={opt.id}
              opt={opt}
              isSelected={selected === opt.value}
              onSelect={() => selectAnswer(current.id, opt.value)}
              totalOptions={options.length}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[12px] text-[var(--state-danger)] mb-4 text-center">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentIndex === 0 || submitting}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] transition-all",
            "border text-zinc-500 hover:text-zinc-300",
            currentIndex === 0 ? "opacity-20 cursor-not-allowed" : "",
          )}
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "transparent" }}
        >
          <ChevronLeft size={14} /> Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!hasAnswer || submitting}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
            !hasAnswer || submitting ? "opacity-30 cursor-not-allowed" : "hover:brightness-110",
          )}
          style={{
            background: hasAnswer ? "rgba(201,163,106,0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${hasAnswer ? "rgba(201,163,106,0.35)" : "rgba(255,255,255,0.06)"}`,
            color: hasAnswer ? "#C9A36A" : "rgba(255,255,255,0.18)",
            boxShadow: hasAnswer ? "0 0 14px rgba(201,163,106,0.15)" : undefined,
          }}
        >
          {submitting ? (
            <><Loader2 size={14} className="animate-spin" /> Analyzing</>
          ) : isLast ? (
            "Complete"
          ) : (
            <>Continue <ChevronRight size={14} /></>
          )}
        </button>
      </div>
    </div>
  );
}
