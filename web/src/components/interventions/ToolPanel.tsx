"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  type InterventionType,
  TOOL_LABELS,
} from "./types";
import { useInterventionState } from "./stateStore";
import { StateInputPanel } from "./StateInputPanel";
import { ResultCard, type GeneratedResult } from "./ResultCard";
import { ShadowLoader } from "./ShadowLoader";
import { VariantSwitcher } from "./VariantSwitcher";

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
  const meta = TOOL_LABELS[type];
  const { state } = useInterventionState();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [regen, setRegen] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [interventionId, setInterventionId] = useState<string | null>(idFromUrl);
  const [memorySaved, setMemorySaved] = useState(false);
  const [status, setStatus] = useState<
    "draft" | "active" | "completed" | "archived" | "dismissed"
  >("draft");
  const skipNextHydrate = useRef(false);

  // Hydrate from URL ?id= or latest draft for this type.
  // Skip entirely when ?new=1 (fresh create from grid).
  useEffect(() => {
    if (skipNextHydrate.current) {
      skipNextHydrate.current = false;
      return;
    }
    // ?new=1: clean param from URL and start blank — do not load any existing draft
    if (isNew && !idFromUrl) {
      router.replace(`/interventions/${meta.slug}`, { scroll: false });
      return;
    }
    let cancelled = false;
    async function hydrate() {
      setHydrating(true);
      try {
        if (idFromUrl) {
          const r = await fetch(`/api/interventions/${idFromUrl}`);
          if (!r.ok) return;
          const j = (await r.json()) as { intervention: { id: string; type: InterventionType; user_input: Record<string, unknown>; result_json: unknown; status: typeof status } };
          if (cancelled || j.intervention.type !== type) return;
          setForm(inputToForm(type, j.intervention.user_input));
          setResult(j.intervention.result_json as GeneratedResult);
          setInterventionId(j.intervention.id);
          setStatus(j.intervention.status);
        } else {
          // latest draft for this type
          const r = await fetch(`/api/interventions?type=${type}&limit=1`);
          if (!r.ok) return;
          const j = (await r.json()) as { items: Array<{ id: string; user_input: Record<string, unknown>; result_json: unknown; status: typeof status }> };
          const latest = j.items?.[0];
          if (cancelled || !latest) return;
          setForm(inputToForm(type, latest.user_input));
          setResult(latest.result_json as GeneratedResult);
          setInterventionId(latest.id);
          setStatus(latest.status);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [idFromUrl, isNew, type, meta.slug, router]);

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
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (isRegen) setRegen(true);
    else setLoading(true);

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
      const data = (await res.json()) as {
        intervention: { id: string };
        result: GeneratedResult;
      };
      setResult(data.result);
      setInterventionId(data.intervention.id);
      setMemorySaved(false);
      setStatus("draft");
      router.replace(`/interventions/${meta.slug}?id=${data.intervention.id}`, {
        scroll: false,
      });
      router.refresh();
      // Auto-save pattern to memory (fire-and-forget)
      fetch(`/api/interventions/${data.intervention.id}/save-memory`, { method: "POST" })
        .then(() => setMemorySaved(true))
        .catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRegen(false);
    }
  };

  const summary = (() => {
    switch (type) {
      case "task_shatter":
        return form.task || "—";
      case "dopamine_menu":
        return form.intent || `Energy ${state.energy ?? "—"} · Mood ${state.mood ?? "—"}`;
      case "context_switch":
        return `${form.finished || "?"} → ${form.next || "?"}`;
      case "interest_filter":
        return `${form.task || "?"} · theme: ${form.interest || "?"}`;
    }
  })();

  function resetForNew() {
    skipNextHydrate.current = true;
    setForm(EMPTY_FORM);
    setResult(null);
    setInterventionId(null);
    setStatus("draft");
    setError(null);
    router.replace(`/interventions/${meta.slug}`, { scroll: false });
  }

  return (
    <div className="space-y-5 anim-fade-in">
      <div className="flex items-center justify-between">
        <Link
          href="/interventions"
          className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-text-muted)]"
        >
          ← All interventions
        </Link>
        {interventionId && (
          <button
            type="button"
            onClick={resetForNew}
            className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-gold)]"
          >
            New intervention +
          </button>
        )}
      </div>

      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
          Intervention
        </p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl md:text-4xl mt-1 text-gradient-subtle">
          {meta.name}
        </h1>
        <p className="text-sm text-[var(--shadow-text-muted)] mt-2 max-w-xl">
          {meta.short}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
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
                Set energy / mood in the right panel for best results.
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
            <div className="rounded-md border border-[rgba(172,82,101,0.4)] bg-[rgba(172,82,101,0.08)] px-3 py-2 text-sm text-[var(--state-danger)]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => generate(false)}
            disabled={loading}
            className="w-full rounded-md border border-[var(--shadow-border-active)] bg-[rgba(214,184,116,0.08)] hover:bg-[rgba(214,184,116,0.14)] px-4 py-2.5 text-[11px] uppercase tracking-[0.28em] text-[var(--shadow-gold)] transition-all disabled:opacity-40 shadow-[0_0_18px_rgba(214,184,116,0.10)]"
          >
            {loading ? "Shadow is forming the ritual…" : result ? "Generate again" : "Generate intervention"}
          </button>
        </div>

        <div className="space-y-3">
          <StateInputPanel />
          <VariantSwitcher type={type} activeId={interventionId} />
        </div>
      </div>

      {loading && !result && <ShadowLoader />}

      {hydrating && !result && !loading && (
        <div className="panel-ghost p-5 text-center text-sm text-[var(--shadow-text-faint)] italic">
          Shadow is recovering your last ritual…
        </div>
      )}

      {result && interventionId && (
        <ResultCard
          interventionId={interventionId}
          type={type}
          inputSummary={summary}
          result={result}
          initialStatus={status}
          initialSavedMemory={memorySaved}
          onRegenerate={() => generate(true)}
          onStatusChange={(s) => setStatus(s)}
          regenerating={regen}
        />
      )}
    </div>
  );
}
