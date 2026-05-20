"use client";

import type { SaveState } from "./useSaveState";

export function SaveBar({
  state,
  error,
  savedAt,
  onCancel,
  onSave,
}: {
  state: SaveState;
  error: string | null;
  savedAt: number | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  const dirty = state === "dirty" || state === "error";
  const saving = state === "saving";

  const label = (() => {
    if (state === "saving") return "Saving…";
    if (state === "saved") return savedAt ? `Saved · ${timeAgo(savedAt)}` : "Saved";
    if (state === "error") return error ?? "Save failed";
    if (state === "dirty") return "Unsaved changes";
    return "All changes saved";
  })();

  const color = (() => {
    if (state === "error") return "var(--shadow-red)";
    if (state === "saved") return "var(--shadow-green)";
    if (state === "dirty") return "var(--accent-warm)";
    return "var(--shadow-text-faint)";
  })();

  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-3 border-t"
      style={{
        borderColor: "var(--shadow-border)",
        background: "rgba(8,8,14,0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        className="text-[10px] font-mono uppercase tracking-[0.18em]"
        style={{ color }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={!dirty || saving}
          className="px-3 py-1.5 rounded-md text-[11px] font-mono transition-all disabled:opacity-30"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--shadow-border)",
            color: "var(--shadow-text-muted)",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="px-4 py-1.5 rounded-md text-[11px] font-mono transition-all disabled:opacity-30"
          style={{
            background: state === "error"
              ? "rgba(172,82,101,0.18)"
              : "rgba(201,163,106,0.14)",
            border: `1px solid ${state === "error" ? "rgba(172,82,101,0.4)" : "rgba(201,163,106,0.32)"}`,
            color: state === "error" ? "var(--shadow-red)" : "var(--accent-warm)",
          }}
        >
          {saving ? "Saving…" : state === "error" ? "Retry" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
