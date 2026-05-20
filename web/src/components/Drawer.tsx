"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Right-side slide drawer. Keeps page visible. ESC closes. Body scroll locked.
// Optional unsavedGuard prevents closing when there are unsaved edits.

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Drawer({
  open,
  onClose,
  unsavedGuard,
  labelledBy,
  widthClass = "w-full md:w-[44vw] lg:w-[42vw] xl:w-[40vw]",
  children,
}: {
  open: boolean;
  onClose: () => void;
  unsavedGuard?: () => boolean; // return true if drawer should NOT close
  labelledBy?: string;
  widthClass?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const prevActive = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        attemptClose();
      }
      if (e.key === "Tab" && ref.current) {
        const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE))
          .filter((el) => !el.hasAttribute("disabled"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>(FOCUSABLE) ?? ref.current;
      target?.focus();
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function attemptClose() {
    if (unsavedGuard?.()) {
      const ok = window.confirm("You have unsaved changes. Discard them and close?");
      if (!ok) return;
    }
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close drawer"
        onClick={attemptClose}
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] anim-backdrop"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`fixed top-0 right-0 bottom-0 z-50 ${widthClass} flex flex-col outline-none shadow-[-20px_0_60px_rgba(0,0,0,0.55)] drawer-slide-in`}
        style={{
          background: "linear-gradient(180deg, rgba(15,14,22,0.99), rgba(10,9,15,0.99))",
          borderLeft: "1px solid var(--shadow-border)",
        }}
      >
        {children}
      </div>
      <style jsx global>{`
        @keyframes drawerSlideIn {
          from { transform: translateX(24px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        .drawer-slide-in { animation: drawerSlideIn 180ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .drawer-slide-in { animation: none; }
        }
      `}</style>
    </>
  );
}
