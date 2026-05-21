"use client";
import { cn } from "@/lib/cn";

type Step = {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
};

export type TaskShatterResult = {
  kind: "task_shatter";
  whyHeavy: string;
  firstAction: string;
  steps: Step[];
  reward: string;
};

function StepRow({
  step,
  selected,
  onToggle,
}: {
  step: Step;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={`${selected ? "Deselect" : "Select"} step: ${step.title}`}
        className={cn(
          "mt-1 w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)]",
          selected
            ? "border-[var(--shadow-gold)] bg-[rgba(214,184,116,0.18)]"
            : "border-[var(--shadow-border)] bg-transparent hover:border-[rgba(180,170,220,0.30)]",
        )}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="rgb(214,184,116)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--shadow-text)]">{step.title}</p>
        {step.description && (
          <p className="text-xs text-[var(--shadow-text-muted)] mt-0.5 leading-relaxed">
            {step.description}
          </p>
        )}
      </div>
      {step.estimatedMinutes != null && (
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--shadow-text-faint)] shrink-0">
          {step.estimatedMinutes}m
        </span>
      )}
    </li>
  );
}

export function TaskShatterView({
  result,
  selected,
  onToggle,
}: {
  result: TaskShatterResult;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-1.5">
          Why this feels heavy
        </p>
        <p className="text-sm text-[var(--shadow-text)] leading-relaxed">
          {result.whyHeavy}
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-1.5">
          Journey <span className="opacity-60">· tap to select</span>
        </p>
        <ul className="rounded-lg bg-[rgba(20,20,30,0.4)] px-4">
          {result.steps.map((s) => (
            <StepRow
              key={s.id}
              step={s}
              selected={selected.has(s.id)}
              onToggle={() => onToggle(s.id)}
            />
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-1.5">
          Closing ritual
        </p>
        <p className="text-sm text-[var(--shadow-text-muted)] italic leading-relaxed">
          {result.reward}
        </p>
      </div>
    </div>
  );
}
