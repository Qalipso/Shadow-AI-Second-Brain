"use client";
import { useRef, type ReactNode } from "react";
import { useMotionValue, useMotionTemplate, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightSize?: number;
};

// MagicCard — cursor-tracking spotlight inside a card.
// Stays subtle: low opacity, gold tint, no neon. Disabled under reduced-motion.
export function MagicCard({
  children,
  className,
  spotlightColor = "rgba(214, 184, 116, 0.10)",
  spotlightSize = 380,
}: Props) {
  const reduced = useShadowReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const background = useMotionTemplate`radial-gradient(${spotlightSize}px circle at ${x}px ${y}px, ${spotlightColor}, transparent 70%)`;

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }
  function onMouseLeave() {
    x.set(-9999);
    y.set(-9999);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn("relative overflow-hidden", className)}
    >
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
