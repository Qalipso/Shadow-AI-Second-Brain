"use client";

import { useEffect, useState } from "react";
import { X, Check, ChevronRight, SkipForward } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StateSliders, type StateValues } from "./StateSliders";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PendingQuestion = {
  id: string;
  question_text: string;
};

export type CheckInWizardProps = {
  onClose: () => void;
  pendingQuestion?: PendingQuestion | null;
};

type Habit = { id: string; name: string; description?: string | null };
type Goal = { id: string; title: string; status?: string | null };

const TODAY_FOCUS_OPTIONS = [
  "Complete a specific task",
  "Rest & recover",
  "Understand myself better",
  "Push a project forward",
  "Clear the backlog",
  "Just get through the day",
  "Something else",
] as const;

const TOTAL_STEPS = 7;

const STEP_TITLES = [
  "Current State",
  "Inbox Dump",
  "Today's Focus",
  "Habits",
  "Goals",
  "Insight",
  "Reflection",
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const BTN = {
  primary:
    "flex items-center gap-1.5 rounded-md bg-[var(--accent-warm)] text-black px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity",
  ghost:
    "flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-40 transition-colors",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInWizard({ onClose, pendingQuestion }: CheckInWizardProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Step data
  const [stateValues, setStateValues] = useState<StateValues>({
    energy: 3,
    mood: 3,
    mental_noise: 3,
    body_state: 3,
    focus: 3,
  });
  const [inboxDump, setInboxDump] = useState("");
  const [todayFocus, setTodayFocus] = useState("");
  const [todayFocusCustom, setTodayFocusCustom] = useState("");
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [insightText, setInsightText] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");

  // Remote data
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (!hasSupabaseContext()) return;
    fetch("/api/habits")
      .then((r) => r.json())
      .then((d: { habits?: Habit[] }) => { if (d.habits) setHabits(d.habits); })
      .catch(() => {});
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d: { goals?: Goal[] }) => { if (d.goals) setGoals(d.goals.filter((g) => g.status !== "completed" && g.status !== "archived")); })
      .catch(() => {});
  }, []);

  async function handleFinish() {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        energy: stateValues.energy,
        mood: stateValues.mood,
        mental_noise: stateValues.mental_noise,
        body_state: stateValues.body_state,
        focus: stateValues.focus,
      };
      if (inboxDump.trim()) payload.inbox_dump = inboxDump.trim();
      if (todayFocus) payload.today_focus = todayFocus;
      if (todayFocusCustom.trim()) payload.today_focus_custom = todayFocusCustom.trim();
      if (selectedHabitId) payload.habit_id_today = selectedHabitId;
      if (selectedGoalId) payload.linked_goal_id = selectedGoalId;
      if (insightText.trim()) payload.insight_text = insightText.trim();
      if (pendingQuestion && aiAnswer.trim()) {
        payload.ai_question_id = pendingQuestion.id;
        payload.ai_question_answer = aiAnswer.trim();
      }

      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { checkin_id?: string };
      // Fire-and-forget initiative generation (PBI-25)
      fetch("/api/checkin/generate-initiative", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkin_id: data.checkin_id }),
      }).catch(() => {});
    } catch {
      // best-effort — show done screen regardless
    }
    setSubmitting(false);
    setDone(true);
  }

  function next() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      void handleFinish();
    }
  }

  function skip() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      void handleFinish();
    }
  }

  if (done) {
    return (
      <Modal open onClose={onClose} labelledBy="wizard-done-title" maxWidth={520}>
        <DoneScreen onClose={onClose} />
      </Modal>
    );
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const showSkip = step >= 3; // habits, goals, insight, ai question can be skipped

  return (
    <Modal open onClose={onClose} labelledBy="wizard-step-title" maxWidth={540}>
      {/* Header */}
      <header className="px-6 pt-5 pb-4 border-b border-zinc-800 relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <h2
              id="wizard-step-title"
              className="font-[family-name:var(--font-fraunces)] text-xl mt-0.5 text-zinc-100"
            >
              {STEP_TITLES[step]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 mt-0.5 rounded-md p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-px w-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-[var(--accent-warm)] opacity-70 transition-[width] duration-500 ease-out"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            aria-hidden
          />
        </div>
      </header>

      {/* Body */}
      <div className="px-6 py-5 overflow-y-auto max-h-[52vh] anim-fade-in" key={step}>
        <StepBody
          step={step}
          stateValues={stateValues}
          onStateChange={setStateValues}
          inboxDump={inboxDump}
          onInboxDumpChange={setInboxDump}
          todayFocus={todayFocus}
          onTodayFocusChange={setTodayFocus}
          todayFocusCustom={todayFocusCustom}
          onTodayFocusCustomChange={setTodayFocusCustom}
          habits={habits}
          selectedHabitId={selectedHabitId}
          onHabitSelect={setSelectedHabitId}
          goals={goals}
          selectedGoalId={selectedGoalId}
          onGoalSelect={setSelectedGoalId}
          insightText={insightText}
          onInsightChange={setInsightText}
          pendingQuestion={pendingQuestion ?? null}
          aiAnswer={aiAnswer}
          onAiAnswerChange={setAiAnswer}
        />
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-2">
        {showSkip ? (
          <button type="button" onClick={skip} className={BTN.ghost}>
            <SkipForward size={13} />
            Skip
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={next}
          disabled={submitting}
          className={BTN.primary}
        >
          {submitting ? (
            "Saving..."
          ) : isLastStep ? (
            <>Finish <Check size={14} /></>
          ) : (
            <>Continue <ChevronRight size={14} /></>
          )}
        </button>
      </footer>
    </Modal>
  );
}

// ─── Step body dispatcher ─────────────────────────────────────────────────────

type StepBodyProps = {
  step: number;
  stateValues: StateValues;
  onStateChange: (v: StateValues) => void;
  inboxDump: string;
  onInboxDumpChange: (v: string) => void;
  todayFocus: string;
  onTodayFocusChange: (v: string) => void;
  todayFocusCustom: string;
  onTodayFocusCustomChange: (v: string) => void;
  habits: Habit[];
  selectedHabitId: string | null;
  onHabitSelect: (id: string | null) => void;
  goals: Goal[];
  selectedGoalId: string | null;
  onGoalSelect: (id: string | null) => void;
  insightText: string;
  onInsightChange: (v: string) => void;
  pendingQuestion: PendingQuestion | null;
  aiAnswer: string;
  onAiAnswerChange: (v: string) => void;
};

function StepBody(props: StepBodyProps) {
  switch (props.step) {
    case 0:
      return <StateSliders values={props.stateValues} onChange={props.onStateChange} />;
    case 1:
      return <InboxStep value={props.inboxDump} onChange={props.onInboxDumpChange} />;
    case 2:
      return (
        <FocusStep
          selected={props.todayFocus}
          onSelect={props.onTodayFocusChange}
          custom={props.todayFocusCustom}
          onCustomChange={props.onTodayFocusCustomChange}
        />
      );
    case 3:
      return (
        <HabitsStep
          habits={props.habits}
          selected={props.selectedHabitId}
          onSelect={props.onHabitSelect}
        />
      );
    case 4:
      return (
        <GoalsStep
          goals={props.goals}
          selected={props.selectedGoalId}
          onSelect={props.onGoalSelect}
        />
      );
    case 5:
      return <InsightStep value={props.insightText} onChange={props.onInsightChange} />;
    case 6:
      return (
        <AiQuestionStep
          question={props.pendingQuestion}
          answer={props.aiAnswer}
          onChange={props.onAiAnswerChange}
        />
      );
    default:
      return null;
  }
}

// ─── Individual step components ───────────────────────────────────────────────

function InboxStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">
        What&apos;s on your mind right now? Fragments, lists, feelings — anything goes.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Brain dump here..."
        className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors resize-none"
        autoFocus
      />
    </div>
  );
}

function FocusStep({
  selected,
  onSelect,
  custom,
  onCustomChange,
}: {
  selected: string;
  onSelect: (v: string) => void;
  custom: string;
  onCustomChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">What&apos;s the intention for today?</p>
      <div className="space-y-2">
        {TODAY_FOCUS_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`w-full text-left rounded-md border px-3.5 py-2.5 text-sm transition-colors ${
              selected === opt
                ? "border-[var(--accent-warm)] text-zinc-100 bg-zinc-900"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {selected === "Something else" ? (
        <textarea
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
          rows={2}
          placeholder="Describe your focus for today..."
          className="mt-3 w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors resize-none"
          autoFocus
        />
      ) : null}
    </div>
  );
}

function HabitsStep({
  habits,
  selected,
  onSelect,
}: {
  habits: Habit[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (habits.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4">
        No active habits found. Set up habits to track them here.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">
        Which habit will you protect today?
      </p>
      <div className="space-y-2">
        {habits.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onSelect(selected === h.id ? null : h.id)}
            className={`w-full text-left rounded-md border px-3.5 py-2.5 transition-colors ${
              selected === h.id
                ? "border-[var(--accent-warm)] text-zinc-100 bg-zinc-900"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <span className="text-sm font-medium">{h.name}</span>
            {h.description ? (
              <span className="block text-xs text-zinc-600 mt-0.5 truncate">{h.description}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function GoalsStep({
  goals,
  selected,
  onSelect,
}: {
  goals: Goal[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (goals.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4">
        No active goals found. Add goals to link them to your check-ins.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">
        Which goal does today serve?
      </p>
      <div className="space-y-2">
        {goals.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(selected === g.id ? null : g.id)}
            className={`w-full text-left rounded-md border px-3.5 py-2.5 transition-colors ${
              selected === g.id
                ? "border-[var(--accent-warm)] text-zinc-100 bg-zinc-900"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <span className="text-sm font-medium">{g.title}</span>
            {g.status ? (
              <span className="block text-xs text-zinc-600 mt-0.5 capitalize">{g.status}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function InsightStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">
        One thing worth remembering from today — a realization, a shift, a trace.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Today I noticed..."
        className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors resize-none"
        autoFocus
      />
    </div>
  );
}

function AiQuestionStep({
  question,
  answer,
  onChange,
}: {
  question: PendingQuestion | null;
  answer: string;
  onChange: (v: string) => void;
}) {
  if (!question) {
    return (
      <div className="py-4">
        <p className="text-sm text-zinc-500">
          No pending reflection question. Shadow will generate one after enough data accumulates.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Shadow asks</p>
      <p className="text-base text-zinc-100 leading-relaxed mb-4">{question.question_text}</p>
      <textarea
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Your answer..."
        className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors resize-none"
        autoFocus
      />
    </div>
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────────

function DoneScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(t);
  }, [onClose]);

  const items = [
    "Current state logged",
    "Memory signals captured",
    "Goal context refreshed",
    "Souls streak protected",
  ];

  return (
    <>
      <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-warm)] opacity-80">
          Daily Sync Complete
        </p>
        <h2
          id="wizard-done-title"
          className="font-[family-name:var(--font-fraunces)] text-2xl mt-1 text-zinc-100"
        >
          The day has been heard.
        </h2>
        <p className="text-xs text-zinc-500 mt-1.5">
          Shadow is turning these traces into signals. Check the dashboard to see what surfaces.
        </p>
      </div>
      <div className="px-6 py-5">
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-300">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--accent-warm)] bg-opacity-20 flex items-center justify-center">
                <Check size={10} className="text-[var(--accent-warm)]" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
        <button type="button" onClick={onClose} className={BTN.primary}>
          Close
        </button>
      </div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasSupabaseContext(): boolean {
  return typeof window !== "undefined";
}
