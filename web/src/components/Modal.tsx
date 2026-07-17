"use client";

import { type ReactNode } from "react";
import { useModalBehavior } from "./useModalBehavior";

// Lightweight modal primitive:
// - centered, max-w configurable
// - backdrop blur with click-to-close
// - ESC to close
// - focus trap on first interactive element
// - prevents body scroll while open
// - respects prefers-reduced-motion via globals.css

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
  const dialogRef = useModalBehavior<HTMLDivElement>({ open, onClose });

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 z-40 backdrop-blur-md anim-backdrop"
        style={{ background: "rgba(6,5,14,0.68)" }}
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
