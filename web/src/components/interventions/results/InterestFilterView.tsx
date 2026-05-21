"use client";
import { cn } from "@/lib/cn";
import { DecryptText } from "@/components/fx";

type QuestStage = {
  name: string;
  action: string;
  miniReward: string;
};

export type InterestFilterResult = {
  kind: "interest_filter";
  questName: string;
  theme: string;
  stages: QuestStage[];
  finalUnlock: string;
};

type Status = "draft" | "active" | "completed" | "archived" | "dismissed";

export function InterestFilterView({
  result,
  selected,
  onToggle,
  status,
}: {
  result: InterestFilterResult;
  selected: Set<string>;
  onToggle: (id: string) => void;
  status: Status;
}) {
  const stagesDone = result.stages.every((_, i) => selected.has(`stage-${i + 1}`));
  const triumphant = stagesDone || status === "completed";

  return (
    <div className="space-y-4">
      <div className="relative">
        {triumphant && (
          <>
            <span className="quest-sparkle absolute -top-1 left-4 w-1.5 h-1.5 rounded-full bg-[var(--shadow-gold)]" style={{ animationDelay: "0s" }} aria-hidden />
            <span className="quest-sparkle absolute -top-2 left-32 w-1 h-1 rounded-full bg-[rgba(214,184,116,0.8)]" style={{ animationDelay: "0.7s" }} aria-hidden />
            <span className="quest-sparkle absolute top-3 right-6 w-1.5 h-1.5 rounded-full bg-[var(--shadow-violet)]" style={{ animationDelay: "1.3s" }} aria-hidden />
          </>
        )}
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
          Quest · {result.theme}
        </p>
        <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--shadow-text)] mt-1">
          <DecryptText text={result.questName} duration={1.4} />
        </h3>
      </div>

      {!triumphant ? (
        <ul className="space-y-2">
          {result.stages.map((stage, i) => {
            const stageId = `stage-${i + 1}`;
            const sel = selected.has(stageId);
            return (
              <li
                key={stageId}
                className={cn(
                  "rounded-lg bg-[rgba(20,20,30,0.5)] p-3 space-y-1 transition-all",
                  sel && "shadow-[0_0_14px_rgba(214,184,116,0.10)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggle(stageId)}
                  aria-pressed={sel}
                  className="flex items-center justify-between w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] rounded"
                >
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-gold)]">
                    {stage.name}
                  </span>
                  <span
                    className={cn(
                      "w-4 h-4 rounded-sm border flex items-center justify-center",
                      sel ? "border-[var(--shadow-gold)] bg-[rgba(214,184,116,0.18)]" : "border-[var(--shadow-border)]",
                    )}
                  >
                    {sel && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="rgb(214,184,116)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </button>
                <p className="text-sm text-[var(--shadow-text)] leading-relaxed">{stage.action}</p>
                <p className="text-xs text-[var(--shadow-text-muted)] italic">Reward: {stage.miniReward}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg bg-[rgba(20,20,30,0.4)] p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[rgba(143,209,169,0.9)]">
            Quest complete · {result.stages.length} stages cleared
          </p>
          <ul className="space-y-0.5">
            {result.stages.map((stage, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-[var(--shadow-text-muted)]">
                <span className="text-[var(--shadow-gold)] opacity-70">✓</span>
                <span className="truncate">{stage.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={cn(
          "relative rounded-lg p-4 overflow-hidden transition-all duration-700",
          triumphant ? "panel-bloom-gold quest-shimmer" : "bg-[rgba(126,87,194,0.04)] select-none",
        )}
        aria-hidden={!triumphant}
      >
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-2">
          Final unlock
        </p>
        <p
          className={cn(
            "text-[var(--shadow-text)] leading-relaxed italic transition-all duration-700",
            !triumphant && "blur-md opacity-50",
          )}
        >
          {result.finalUnlock}
        </p>
        {!triumphant && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
            Locked · check off all stages to reveal
          </p>
        )}
      </div>
    </div>
  );
}
