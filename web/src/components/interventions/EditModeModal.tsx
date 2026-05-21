"use client";

export function EditModeModal({
  onFork,
  onReplace,
  onCancel,
}: {
  onFork: () => void;
  onReplace: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(6,5,14,0.72)" }}
      onClick={onCancel}
    >
      <div
        className="relative max-w-sm w-full rounded-xl p-5 space-y-4"
        style={{
          background: "linear-gradient(160deg, rgba(15,14,22,0.99), rgba(10,9,15,0.99))",
          border: "1px solid var(--shadow-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
            Edit &amp; Regenerate
          </p>
          <p className="text-sm text-[var(--shadow-text-muted)] mt-1">
            How do you want to proceed?
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onFork}
            className="w-full text-left rounded-lg p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] hover:bg-[rgba(255,255,255,0.03)]"
            style={{ border: "1px solid var(--shadow-border)" }}
          >
            <p className="text-sm text-[var(--shadow-text)]">New version</p>
            <p className="text-xs text-[var(--shadow-text-faint)] mt-0.5">
              Pre-fill the form from this intervention and create a fresh record. Original stays.
            </p>
          </button>

          <button
            type="button"
            onClick={onReplace}
            className="w-full text-left rounded-lg p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] hover:bg-[rgba(255,255,255,0.03)]"
            style={{ border: "1px solid var(--shadow-border)" }}
          >
            <p className="text-sm text-[var(--shadow-text)]">Replace this</p>
            <p className="text-xs text-[var(--shadow-text-faint)] mt-0.5">
              Regenerate and archive this one. Replaces the current result.
            </p>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] uppercase tracking-[0.22em] px-3 py-1.5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-text-muted)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
