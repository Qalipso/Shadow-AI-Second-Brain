"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Step = { id: string; title: string };

function ActionBtn({
  onClick,
  disabled,
  children,
  ariaLabel,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] border-[var(--shadow-border)] bg-[rgba(20,20,30,0.4)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)] hover:border-[rgba(180,170,220,0.18)]"
    >
      {children}
    </button>
  );
}

export function ConversionActions({
  interventionId,
  allSteps,
  selected,
  busy,
  onConvert,
}: {
  interventionId: string;
  allSteps: Step[];
  selected: Set<string>;
  busy: boolean;
  onConvert: (scope: "first" | "selected" | "all", addToToday: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  if (allSteps.length === 0) return null;

  return (
    <div className="space-y-2">
      <ActionBtn
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        ariaLabel="Convert steps to tasks"
      >
        {open ? "Hide options" : "Convert / Add"}
      </ActionBtn>

      {open && (
        <div
          className="rounded-lg p-4 space-y-3 anim-fade-in"
          style={{ background: "rgba(20,20,30,0.6)", border: "1px solid var(--shadow-border)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
              Scope · {selected.size} selected of {allSteps.length}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ActionBtn
              onClick={() => onConvert("first", true)}
              disabled={busy}
              ariaLabel="Add first action to Today"
            >
              Add first action to Today
            </ActionBtn>
            <ActionBtn
              onClick={() => onConvert("selected", true)}
              disabled={busy || selected.size === 0}
              ariaLabel="Add selected steps to Today"
            >
              Add selected to Today
            </ActionBtn>
            <ActionBtn
              onClick={() => onConvert("selected", false)}
              disabled={busy || selected.size === 0}
              ariaLabel="Add selected steps to Inbox"
            >
              Add selected to Inbox
            </ActionBtn>
            <ActionBtn
              onClick={() => onConvert("all", false)}
              disabled={busy}
              ariaLabel="Add all steps to Inbox"
            >
              Add all to Inbox
            </ActionBtn>
          </div>
        </div>
      )}
    </div>
  );
}
