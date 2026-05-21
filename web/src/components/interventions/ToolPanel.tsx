"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { type InterventionType, TOOL_LABELS } from "./types";
import { useInterventionState } from "./stateStore";
import { StateInputPanel } from "./StateInputPanel";
import { ShadowLoader } from "./ShadowLoader";
import { ResultView, collectSteps, firstActionOf, type GeneratedResult, type Status } from "./results/ResultView";
import { StatusActions } from "./results/StatusActions";
import { MemoryActions } from "./results/MemoryActions";
import { ConversionActions } from "./results/ConversionActions";
import { BorderBeam, ShimmerButton } from "@/components/fx";

type FormState = {
  task: string;
  notes: string;
  finished: string;
  next: string;
  interest: string;
  intent: string;
};

const EMPTY_FORM: FormState = {
  task: "",
  notes: "",
  finished: "",
  next: "",
  interest: "",
  intent: "",
};

const FIELD_LABEL =
  "text-[10px] uppercase tracking-[0.24em] text-[var(--shadow-text-faint)] mb-1.5 block";
const FIELD_INPUT =
  "w-full rounded-md border border-[var(--shadow-border)] bg-[rgba(20,20,30,0.5)] px-3 py-2.5 text-sm text-[var(--shadow-text)] placeholder:text-[var(--shadow-text-faint)] focus:outline-none focus:border-[var(--shadow-border-active)] focus:ring-1 focus:ring-[rgba(214,184,116,0.20)]";

function inputToForm(type: InterventionType, ui: Record<string, unknown>): FormState {
  const next = { ...EMPTY_FORM };
  if (type === "task_shatter") {
    next.task = String(ui.task ?? "");
    next.notes = String(ui.notes ?? "");
  } else if (type === "dopamine_menu") {
    next.intent = String(ui.intent ?? "");
  } else if (type === "context_switch") {
    next.finished = String(ui.finished ?? "");
    next.next = String(ui.next ?? "");
  } else if (type === "interest_filter") {
    next.task = String(ui.task ?? "");
    next.interest = String(ui.interest ?? "");
  }
  return next;
}

export function ToolPanel({ type }: { type: InterventionType }) {
  const router = useRouter();
  const params = useSearchParams();
  const idFromUrl = params.get("id");
  const isNew = params.get("new") === "1";
  const isFork = params.get("fork") === "1";
  const isReplace = params.get("replace") === "1";
  const meta = TOOL_LABELS[type];

  const { state } = useInterventionState();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [regen, setRegen] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [interventionId, setInterventionId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [savedMemory, setSavedMemory] = useState(false);
  const [status, setStatus] = useState<Status>("draft");
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Hydrate from URL ?id= — also handles ?fork=1 and ?replace=1 (pre-fill form only)
  useEffect(() => {
    // ?new=1 and no id: clean URL, stay blank
    if (isNew && !idFromUrl) {
      router.replace(`/interventions/${meta.slug}`, { scroll: false });
      return;
    }
    if (!idFromUrl) return;

    let cancelled = false;
    async function hydrate() {
      setHydrating(true);
      try {
        const r = await fetch(`/api/interventions/${idFromUrl}`);
        if (!r.ok) return;
        const j = (await r.json()) as {
          intervention: {
            id: string;
            type: InterventionType;
            user_input: Record<string, unknown>;
            result_json: unknown;
            status: Status;
            saved_to_memory: boolean;
          };
        };
        if (cancelled || j.intervention.type !== type) return;
        setForm(inputToForm(type, j.intervention.user_input));

        if (isFork || isReplace) {
          // Fork/replace: pre-fill form but do NOT load result — user regenerates fresh
          if (isReplace) setReplacingId(j.intervention.id);
          // Clean the flag params from URL (keep id for reference until generate)
          router.replace(`/interventions/${meta.slug}?id=${idFromUrl}`, { scroll: false });
        } else {
          // Normal load: show existing result
          setResult(j.intervention.result_json as GeneratedResult);
          setInterventionId(j.intervention.id);
          setStatus(j.intervention.status);
          setSavedMemory(j.intervention.saved_to_memory);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }
    hydrate();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFromUrl, isNew, isFork, isReplace, type]);

  const update = (k: keyof FormState, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const buildInput = (): Record<string, string> => {
    switch (type) {
      case "task_shatter":
        return form.notes ? { task: form.task, notes: form.notes } : { task: form.task };
      case "dopamine_menu":
        return form.intent ? { intent: form.intent } : {};
      case "context_switch":
        return { finished: form.finished, next: form.next };
      case "interest_filter":
        return { task: form.task, interest: form.interest };
    }
  };

  const validate = (): string | null => {
    switch (type) {
      case "task_shatter":
        if (form.task.trim().length < 2) return "Enter the task you feel stuck on.";
        return null;
      case "dopamine_menu":
        return null;
      case "context_switch":
        if (!form.finished.trim()) return "What did you just finish?";
        if (!form.next.trim()) return "What's next?";
        return null;
      case "interest_filter":
        if (form.task.trim().length < 2) return "Enter the boring task.";
        if (form.interest.trim().length < 2) return "Enter a current interest or theme.";
        return null;
    }
  };

  const generate = async (isRegen = false) => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    if (isRegen) setRegen(true); else setLoading(true);

    try {
      const res = await fetch("/api/interventions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          energyLevel: state.energy,
          mood: state.mood,
          friction: state.friction,
          input: buildInput(),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { intervention: { id: string }; result: GeneratedResult };

      // If replacing an existing intervention, archive the old one
      if (replacingId) {
        fetch(`/api/interventions/${replacingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "archived" }),
        }).catch(() => {});
        setReplacingId(null);
      }

      setResult(data.result);
      setInterventionId(data.intervention.id);
      setSavedMemory(false);
      setStatus("draft");
      setSelected(new Set());
      setMsg(null);
      router.replace(`/interventions/${meta.slug}?id=${data.intervention.id}`, { scroll: false });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRegen(false);
    }
  };

  const patchStatus = async (next: Status) => {
    if (!interventionId) return;
    try {
      const r = await fetch(`/api/interventions/${interventionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) throw new Error("Status update failed.");
      const j = (await r.json().catch(() => ({}))) as { intervention?: { status?: Status } };
      const persisted = j.intervention?.status ?? next;
      setStatus(persisted);
      setMsg(`Marked as ${persisted}.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const handleConvert = async (scope: "first" | "selected" | "all", addToToday: boolean) => {
    if (!interventionId) return;
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
      setMsg(`Added ${j.inserted} step${j.inserted === 1 ? "" : "s"} to ${addToToday ? "today" : "inbox"}.`);
      setSelected(new Set());
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const summary = (() => {
    switch (type) {
      case "task_shatter":    return form.task || "—";
      case "dopamine_menu":   return form.intent || `Energy ${state.energy ?? "—"} · Mood ${state.mood ?? "—"}`;
      case "context_switch":  return `${form.finished || "?"} → ${form.next || "?"}`;
      case "interest_filter": return `${form.task || "?"} · theme: ${form.interest || "?"}`;
    }
  })();

  const firstAction = result ? firstActionOf(result) : null;
  const allSteps = result ? collectSteps(result) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-5 anim-fade-in">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/interventions"
          className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] rounded"
        >
          ← Interventions
        </Link>
        {result && (
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM);
              setResult(null);
              setInterventionId(null);
              setStatus("draft");
              setError(null);
              setMsg(null);
              setSelected(new Set());
              router.replace(`/interventions/${meta.slug}?new=1`, { scroll: false });
            }}
            className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] rounded"
          >
            New +
          </button>
        )}
      </div>

      {/* Header */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
          Intervention
        </p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl md:text-4xl mt-1 text-gradient-subtle">
          {meta.name}
        </h1>
        <p className="text-sm text-[var(--shadow-text-muted)] mt-2">
          {meta.short}
        </p>
      </header>

      {/* State chips */}
      <StateInputPanel compact={false} />

      {/* Form */}
      <div className="panel-ambient p-5 space-y-4">
        {type === "task_shatter" && (
          <>
            <div>
              <label className={FIELD_LABEL}>What feels stuck</label>
              <input
                className={FIELD_INPUT}
                placeholder="Update my CV…"
                value={form.task}
                onChange={(e) => update("task", e.target.value)}
                maxLength={400}
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Context (optional)</label>
              <textarea
                className={FIELD_INPUT + " min-h-[80px] resize-y"}
                placeholder="What's making it heavy?"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                maxLength={500}
              />
            </div>
          </>
        )}

        {type === "dopamine_menu" && (
          <div>
            <label className={FIELD_LABEL}>Optional intent</label>
            <input
              className={FIELD_INPUT}
              placeholder="Need a small win before the meeting"
              value={form.intent}
              onChange={(e) => update("intent", e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-[var(--shadow-text-faint)] mt-2">
              Set energy / mood above for best results.
            </p>
          </div>
        )}

        {type === "context_switch" && (
          <>
            <div>
              <label className={FIELD_LABEL}>Just finished</label>
              <input
                className={FIELD_INPUT}
                placeholder="Writing emails"
                value={form.finished}
                onChange={(e) => update("finished", e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Moving into</label>
              <input
                className={FIELD_INPUT}
                placeholder="Designing landing page"
                value={form.next}
                onChange={(e) => update("next", e.target.value)}
                maxLength={200}
              />
            </div>
          </>
        )}

        {type === "interest_filter" && (
          <>
            <div>
              <label className={FIELD_LABEL}>Boring task</label>
              <input
                className={FIELD_INPUT}
                placeholder="Organize invoices"
                value={form.task}
                onChange={(e) => update("task", e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Current interest / theme</label>
              <input
                className={FIELD_INPUT}
                placeholder="Dark fantasy, cyberpunk, archive of lost knowledge…"
                value={form.interest}
                onChange={(e) => update("interest", e.target.value)}
                maxLength={120}
              />
            </div>
          </>
        )}

        {error && (
          <div
            className="rounded-md border border-[rgba(172,82,101,0.4)] bg-[rgba(172,82,101,0.08)] px-3 py-2 text-sm text-[var(--state-danger)]"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => generate(false)}
          disabled={loading}
          className="w-full rounded-md border border-[var(--shadow-border-active)] bg-[rgba(214,184,116,0.08)] hover:bg-[rgba(214,184,116,0.14)] px-4 py-2.5 text-[11px] uppercase tracking-[0.28em] text-[var(--shadow-gold)] transition-all disabled:opacity-40 shadow-[0_0_18px_rgba(214,184,116,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)]"
        >
          {loading
            ? "Shadow is forming the ritual…"
            : result
              ? "Generate again"
              : "Generate intervention"}
        </button>
      </div>

      {loading && !result && <ShadowLoader />}

      {hydrating && !result && !loading && (
        <div className="panel-ghost p-5 text-center text-sm text-[var(--shadow-text-faint)] italic">
          Shadow is recovering your ritual…
        </div>
      )}

      {/* Result */}
      {result && interventionId && (
        <div className="space-y-5">
          {/* First action hero */}
          {status !== "completed" && (
            <div className="panel-bloom-gold relative p-5 overflow-hidden rounded-xl">
              <BorderBeam size={180} duration={14} colorFrom="rgba(214,184,116,0)" colorTo="rgba(214,184,116,0.55)" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(60% 80% at 0% 50%, rgba(214,184,116,0.10) 0%, transparent 70%)" }}
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
                    <span className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border border-[var(--shadow-border-active)] text-[var(--shadow-gold)]">
                      Active
                    </span>
                  ) : (
                    <ShimmerButton onClick={() => patchStatus("active")} aria-label="Start intervention">
                      Start now
                    </ShimmerButton>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConvert("first", true)}
                    className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] border-[var(--shadow-border)] bg-[rgba(20,20,30,0.4)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)]"
                  >
                    Add to Today
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Per-type result view */}
          <div className="panel-ambient p-5">
            <ResultView result={result} selected={selected} onToggle={toggle} status={status} />
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <StatusActions status={status} busy={false} onPatchStatus={patchStatus} />
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => generate(true)}
                disabled={regen}
                className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] border-[var(--shadow-border)] bg-[rgba(20,20,30,0.4)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)]"
              >
                {regen ? "Regenerating…" : "Regenerate"}
              </button>
              <MemoryActions
                interventionId={interventionId}
                savedMemory={savedMemory}
                busy={false}
                type={type}
                result={result}
                inputSummary={summary}
                onSaved={() => setSavedMemory(true)}
              />
            </div>
            {allSteps.length > 0 && (
              <ConversionActions
                interventionId={interventionId}
                allSteps={allSteps}
                selected={selected}
                busy={false}
                onConvert={handleConvert}
              />
            )}
          </div>

          {msg && (
            <p className="text-xs text-[var(--shadow-text-muted)] italic" aria-live="polite">
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
