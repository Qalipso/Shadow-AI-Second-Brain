"use client";
import { useState } from "react";
import type { GeneratedResult } from "./ResultView";
import type { InterventionType } from "../types";

// Build a human-readable preview of what will be saved
function buildPreview(
  type: InterventionType,
  result: GeneratedResult,
  inputSummary: string,
): { title: string; content: string; tags: string[] } {
  const typeLabel: Record<InterventionType, string> = {
    task_shatter: "Task Paralysis Shatter",
    dopamine_menu: "Dopamine Menu",
    context_switch: "Context Switch",
    interest_filter: "Interest Quest",
  };

  let content = "";
  if (result.kind === "task_shatter") {
    content = `Why heavy: ${result.whyHeavy}\nFirst move: ${result.firstAction}`;
  } else if (result.kind === "dopamine_menu") {
    content = `Mode: ${result.mode}\nTop pick: ${result.appetizers[0]?.title ?? "—"}`;
  } else if (result.kind === "context_switch") {
    content = `${result.title}\nMantra: "${result.mantra}"`;
  } else if (result.kind === "interest_filter") {
    content = `Quest: ${result.questName} (${result.theme})\nFirst stage: ${result.stages[0]?.action ?? "—"}`;
  }

  return {
    title: `${typeLabel[type]}: ${inputSummary.slice(0, 60)}`,
    content,
    tags: [type.replace("_", "-"), "intervention"],
  };
}

export function MemoryActions({
  interventionId,
  savedMemory,
  busy,
  type,
  result,
  inputSummary,
  onSaved,
}: {
  interventionId: string;
  savedMemory: boolean;
  busy: boolean;
  type: InterventionType;
  result: GeneratedResult;
  inputSummary: string;
  onSaved: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = buildPreview(type, result, inputSummary);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/interventions/${interventionId}/save-memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Save failed.");
      }
      setShowPreview(false);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (savedMemory) {
    return (
      <span className="text-[11px] uppercase tracking-[0.22em] text-[rgba(143,209,169,0.9)]">
        Saved to Memory ✓
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPreview(true)}
        disabled={busy || saving}
        aria-label="Save pattern to memory"
        className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] border-[var(--shadow-border)] bg-[rgba(20,20,30,0.4)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)] hover:border-[rgba(180,170,220,0.18)]"
      >
        Save Pattern
      </button>

      {showPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(6,5,14,0.72)" }}
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-md w-full rounded-xl p-5 space-y-4"
            style={{
              background: "linear-gradient(160deg, rgba(15,14,22,0.99), rgba(10,9,15,0.99))",
              border: "1px solid var(--shadow-border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
                  Save to memory
                </p>
                <p className="text-sm text-[var(--shadow-text-muted)] mt-1">
                  This pattern will be stored and used by Shadow for future insights.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                aria-label="Cancel"
                className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--shadow-border)",
                  color: "var(--shadow-text-muted)",
                }}
              >
                ×
              </button>
            </div>

            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: "rgba(20,20,30,0.6)", border: "1px solid var(--shadow-border)" }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] mb-1">
                  Title
                </p>
                <p className="text-sm text-[var(--shadow-text)]">{preview.title}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] mb-1">
                  Content
                </p>
                <p className="text-sm text-[var(--shadow-text-muted)] whitespace-pre-line leading-relaxed">
                  {preview.content}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preview.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded"
                    style={{
                      background: "rgba(126,87,194,0.10)",
                      border: "1px solid rgba(126,87,194,0.25)",
                      color: "rgba(168,140,210,0.9)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-[var(--state-danger)]" role="alert">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] border-[var(--shadow-border)] bg-transparent text-[var(--shadow-text-faint)] hover:text-[var(--shadow-text-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="text-[11px] uppercase tracking-[0.22em] px-4 py-2 rounded-md border transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)]"
                style={{
                  background: "rgba(214,184,116,0.10)",
                  border: "1px solid var(--shadow-border-active)",
                  color: "var(--shadow-gold)",
                }}
              >
                {saving ? "Saving…" : "Save Pattern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
