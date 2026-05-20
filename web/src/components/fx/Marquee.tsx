"use client";
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  children: ReactNode;
  className?: string;
  pauseOnHover?: boolean;
  reverse?: boolean;
  duration?: number;       // seconds per full loop
  gap?: string;
  fade?: boolean;          // edge-fade mask
  repeat?: number;         // number of duplicated children rows
};

// Marquee — infinite horizontal scroll. Pauses on hover.
// Duplicates children so loop is seamless. Reduced-motion → static row.
export function Marquee({
  children,
  className,
  pauseOnHover = true,
  reverse = false,
  duration = 40,
  gap = "1.5rem",
  fade = true,
  repeat = 2,
}: Props) {
  const reduced = useShadowReducedMotion();

  return (
    <div
      className={cn(
        "group relative flex w-full overflow-hidden",
        fade &&
          "[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className,
      )}
      style={{ ["--gap" as string]: gap, ["--dur" as string]: `${duration}s` }}
    >
      {Array.from({ length: reduced ? 1 : repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 items-center",
            !reduced && "marquee-track",
            !reduced && reverse && "marquee-track--reverse",
            pauseOnHover && !reduced && "group-hover:[animation-play-state:paused]",
          )}
          style={{ gap: "var(--gap)", paddingInlineEnd: "var(--gap)" }}
          aria-hidden={i > 0}
        >
          {children}
        </div>
      ))}
      <style jsx>{`
        :global(.marquee-track) {
          animation: marquee-scroll var(--dur) linear infinite;
          will-change: transform;
        }
        :global(.marquee-track--reverse) {
          animation-direction: reverse;
        }
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-100% - var(--gap))); }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.marquee-track) { animation: none; }
        }
      `}</style>
    </div>
  );
}
