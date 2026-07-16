"use client";

import { useEffect, useRef } from "react";

// ESC / focus-trap / body-scroll-lock / initial-focus, extracted from Modal.tsx
// so hand-rolled dialogs can get the same accessibility behavior without
// adopting Modal.tsx's visual markup (issue #13 — 8 bespoke dialogs each had
// to get this right independently; before this, only Modal.tsx's 2 consumers did).
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function useModalBehavior<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<T | null>(null);

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
      if (e.key === "Tab" && ref.current) {
        const focusable = Array.from(
          ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
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
        ref.current?.querySelector<HTMLElement>(FOCUSABLE) ?? ref.current;
      target?.focus();
    }, 0);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}
