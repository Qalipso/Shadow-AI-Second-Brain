"use client";
import { cn } from "@/lib/cn";
import { ShimmerButton } from "@/components/fx";
import type { Status } from "./ResultView";

function ActionBtn({
  onClick,
  disabled,
  active,
  variant = "ghost",
  children,
  ariaLabel,
}: {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: "ghost" | "danger";
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const base =
    "text-[11px] uppercase tracking-[0.22em] px-3 py-2 rounded-md border transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)]";
  const cls =
    variant === "danger"
      ? "border-[rgba(172,82,101,0.4)] bg-[rgba(172,82,101,0.05)] text-[var(--state-danger)] hover:bg-[rgba(172,82,101,0.10)]"
      : `border-[var(--shadow-border)] bg-[rgba(20,20,30,0.4)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)] hover:border-[rgba(180,170,220,0.18)] ${active ? "border-[var(--shadow-border-active)] text-[var(--shadow-gold)]" : ""}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(base, cls)}
    >
      {children}
    </button>
  );
}

export function StatusActions({
  status,
  busy,
  onPatchStatus,
}: {
  status: Status;
  busy: boolean;
  onPatchStatus: (s: Status) => void;
}) {
  if (status === "completed" || status === "archived" || status === "dismissed") return null;

  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" ? (
        <ActionBtn disabled active ariaLabel="Currently active">
          Active
        </ActionBtn>
      ) : (
        <ShimmerButton
          onClick={() => onPatchStatus("active")}
          disabled={busy}
          aria-label="Start intervention"
        >
          Start now
        </ShimmerButton>
      )}
      <ActionBtn
        onClick={() => onPatchStatus("completed")}
        disabled={busy}
        ariaLabel="Mark as complete"
      >
        Complete
      </ActionBtn>
      <ActionBtn
        onClick={() => onPatchStatus("archived")}
        disabled={busy}
        ariaLabel="Archive this intervention"
      >
        Archive
      </ActionBtn>
    </div>
  );
}
