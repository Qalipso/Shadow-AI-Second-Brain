"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { InterventionType } from "./types";
import { BorderBeam, ShimmerButton, DecryptText } from "@/components/fx";

type Step = {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
};

export type GeneratedResult =
  | {
      kind: "task_shatter";
      whyHeavy: string;
      firstAction: string;
      steps: Step[];
      reward: string;
    }
  | {
      kind: "dopamine_menu";
      mode: string;
      appetizers: Step[];
      entrees: Step[];
      sides: Step[];
    }
  | {
      kind: "context_switch";
      title: string;
      physical: string;
      sensory: string;
      mental: string;
      mantra: string;
      firstAction: string;
    }
  | {
      kind: "interest_filter";
      questName: string;
      theme: string;
      stages: { name: string; action: string; miniReward: string }[];
      finalUnlock: string;
    };

type Status = "draft" | "active" | "completed" | "archived" | "dismissed";

type Props = {
  interventionId: string;
  type: InterventionType;
  inputSummary: string;
  result: GeneratedResult;
  initialStatus?: Status;
  onRegenerate: () => void;
  onStatusChange?: (s: Status) => void;
  regenerating?: boolean;
};

function Btn({
  variant = "ghost",
  onClick,
  disabled,
  children,
  active,
}: {
  variant?: "primary" | "ghost" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  const base =
    "text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const cls =
    variant === "primary"
      ? "border-[var(--shadow-border-active)] bg-[rgba(214,184,116,0.10)] text-[var(--shadow-gold)] hover:bg-[rgba(214,184,116,0.18)] shadow-[0_0_18px_rgba(214,184,116,0.12)]"
      : variant === "danger"
        ? "border-[rgba(172,82,101,0.4)] bg-[rgba(172,82,101,0.05)] text-[var(--state-danger)] hover:bg-[rgba(172,82,101,0.10)]"
        : `border-[var(--shadow-border)] bg-[rgba(20,20,30,0.4)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)] hover:border-[rgba(180,170,220,0.18)] ${active ? "border-[var(--shadow-border-active)] text-[var(--shadow-gold)]" : ""}`;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(base, cls)}>
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-2">
      {children}
    </p>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    draft: "border-[var(--shadow-border)] text-[var(--shadow-text-faint)]",
    active: "border-[var(--shadow-border-active)] text-[var(--shadow-gold)] shadow-[0_0_14px_rgba(214,184,116,0.18)]",
    completed: "border-[rgba(113,179,139,0.45)] text-[rgba(143,209,169,0.95)]",
    archived: "border-[rgba(126,87,194,0.40)] text-[rgba(168,140,210,0.90)]",
    dismissed: "border-[var(--shadow-border)] text-[var(--shadow-text-faint)]",
  };
  return (
    <span
      className={cn(
        "text-[9px] uppercase tracking-[0.28em] px-2 py-1 rounded border",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

// Step row with optional checkbox selection
function StepRow({
  step,
  selectable,
  selected,
  onToggle,
}: {
  step: Step;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      {selectable ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          className={cn(
            "mt-1 w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition-all",
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
      ) : (
        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--shadow-gold)] opacity-60 shrink-0" />
      )}
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

// Collect all addressable steps from a result for selection / conversion.
function collectSteps(result: GeneratedResult): Step[] {
  switch (result.kind) {
    case "task_shatter":
      return result.steps;
    case "dopamine_menu":
      return [...result.appetizers, ...result.entrees, ...result.sides];
    case "interest_filter":
      return result.stages.map((s, i) => ({
        id: `stage-${i + 1}`,
        title: s.name,
        description: s.action,
      }));
    case "context_switch":
      return [
        { id: "first", title: result.firstAction, description: "" },
      ];
  }
}

function firstActionOf(result: GeneratedResult): string {
  switch (result.kind) {
    case "task_shatter":
      return result.firstAction;
    case "context_switch":
      return result.firstAction;
    case "dopamine_menu":
      return result.appetizers[0]?.title ?? "Pick an appetizer.";
    case "interest_filter":
      return result.stages[0]?.action ?? "Begin the quest.";
  }
}

export function ResultCard({
  interventionId,
  type,
  inputSummary,
  result,
  initialStatus = "draft",
  onRegenerate,
  onStatusChange,
  regenerating,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [savedMemory, setSavedMemory] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConvert, setShowConvert] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel pending close-and-redirect timer if component unmounts.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const allSteps = useMemo(() => collectSteps(result), [result]);
  const firstAction = useMemo(() => firstActionOf(result), [result]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setStatusBoth = (s: Status) => {
    setStatus(s);
    onStatusChange?.(s);
  };

  const patchStatus = async (next: Status) => {
    setBusy("status");
    try {
      const r = await fetch(`/api/interventions/${interventionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) throw new Error("Status update failed.");
      const j = (await r.json().catch(() => ({}))) as {
        intervention?: { status?: Status };
      };
      const persisted = j.intervention?.status ?? next;
      setStatusBoth(persisted);
      setMsg(`Marked as ${persisted}. Logged to your journal.`);

      // Closing lifecycle states fade out and return to the list.
      if (persisted === "completed" || persisted === "archived" || persisted === "dismissed") {
        setClosing(true);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          router.push("/interventions");
          router.refresh();
        }, 900);
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onSaveMemory = async () => {
    setBusy("memory");
    try {
      const r = await fetch(`/api/interventions/${interventionId}/save-memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error("Save failed.");
      setSavedMemory(true);
      setMsg("Pattern saved to memory.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const convert = async (
    scope: "first" | "selected" | "all",
    addToToday: boolean,
  ) => {
    setBusy("convert");
    try {
      const body: Record<string, unknown> = { scope, addToToday };
      if (scope === "selected") body.stepIds = [...selected];
      const r = await fetch(`/api/interventions/${interventionId}/to-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Convert failed.");
      }
      const j = (await r.json()) as { inserted: number };
      setMsg(
        `Added ${j.inserted} step${j.inserted === 1 ? "" : "s"} to ${addToToday ? "today" : "inbox"}.`,
      );
      setShowConvert(false);
      setSelected(new Set());
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const TYPE_LABEL: Record<InterventionType, string> = {
    task_shatter: "Task Paralysis Shatter",
    dopamine_menu: "Dopamine Menu",
    context_switch: "Context Switch",
    interest_filter: "Interest Quest",
  };

  const canSelect =
    result.kind === "task_shatter" ||
    result.kind === "dopamine_menu" ||
    result.kind === "interest_filter";

  return (
    <section
      className={cn(
        "panel-ambient relative p-6 anim-fade-in transition-all duration-700",
        closing && "opacity-0 -translate-y-2 blur-sm pointer-events-none",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-50"
        style={{
          background:
            "radial-gradient(40% 50% at 100% 0%, rgba(126,87,194,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative space-y-5">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
              {TYPE_LABEL[type]}
            </p>
            <p className="text-sm text-[var(--shadow-text-muted)] mt-1 italic truncate">
              {inputSummary}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={status} />
            <span className="w-2 h-2 rounded-full bg-[var(--shadow-gold)] dot-breathe" />
          </div>
        </header>

        {/* ── ACTION-FIRST HERO ──────────────────────────────────────────── */}
        {status !== "completed" && <div className="panel-bloom-gold relative p-5 overflow-hidden rounded-xl">
          <BorderBeam
            size={180}
            duration={14}
            colorFrom="rgba(214,184,116,0)"
            colorTo="rgba(214,184,116,0.55)"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 80% at 0% 50%, rgba(214,184,116,0.10) 0%, transparent 70%)",
            }}
          />
          <div className="relative space-y-3">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--shadow-gold)]">
              Your next move
            </p>
            <p className="font-[family-name:var(--font-fraunces)] text-xl md:text-2xl text-[var(--shadow-text)] leading-snug">
              {firstAction}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {status === "active" ? (
                <Btn variant="primary" disabled active>
                  Active
                </Btn>
              ) : (
                <ShimmerButton
                  onClick={() => patchStatus("active")}
                  disabled={busy === "status"}
                  aria-label="Start intervention"
                >
                  Start now
                </ShimmerButton>
              )}
              <Btn
                onClick={() => convert("first", true)}
                disabled={busy === "convert"}
              >
                Add to Today
              </Btn>
            </div>
          </div>
        </div>}

        {/* ── Per-type body ─────────────────────────────────────────────── */}
        {result.kind === "task_shatter" && (
          <>
            <div>
              <Label>Why this feels heavy</Label>
              <p className="text-sm text-[var(--shadow-text)] leading-relaxed">
                {result.whyHeavy}
              </p>
            </div>
            <div>
              <Label>Journey {canSelect && <span className="opacity-60">· tap to select</span>}</Label>
              <ul className="rounded-lg bg-[rgba(20,20,30,0.4)] px-4">
                {result.steps.map((s) => (
                  <StepRow
                    key={s.id}
                    step={s}
                    selectable
                    selected={selected.has(s.id)}
                    onToggle={() => toggle(s.id)}
                  />
                ))}
              </ul>
            </div>
            <div>
              <Label>Closing ritual</Label>
              <p className="text-sm text-[var(--shadow-text-muted)] italic leading-relaxed">
                {result.reward}
              </p>
            </div>
          </>
        )}

        {result.kind === "dopamine_menu" && (
          <>
            <div className="rounded-lg bg-[rgba(126,87,194,0.05)] p-3">
              <Label>Mode</Label>
              <p className="text-[var(--shadow-text)] text-sm">{result.mode}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { title: "5 min · Appetizers", items: result.appetizers },
                { title: "20 min · Entrées", items: result.entrees },
                { title: "10 min · Sides", items: result.sides },
              ].map((col) => (
                <div
                  key={col.title}
                  className="rounded-lg bg-[rgba(20,20,30,0.5)] p-3"
                >
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] mb-2">
                    {col.title}
                  </p>
                  <ul>
                    {col.items.map((s) => (
                      <StepRow
                        key={s.id}
                        step={s}
                        selectable
                        selected={selected.has(s.id)}
                        onToggle={() => toggle(s.id)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        {result.kind === "context_switch" && (
          <>
            <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--shadow-text)]">
              <DecryptText text={result.title} duration={1.0} />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { l: "Physical", v: result.physical },
                { l: "Sensory", v: result.sensory },
                { l: "Mental", v: result.mental },
              ].map((b) => (
                <div
                  key={b.l}
                  className="rounded-lg bg-[rgba(20,20,30,0.5)] p-3"
                >
                  <Label>{b.l}</Label>
                  <p className="text-sm text-[var(--shadow-text)] leading-relaxed">
                    {b.v}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-[rgba(28,26,38,0.6)] p-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-1.5">
                Mantra
              </p>
              <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--shadow-text)]">
                &ldquo;{result.mantra}&rdquo;
              </p>
            </div>
          </>
        )}

        {result.kind === "interest_filter" && (() => {
          const stagesDone = result.stages.every((_, i) =>
            selected.has(`stage-${i + 1}`),
          );
          const triumphant = stagesDone || status === "completed";

          return (
            <>
              <div className="relative">
                {triumphant && (
                  <>
                    <span
                      className="quest-sparkle absolute -top-1 left-4 w-1.5 h-1.5 rounded-full bg-[var(--shadow-gold)]"
                      style={{ animationDelay: "0s" }}
                      aria-hidden
                    />
                    <span
                      className="quest-sparkle absolute -top-2 left-32 w-1 h-1 rounded-full bg-[rgba(214,184,116,0.8)]"
                      style={{ animationDelay: "0.7s" }}
                      aria-hidden
                    />
                    <span
                      className="quest-sparkle absolute top-3 right-6 w-1.5 h-1.5 rounded-full bg-[var(--shadow-violet)]"
                      style={{ animationDelay: "1.3s" }}
                      aria-hidden
                    />
                  </>
                )}
                <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
                  Quest · {result.theme}
                </p>
                <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--shadow-text)] mt-1">
                  <DecryptText text={result.questName} duration={1.4} />
                </h3>
              </div>

              {/* Expanded: full stage list. Collapsed: terse summary row. */}
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
                          sel
                            ? "shadow-[0_0_14px_rgba(214,184,116,0.10)]"
                            : "",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(stageId)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-gold)]">
                            {stage.name}
                          </span>
                          <span
                            className={cn(
                              "w-4 h-4 rounded-sm border flex items-center justify-center",
                              sel
                                ? "border-[var(--shadow-gold)] bg-[rgba(214,184,116,0.18)]"
                                : "border-[var(--shadow-border)]",
                            )}
                          >
                            {sel && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2 2 4-4" stroke="rgb(214,184,116)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                        </button>
                        <p className="text-sm text-[var(--shadow-text)] leading-relaxed">
                          {stage.action}
                        </p>
                        <p className="text-xs text-[var(--shadow-text-muted)] italic">
                          Reward: {stage.miniReward}
                        </p>
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
                      <li
                        key={i}
                        className="flex items-center gap-2 text-xs text-[var(--shadow-text-muted)]"
                      >
                        <span className="text-[var(--shadow-gold)] opacity-70">✓</span>
                        <span className="truncate">{stage.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Final unlock — locked/blurred until stages done; shimmers on triumph */}
              <div
                className={cn(
                  "relative rounded-lg p-4 overflow-hidden transition-all duration-700",
                  triumphant
                    ? "panel-bloom-gold quest-shimmer"
                    : "bg-[rgba(126,87,194,0.04)] select-none",
                )}
                aria-hidden={!triumphant}
              >
                <Label>Final unlock</Label>
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
            </>
          );
        })()}

        {/* ── Lifecycle row ─────────────────────────────────────────────── */}
        {status !== "completed" && <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--shadow-border)]">
          <Btn
            onClick={() => patchStatus("completed")}
            disabled={busy === "status"}
          >
            Complete
          </Btn>
          <Btn onClick={onRegenerate} disabled={!!busy || regenerating}>
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Btn>
          <Btn onClick={onSaveMemory} disabled={!!busy || savedMemory}>
            {savedMemory ? "Saved to Memory" : "Save Pattern"}
          </Btn>
          {canSelect && (
            <Btn onClick={() => setShowConvert((v) => !v)} disabled={!!busy}>
              {showConvert ? "Hide options" : "Convert / Add"}
            </Btn>
          )}
          <Btn
            onClick={() => patchStatus("archived")}
            disabled={busy === "status" || status === "archived"}
          >
            Archive
          </Btn>
        </div>}

        {/* ── Conversion drawer ─────────────────────────────────────────── */}
        {showConvert && canSelect && status !== "completed" && (
          <div className="rounded-lg bg-[rgba(20,20,30,0.6)] p-4 space-y-3 anim-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
                Scope · {selected.size} selected of {allSteps.length}
              </p>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-text-muted)]"
              >
                Clear selection
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Btn onClick={() => convert("first", true)} disabled={busy === "convert"}>
                Add first action to Today
              </Btn>
              <Btn
                onClick={() => convert("selected", true)}
                disabled={busy === "convert" || selected.size === 0}
              >
                Add selected to Today
              </Btn>
              <Btn
                onClick={() => convert("selected", false)}
                disabled={busy === "convert" || selected.size === 0}
              >
                Add selected to Inbox
              </Btn>
              <Btn onClick={() => convert("all", false)} disabled={busy === "convert"}>
                Add all to Inbox
              </Btn>
            </div>
          </div>
        )}

        {msg && (
          <p className="text-xs text-[var(--shadow-text-muted)] italic" aria-live="polite">
            {msg}
          </p>
        )}
      </div>
    </section>
  );
}
