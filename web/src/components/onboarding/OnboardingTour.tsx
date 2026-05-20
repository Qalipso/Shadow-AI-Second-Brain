"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Sparkles, Map, ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "shadow:onboarded";

type Step = {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  ctaHref?: string;
};

const STEPS: Step[] = [
  {
    icon: <PenLine size={20} />,
    eyebrow: "Step 1 of 3",
    title: "Drop a thought",
    body: "Shadow is your raw capture layer. Type anything — a feeling, a task, a question. No formatting needed.",
    cta: "Got it",
  },
  {
    icon: <Sparkles size={20} />,
    eyebrow: "Step 2 of 3",
    title: "Watch Shadow tag it",
    body: "After you capture, Shadow's AI reads it and surfaces the type, life area, and emotion — so you don't have to organise manually.",
    cta: "Nice",
  },
  {
    icon: <Map size={20} />,
    eyebrow: "Step 3 of 3",
    title: "Calibrate your Map",
    body: "Your Map shows how each life area is doing. Do a quick Daily Sync now so Shadow has a baseline to work from.",
    cta: "Open Daily Sync",
    ctaHref: "/checkin",
  },
];

export function OnboardingTour() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        setVisible(true);
      }
    } catch {
      // localStorage blocked (SSR guard, private mode, etc.)
    }
  }, []);

  function complete() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setVisible(false);
  }

  function skip() {
    complete();
  }

  function next() {
    const current = STEPS[step];
    if (step === STEPS.length - 1) {
      complete();
      if (current.ctaHref) router.push(current.ctaHref);
    } else {
      setStep((s) => s + 1);
    }
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        aria-hidden
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Getting started with Shadow"
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 sm:p-0"
      >
        <div
          className="relative w-full max-w-sm rounded-2xl border border-white/10 anim-fade-up"
          style={{
            background: "var(--bg-elev2, #18181b)",
            boxShadow: "0 0 48px rgba(201,163,106,0.08), 0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Skip */}
          <button
            onClick={skip}
            aria-label="Skip onboarding"
            className="absolute top-3 right-3 rounded-md p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>

          <div className="px-6 pt-6 pb-5">
            {/* Icon */}
            <div
              className="mb-4 inline-flex items-center justify-center rounded-xl p-2.5"
              style={{
                background: "rgba(201,163,106,0.12)",
                border: "1px solid rgba(201,163,106,0.25)",
                color: "var(--accent-warm)",
              }}
            >
              {current.icon}
            </div>

            {/* Eyebrow */}
            <p
              className="text-[10px] font-mono uppercase tracking-[0.2em] mb-1"
              style={{ color: "var(--accent-warm)" }}
            >
              {current.eyebrow}
            </p>

            {/* Title */}
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-zinc-100 mb-2 leading-snug">
              {current.title}
            </h2>

            {/* Body */}
            <p className="text-sm text-zinc-400 leading-relaxed mb-5">
              {current.body}
            </p>

            {/* Step dots */}
            <div className="flex gap-1.5 mb-5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? "20px" : "6px",
                    height: "6px",
                    background:
                      i === step
                        ? "var(--accent-warm)"
                        : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={next}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
                style={{
                  background: "var(--accent-warm)",
                  color: "#0a0a0c",
                }}
              >
                {current.cta}
                <ArrowRight size={14} />
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={skip}
                  className="px-3 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Skip
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
