import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "ambient" | "bloom" | "ghost" | "legacy";

// 2026 design system primitives.
// - ambient (default): no border, soft glass bg, hover lift
// - bloom: hero surface — directional gradient + persistent ambient halo
// - ghost: no container at all (only padding/radius)
// - legacy: previous bordered card, kept for migration
export function Card({
  title,
  action,
  className,
  children,
  variant = "ambient",
  padded = true,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
  variant?: Variant;
  padded?: boolean;
}) {
  const variantClass =
    variant === "bloom"
      ? "panel-bloom"
      : variant === "ghost"
        ? "panel-ghost"
        : variant === "legacy"
          ? "rounded-xl border border-[var(--border)] bg-[rgba(20,20,27,0.8)] backdrop-blur-sm card-hover card-glow"
          : "panel-ambient";

  return (
    <section className={cn(variantClass, padded && "p-5", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between mb-3">
          {title ? <h2 className="eyebrow">{title}</h2> : <span />}
          {action ? (
            <div className="text-[11px] text-[var(--shadow-text-faint)]">
              {action}
            </div>
          ) : null}
        </header>
      )}
      {children}
    </section>
  );
}
