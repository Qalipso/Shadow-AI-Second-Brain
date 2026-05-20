"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Lightweight modal primitive:
// - centered, max-w configurable
// - backdrop blur with click-to-close
// - ESC to close
// - focus trap on first interactive element
// - prevents body scroll while open
// - respects prefers-reduced-motion via globals.css

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  maxWidth = 520,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  describedBy?: string;
  maxWidth?: number;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // ESC + body scroll lock + initial focus.
  useEffect(() => {
    if (!open) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKey);

    // Defer focus until after paint so animation can settle.
    const timer = window.setTimeout(() => {
      const target =
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
        dialogRef.current;
      target?.focus();
    }, 0);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm anim-backdrop"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        style={{ maxWidth }}
        className="fixed left-0 right-0 top-[6vh] z-50 mx-auto flex flex-col h-fit max-h-[88vh] w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-[var(--bg-elev1)] shadow-[0_24px_64px_rgba(0,0,0,0.6)] anim-scale-in outline-none"
      >
        {children}
      </div>
    </>
  );
}
