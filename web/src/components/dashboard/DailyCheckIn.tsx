"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { pickDailyQuestions } from "@/lib/pick";
import {
  clearDraft,
  isDismissedToday,
  isCompletedToday,
  loadDraft,
  loadSettings,
  markCompletedToday,
  markDismissedToday,
  saveDraft,
  todayKey,
  type CheckInDraft,
  EMPTY_DRAFT,
} from "@/lib/check-in";
import type { Question } from "@/types/db";

// Centered 5-question check-in. Local-only persistence in Phase 2.3
// (localStorage); DB write lands in Phase 3.4.

const TONE = {
  primary:
    "rounded-md bg-[var(--accent-warm)] text-black px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40",
  ghost:
    "rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-[var(--bg-elev2)] disabled:opacity-40",
};

function copy(open: number) {
  return {
    label: "Daily ritual",
    title: "Gather today",
    subtitle: `${open} small answers. No need to be clear. Fragments are enough.`,
    doneLabel: "Gathered",
    doneTitle: "The day has been heard.",
    doneSub:
      "Shadow will turn these traces into signals. Check the dashboard to see what surfaced.",
    progress: (i: number) => `${Math.min(i + 1, open)} of ${open}`,
  };
}

// Map raw DB values to softer human labels.
function humanCategory(raw: string | null | undefined): string {
  const map: Record<string, string> = {
    emotion: "feeling",
    emotions: "feeling",
    feeling: "feeling",
    work: "work",
    body: "body",
    mind: "mind",
    social: "people",
    relationships: "people",
    finance: "money",
    health: "body",
    energy: "energy",
    rest: "rest",
    sleep: "rest",
    creativity: "spark",
    purpose: "purpose",
    growth: "growth",
    self: "self",
    resistance: "resistance",
    unfinished: "unfinished",
    environment: "space",
  };
  if (!raw) return "trace";
  return map[raw.toLowerCase()] ?? raw.toLowerCase();
}

function humanTimeOfDay(raw: string | null | undefined): string {
  const map: Record<string, string> = {
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",
    any: "any time",
    all: "any time",
  };
  if (!raw) return "any time";
  return map[raw.toLowerCase()] ?? raw.toLowerCase();
}

function humanDepth(d: number | null | undefined): string {
  const n = d ?? 1;
  if (n <= 1) return "surface";
  if (n === 2) return "beneath the surface";
  return "deep";
}

export function DailyCheckIn({
  questions,
  autoOpen = true,
}: {
  questions: Question[];
  autoOpen?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CheckInDraft>(EMPTY_DRAFT);
  const [finished, setFinished] = useState(false);
  const [questionsPerDay, setQuestionsPerDay] = useState(5);

  // Debounce timer for localStorage writes — avoids sync I/O per keystroke.
  const saveTimerRef = useRef<number | null>(null);
  // Ref so the beforeunload flush always has the latest draft without re-registering.
  const draftRef = useRef<CheckInDraft>(EMPTY_DRAFT);

  // Hydrate from localStorage after mount → no SSR mismatch.
  useEffect(() => {
    setMounted(true);
    const settings = loadSettings();
    setQuestionsPerDay(settings.questionsPerDay);
    setDraft(loadDraft());
    if (
      autoOpen &&
      settings.showQuestionsOnFirstOpen &&
      settings.checkinCadence !== "off" &&
      !isCompletedToday() &&
      !isDismissedToday()
    ) {
      setOpen(true);
    }
  }, [autoOpen]);

  // Keep ref current so flush always writes latest draft.
  draftRef.current = draft;

  // Debounced persistence — fires 250ms after last edit.
  useEffect(() => {
    if (!mounted) return;
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveDraft(draftRef.current);
    }, 250);
    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [draft, mounted]);

  // Flush pending save on unmount or before navigation — registered once.
  useEffect(() => {
    function flush() {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveDraft(draftRef.current);
      }
    }
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, []); // intentionally empty — uses refs

  // Daily picks: state questions (mood/energy/stress) always pinned first,
  // then fill remaining slots with weighted-random from non-state questions.
  const seedPick = useMemo<Question[]>(() => {
    if (questions.length === 0) return [];
    const seed = `${todayKey()}#${questionsPerDay}`;
    const stateQs = questions.filter((q) => q.is_state_question === true);
    const nonStateQs = questions.filter((q) => !q.is_state_question);
    const remaining = Math.max(0, questionsPerDay - stateQs.length);
    const picked = pickDailyQuestions(nonStateQs, remaining, seed, draft.replaced);
    return [...stateQs, ...picked];
  }, [questions, draft.replaced, questionsPerDay]);

  // External open trigger.
  useEffect(() => {
    function onExternalOpen() {
      setFinished(false);
      setOpen(true);
    }
    window.addEventListener("shadow:check-in:open", onExternalOpen);
    return () =>
      window.removeEventListener("shadow:check-in:open", onExternalOpen);
  }, []);

  // ─── Render gates (after all hooks, never before) ────────────────────────
  if (!mounted) return null;
  if (seedPick.length === 0) return null;

  const total = seedPick.length;
  const step = Math.min(draft.step, total - 1);
  const current = seedPick[step];
  const value = draft.answers[current.id];
  const isState = current.is_state_question === true;
  const c = copy(total);

  // Functional updates — no stale closures. saveDraft handled by debounce effect.
  function setAnswer(v: string | number) {
    const id = current.id;
    setDraft((prev) => ({
      ...prev,
      answers: { ...prev.answers, [id]: v },
    }));
  }

  function next() {
    if (step + 1 >= total) {
      finishCheckIn();
      return;
    }
    setDraft((prev) => ({ ...prev, step: prev.step + 1 }));
  }

  async function finishCheckIn() {
    markCompletedToday();
    setFinished(true);

    type AnswerPayload =
      | { question_id: number; value_numeric: number }
      | { question_id: number; value_text: string };

    const payload: AnswerPayload[] = [];
    for (const [qid, v] of Object.entries(draft.answers)) {
      const question_id = Number(qid);
      if (typeof v === "number") {
        payload.push({ question_id, value_numeric: v });
        continue;
      }
      if (typeof v === "string") {
        const txt = v.trim();
        if (txt) payload.push({ question_id, value_text: txt });
      }
    }

    if (payload.length > 0) {
      try {
        await fetch("/api/answers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers: payload }),
        });
        window.dispatchEvent(new CustomEvent("shadow:answers:changed"));
      } catch {
        // persist failed — non-critical, answers already in localStorage via draft
      }
    }

    clearDraft();
  }

  function skip() {
    setDraft((prev) =>
      prev.skipped.includes(current.id)
        ? prev
        : { ...prev, skipped: [...prev.skipped, current.id] },
    );
    next();
  }

  function replace() {
    setDraft((prev) =>
      prev.replaced.includes(current.id)
        ? prev
        : { ...prev, replaced: [...prev.replaced, current.id] },
    );
  }

  function close() {
    setOpen(false);
    setFinished(false);
    if (!finished) markDismissedToday();
  }

  const answeredCount = Object.values(draft.answers).filter((v) => {
    if (typeof v === "number") return true;
    return typeof v === "string" && v.trim().length > 0;
  }).length;

  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy="check-in-title"
      describedBy="check-in-subtitle"
    >
      <header className="px-6 pt-6 pb-3 border-b border-[var(--border)] relative overflow-hidden">
        {/* Ambient breath glow — subtle, non-distracting */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--accent-warm)] opacity-[0.04] ritual-breath"
        />

        {!finished ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
              {c.label}
            </p>
            <h2
              id="check-in-title"
              className="font-[family-name:var(--font-fraunces)] text-2xl mt-1"
            >
              {c.title}
            </h2>
            <p
              id="check-in-subtitle"
              className="text-xs text-zinc-500 mt-1.5"
            >
              {c.subtitle}
            </p>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-1.5">
                <span>{c.progress(step)}</span>
                <span>
                  {answeredCount > 0
                    ? `${answeredCount} captured`
                    : ""}
                  {draft.skipped.length > 0
                    ? ` · ${draft.skipped.length} passed`
                    : ""}
                </span>
              </div>
              <div className="h-px w-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-warm)] opacity-60 transition-[width] duration-500 ease-out"
                  style={{ width: `${((step + 1) / total) * 100}%` }}
                  aria-hidden
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--state-success)] opacity-70">
              {c.doneLabel}
            </p>
            <h2
              id="check-in-title"
              className="font-[family-name:var(--font-fraunces)] text-2xl mt-1"
            >
              {c.doneTitle}
            </h2>
            <p className="text-xs text-zinc-500 mt-1.5">{c.doneSub}</p>
          </>
        )}
      </header>

      {!finished ? (
        <div className="px-6 py-5 anim-fade-in">
          <p className="text-zinc-200 leading-relaxed">{current.text}</p>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            <Pill>{humanCategory(current.category)}</Pill>
            <Pill>{humanTimeOfDay(current.time_of_day)}</Pill>
            <Pill>{humanDepth(current.emotional_depth)}</Pill>
            {isState ? (
              <Pill>{current.state_key?.replace(/_/g, " ") ?? "state"}</Pill>
            ) : null}
          </div>

          <div className="mt-4">
            {isState ? (
              <NumericInput
                value={typeof value === "number" ? value : 5}
                onChange={(v) => setAnswer(v)}
              />
            ) : (
              <>
                <CheckInTextarea
                  key={current.id}
                  questionId={current.id}
                  value={typeof value === "string" ? value : ""}
                  onChange={setAnswer}
                />
                <p className="mt-2 text-[11px] text-zinc-700 leading-relaxed">
                  Shadow will turn this into signals later. For now, just leave the trace.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 anim-fade-in">
          <Summary answers={draft.answers} list={seedPick} />
        </div>
      )}

      <footer className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between gap-2">
        {!finished ? (
          <>
            <div className="flex gap-2">
              <button type="button" onClick={skip} className={TONE.ghost}>
                Pass
              </button>
              <button type="button" onClick={replace} className={TONE.ghost}>
                Ask differently
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={close} className={TONE.ghost}>
                Pause
              </button>
              <button type="button" onClick={next} className={TONE.primary}>
                {step + 1 === total ? "Finish" : "Continue"}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={close}
            className={`${TONE.primary} ml-auto`}
          >
            Close
          </button>
        )}
      </footer>
    </Modal>
  );
}

// Textarea that handles IME composition correctly (Cyrillic, CJK, etc.).
// Locks updates to parent during composition so chars aren't dropped mid-IME.
function CheckInTextarea({
  questionId,
  value,
  onChange,
}: {
  questionId: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const composingRef = useRef(false);
  const [local, setLocal] = useState(value);

  // Sync from parent when external value changes (e.g. question swap).
  useEffect(() => {
    setLocal(value);
  }, [value, questionId]);

  return (
    <textarea
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        // Defer parent update until composition is done.
        if (!composingRef.current) onChange(v);
      }}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(e) => {
        composingRef.current = false;
        onChange((e.target as HTMLTextAreaElement).value);
      }}
      rows={4}
      placeholder="Write it as it comes. A phrase, a mess, a list — anything."
      className="w-full rounded-md bg-[var(--bg-elev2)] border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors duration-200 resize-none"
    />
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 tracking-wide">
      {children}
    </span>
  );
}

function NumericInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[11px] text-zinc-600">
        <span>low · high</span>
        <span className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--accent-warm)] leading-none">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent-warm)]"
      />
      <p className="mt-2 text-[11px] text-zinc-700 leading-relaxed">
        Shadow will turn this into signals later. For now, just leave the trace.
      </p>
    </div>
  );
}

function Summary({
  answers,
  list,
}: {
  answers: Record<number, string | number>;
  list: Question[];
}) {
  const filled = list.filter((q) => answers[q.id] !== undefined);
  return (
    <ul className="space-y-2">
      {filled.map((q) => (
        <li
          key={q.id}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elev2)] px-3 py-2.5"
        >
          <p className="text-[11px] text-zinc-600">{q.text}</p>
          <p className="text-sm text-zinc-300 mt-1">
            {String(answers[q.id])}
          </p>
        </li>
      ))}
      {filled.length === 0 ? (
        <p className="text-xs text-zinc-600">
          Nothing captured yet — reopen from the dashboard when ready.
        </p>
      ) : null}
    </ul>
  );
}
