"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import type { InterventionRow } from "@/lib/interventions/types";
import { TOOL_LABELS } from "./types";
import { ResultView, collectSteps, firstActionOf, type GeneratedResult, type Status } from "./results/ResultView";
import { StatusActions } from "./results/StatusActions";
import { MemoryActions } from "./results/MemoryActions";
import { ConversionActions } from "./results/ConversionActions";
import { EditModeModal } from "./EditModeModal";
import { BorderBeam, ShimmerButton } from "@/components/fx";

function inputSummary(row: InterventionRow): string {
  const i = row.user_input;
  switch (row.type) {
    case "task_shatter":   return String(i.task ?? "—");
    case "dopamine_menu":  return String(i.intent || row.mood || "Menu");
    case "context_switch": return `${String(i.finished ?? "?")} → ${String(i.next ?? "?")}`;
    case "interest_filter":return `${String(i.task ?? "?")} · ${String(i.interest ?? "?")}`;
  }
}

function rel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function InputContextSection({ row }: { row: InterventionRow }) {
  const [open, setOpen] = useState(false);
  const fields = Object.entries(row.user_input).filter(([, v]) => v !== null && v !== "");

  if (fields.length === 0) return null;

  return (
    <div className="border-b pb-4" style={{ borderColor: "var(--shadow-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-text-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] rounded"
        aria-expanded={open}
      >
        <span>{open ? "▾" : "▸"}</span>
        What you entered
      </button>
      {open && (
        <dl className="mt-2 space-y-1.5">
          {fields.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--shadow-text-faint)] shrink-0 w-20 mt-0.5">
                {k}
              </dt>
              <dd className="text-xs text-[var(--shadow-text-muted)] leading-relaxed">
                {String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function InterventionDetailDrawer({
  row,
  open,
  onClose,
  onUpdated,
}: {
  row: InterventionRow | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (patch: Partial<InterventionRow>) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(row?.status ?? "draft");
  const [savedMemory, setSavedMemory] = useState(row?.saved_to_memory ?? false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when row changes
  const rowId = row?.id;
  useMemo(() => {
    if (row) {
      setStatus(row.status);
      setSavedMemory(row.saved_to_memory);
      setSelected(new Set());
      setMsg(null);
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId]);

  if (!row) return null;

  const meta = TOOL_LABELS[row.type];
  const result = row.result_json as GeneratedResult | null;
  const summary = inputSummary(row);
  const allSteps = result ? collectSteps(result) : [];
  const firstAction = result ? firstActionOf(result) : null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const patchStatus = async (next: Status) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/interventions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) throw new Error("Status update failed.");
      const j = (await r.json().catch(() => ({}))) as { intervention?: { status?: Status } };
      const persisted = j.intervention?.status ?? next;
      setStatus(persisted);
      onUpdated({ status: persisted });
      setMsg(`Marked as ${persisted}.`);
      if (persisted === "completed" || persisted === "archived" || persisted === "dismissed") {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          onClose();
          router.refresh();
        }, 800);
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleConvert = async (scope: "first" | "selected" | "all", addToToday: boolean) => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { scope, addToToday };
      if (scope === "selected") body.stepIds = [...selected];
      const r = await fetch(`/api/interventions/${row.id}/to-tasks`, {
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
    } finally {
      setBusy(false);
    }
  };

  const handleFork = () => {
    setShowEditModal(false);
    router.push(`/interventions/${meta.slug}?id=${row.id}&fork=1`);
    onClose();
  };

  const handleReplace = () => {
    setShowEditModal(false);
    router.push(`/interventions/${meta.slug}?id=${row.id}&replace=1`);
    onClose();
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} widthClass="w-full md:w-[50vw] lg:w-[46vw]">
        {/* Header */}
        <div
          className="px-6 pt-5 pb-4 border-b flex items-start justify-between gap-3 shrink-0"
          style={{ borderColor: "var(--shadow-border)" }}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
              {meta.name}
            </p>
            <p
              className="text-[9px] uppercase tracking-[0.22em] px-2 py-0.5 rounded border inline-block mt-1.5"
              style={{
                borderColor: status === "active" ? "var(--shadow-border-active)" : "var(--shadow-border)",
                color: status === "active" ? "var(--shadow-gold)" : "var(--shadow-text-faint)",
              }}
            >
              {status}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--shadow-border)",
              color: "var(--shadow-text-muted)",
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--shadow-text-faint)]">
            <span>{rel(row.created_at)}</span>
            {row.energy_level && <span>Energy: {row.energy_level}</span>}
            {row.mood && <span>Mood: {row.mood}</span>}
            {row.friction && <span>Friction: {row.friction.replace(/_/g, " ")}</span>}
          </div>

          {/* Input context */}
          <InputContextSection row={row} />

          {/* First action hero */}
          {firstAction && status !== "completed" && (
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
                <p className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--shadow-text)] leading-snug">
                  {firstAction}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {status === "active" ? (
                    <span className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border border-[var(--shadow-border-active)] text-[var(--shadow-gold)]">
                      Active
                    </span>
                  ) : (
                    <ShimmerButton onClick={() => patchStatus("active")} disabled={busy} aria-label="Start intervention">
                      Start now
                    </ShimmerButton>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConvert("first", true)}
                    disabled={busy}
                    className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] border-[var(--shadow-border)] bg-[rgba(20,20,30,0.4)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)]"
                  >
                    Add to Today
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Per-type result */}
          {result && (
            <ResultView result={result} selected={selected} onToggle={toggle} status={status} />
          )}

          {/* Memory save state indicator */}
          {savedMemory && (
            <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(143,209,169,0.7)]">
              Pattern saved to memory
            </p>
          )}

          {/* Divider + actions */}
          <div
            className="pt-4 border-t space-y-3"
            style={{ borderColor: "var(--shadow-border)" }}
          >
            <StatusActions status={status} busy={busy} onPatchStatus={patchStatus} />
            <div className="flex flex-wrap gap-2 items-center">
              {result && (
                <MemoryActions
                  interventionId={row.id}
                  savedMemory={savedMemory}
                  busy={busy}
                  type={row.type}
                  result={result}
                  inputSummary={summary}
                  onSaved={() => {
                    setSavedMemory(true);
                    onUpdated({ saved_to_memory: true });
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] border-[var(--shadow-border)] bg-[rgba(20,20,30,0.4)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)]"
                aria-label="Edit inputs and regenerate"
              >
                Edit &amp; Regenerate
              </button>
            </div>
            {result && allSteps.length > 0 && (
              <ConversionActions
                interventionId={row.id}
                allSteps={allSteps}
                selected={selected}
                busy={busy}
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
      </Drawer>

      {showEditModal && (
        <EditModeModal
          onFork={handleFork}
          onReplace={handleReplace}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
