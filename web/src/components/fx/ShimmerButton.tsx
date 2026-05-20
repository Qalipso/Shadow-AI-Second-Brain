"use client";
import { type ButtonHTMLAttributes, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  shimmerColor?: string;
  background?: string;
  borderRadius?: string;
};

// ShimmerButton — gold-tinted variant aligned with Shadow's accent palette.
// Renders a static button under reduced-motion via CSS animation only.
export function ShimmerButton({
  className,
  children,
  shimmerColor = "rgba(214, 184, 116, 0.9)",
  background = "rgba(214, 184, 116, 0.12)",
  borderRadius = "0.5rem",
  ...rest
}: Props) {
  const style: CSSProperties = {
    "--shimmer-color": shimmerColor,
    "--bg": background,
    "--radius": borderRadius,
  } as CSSProperties;

  return (
    <button
      {...rest}
      style={style}
      className={cn(
        "group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden",
        "px-4 text-[11px] uppercase tracking-[0.22em] text-[var(--shadow-gold)]",
        "transition-all hover:scale-[1.01] active:scale-[0.99]",
        "shimmer-btn",
        className,
      )}
    >
      <span className="relative z-10">{children}</span>
      <span aria-hidden className="shimmer-btn__sheen" />
      <style jsx>{`
        .shimmer-btn {
          background: var(--bg);
          border-radius: var(--radius);
          box-shadow:
            0 0 18px rgba(214, 184, 116, 0.12),
            inset 0 0 0 1px rgba(214, 184, 116, 0.34);
        }
        .shimmer-btn__sheen {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: conic-gradient(
            from var(--shimmer-angle, 0deg),
            transparent 0%,
            var(--shimmer-color) 10%,
            transparent 20%
          );
          opacity: 0.85;
          animation: shimmer-spin 3.2s linear infinite;
          mask-image: linear-gradient(black, black);
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          padding: 1px;
        }
        @property --shimmer-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes shimmer-spin {
          to {
            --shimmer-angle: 360deg;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer-btn__sheen { animation: none; }
        }
      `}</style>
    </button>
  );
}
