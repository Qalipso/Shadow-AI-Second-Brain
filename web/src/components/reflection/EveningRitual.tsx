"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAIN_QUESTIONS, PSYCH_QUESTIONS } from "@/lib/reflection/questions";
import { todayDateString } from "@/lib/reflection/wheel-utils";
import type { DailyWheelScore } from "@/types/db";
import type { GamificationResult } from "@/lib/gamification/points";
import { ReflectionSummary } from "./ReflectionSummary";

// ─── Step machine ─────────────────────────────────────────────────────────────
// 0-11: main questions (12 areas)
// 12: psych transition screen
// 13-15: psych questions (3 extras)
// 16: summary
const STEP_SUMMARY = 16;
const STEP_PSYCH_TRANSITION = 12;

type Answers = Partial<Record<string, number>>;

// ─── Pill score selector ──────────────────────────────────────────────────────
function PillRow({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={[
            "h-9 min-w-[36px] rounded-lg text-[13px] font-medium transition-all px-2",
            value === i
              ? "bg-[var(--accent-warm)] text-black scale-105 shadow-lg"
              : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200",
          ].join(" ")}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(100, Math.round((step / total) * 100));
  return (
    <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-[var(--accent-warm)] rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function EveningRitual() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [existing, setExisting] = useState<DailyWheelScore | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [gamification, setGamification] = useState<GamificationResult | null>(null);

  // Refs to avoid stale closures in event listeners and async callbacks.
  const answersRef = useRef<Answers>({});
  answersRef.current = answers;
  const openModalRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for open event — use ref so handler always calls latest openModal.
  useEffect(() => {
    function handleOpen() {
      void openModalRef.current();
    }
    window.addEventListener("shadow:reflection:open", handleOpen);
    return () => window.removeEventListener("shadow:reflection:open", handleOpen);
  }, []);

  async function openModal() {
    setOpen(true);
    setSaveError(null);
    setGamification(null);

    // mounted check via ref-equivalent: DOM-safe after first render.
    if (typeof window === "undefined") return;
    // Fetch existing row for today
    try {
      const date = todayDateString();
      const res = await fetch(`/api/reflection?date=${date}`);
      if (res.ok) {
        const { data } = await res.json();
        if (data) {
          setExisting(data as DailyWheelScore);
          // Hydrate answers from existing row
          const hydrated: Answers = {};
          const allQ = [...MAIN_QUESTIONS, ...PSYCH_QUESTIONS];
          for (const q of allQ) {
            const v = (data as Record<string, unknown>)[q.slot];
            if (typeof v === "number") hydrated[q.slot] = v;
          }
          setAnswers(hydrated);
          setStep(STEP_SUMMARY); // jump to summary
          return;
        }
      }
    } catch {
      // ignore fetch errors — just show fresh modal
    }
    setStep(0);
    setAnswers({});
    setExisting(null);
  }
  // Keep ref current so the event listener always calls latest version.
  openModalRef.current = openModal;

  function closeModal() {
    setOpen(false);
  }

  function handleAnswer(slot: string, value: number) {
    setAnswers((prev) => ({ ...prev, [slot]: value }));
  }

  function nextStep() {
    setStep((s) => s + 1);
  }

  function prevStep() {
    setStep((s) => Math.max(0, s - 1));
  }

  function skipPsych() {
    setStep(STEP_SUMMARY);
    void saveAnswers();
  }

  async function saveAnswers() {
    setSaving(true);
    setSaveError(null);
    try {
      const date = todayDateString();
      // Use ref to avoid stale closure when called from batched state updates.
      const currentAnswers = answersRef.current;
      const res = await fetch("/api/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scored_date: date, scores: currentAnswers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setSaveError("Sign in to save your reflection.");
        } else {
          setSaveError((body as { error?: string }).error ?? "Save failed.");
        }
      } else {
        const { data, gamification: gam } = await res.json();
        if (data) setExisting(data as DailyWheelScore);
        if (gam) setGamification(gam as GamificationResult);
        // Dispatch with reflection data so AreasView can optimistically update
        window.dispatchEvent(
          new CustomEvent("shadow:reflection:saved", {
            detail: { reflection: data, gamification: gam ?? null },
          }),
        );
        router.refresh();
      }
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleContinue() {
    if (step < 11) {
      nextStep();
      return;
    }
    if (step === 11) {
      // End of main questions → psych transition
      setStep(STEP_PSYCH_TRANSITION);
      return;
    }
    if (step === STEP_PSYCH_TRANSITION) {
      // Skip psych
      setStep(STEP_SUMMARY);
      void saveAnswers();
      return;
    }
    if (step >= 13 && step <= 15) {
      if (step < 15) {
        nextStep();
      } else {
        setStep(STEP_SUMMARY);
        void saveAnswers();
      }
      return;
    }
  }

  function handleContinueToPsych() {
    setStep(13); // first psych question
  }

  if (!open) return null;

  // ── Render summary ───────────────────────────────────────────────────────
  if (step === STEP_SUMMARY) {
    return (
      <Modal onClose={closeModal}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Evening Ritual</span>
          <button onClick={closeModal} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>
        {saveError && (
          <p className="mb-3 text-[12px] text-red-400 rounded border border-red-800 bg-red-950/30 px-3 py-2">{saveError}</p>
        )}
        <ReflectionSummary
          scores={answers}
          reflection={existing}
          gamification={gamification}
          onEdit={() => setStep(0)}
          onClose={closeModal}
        />
      </Modal>
    );
  }

  // ── Psych transition screen ──────────────────────────────────────────────
  if (step === STEP_PSYCH_TRANSITION) {
    return (
      <Modal onClose={closeModal}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Evening Ritual</span>
          <button onClick={closeModal} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>
        <div className="flex flex-col gap-6 py-4 text-center">
          <p className="font-[family-name:var(--font-fraunces)] text-2xl text-zinc-100 leading-snug">
            Want to go deeper?
          </p>
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            3 more questions — about autonomy, inner noise, and self-compassion.
            <br />Optional, but honest.
          </p>
          <div className="flex gap-3">
            <button
              onClick={skipPsych}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-[12px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              Skip, finish
            </button>
            <button
              onClick={handleContinueToPsych}
              className="flex-1 rounded-lg bg-[var(--accent-warm)] px-4 py-2.5 text-[12px] text-black font-medium hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Question step ────────────────────────────────────────────────────────
  const isMain = step <= 11;
  const question = isMain ? MAIN_QUESTIONS[step] : PSYCH_QUESTIONS[step - 13];
  if (!question) return null;

  const stepLabel = isMain ? `${step + 1} of 12` : `Extra ${step - 12} of 3`;
  const progressTotal = isMain ? 12 : 3;
  const progressStep = isMain ? step + 1 : step - 12;
  const currentValue = answers[question.slot];
  const isLast = isMain ? step === 11 : step === 15;

  return (
    <Modal onClose={closeModal}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Evening Ritual</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-600">{stepLabel}</span>
          <button onClick={closeModal} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar step={progressStep} total={progressTotal} />

      {/* Question */}
      <div className="mt-8 mb-8">
        <p className="font-[family-name:var(--font-fraunces)] text-xl md:text-2xl text-zinc-100 leading-snug">
          {question.question}
        </p>
      </div>

      {/* Pill selector */}
      <PillRow value={currentValue} onChange={(v) => handleAnswer(question.slot, v)} />

      {/* Labels */}
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[10px] text-zinc-600">{question.labelMin}</span>
        <span className="text-[10px] text-zinc-600">{question.labelMid}</span>
        <span className="text-[10px] text-zinc-600">{question.labelMax}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-8">
        {step > 0 && (
          <button
            onClick={prevStep}
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-[12px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            Back
          </button>
        )}
        <div className="flex-1" />
        {question.optional && !isLast && (
          <button
            onClick={nextStep}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Skip
          </button>
        )}
        <button
          onClick={handleContinue}
          disabled={currentValue === undefined || saving}
          className="rounded-lg bg-[var(--accent-warm)] px-5 py-2.5 text-[12px] text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : isLast ? "Finish" : "Continue"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full sm:max-w-[560px] max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 px-6 py-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
