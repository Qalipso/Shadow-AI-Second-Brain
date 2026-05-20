"use client";
import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  children: ReactNode;
  delay?: number;          // seconds
  y?: number;              // px translate
  blur?: number;           // px blur
  once?: boolean;
  duration?: number;       // seconds
  className?: string;
  inViewMargin?: string;   // intersection-observer rootMargin
};

// BlurFade — fades + slides + un-blurs content as it enters viewport.
// Respects prefers-reduced-motion by rendering content statically.
export function BlurFade({
  children,
  delay = 0,
  y = 6,
  blur = 6,
  once = true,
  duration = 0.55,
  className,
  inViewMargin = "-80px",
}: Props) {
  const reduced = useShadowReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: inViewMargin as `${number}px` });

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
      transition={{ delay, duration, ease: [0.14, 1, 0.34, 1] }}
    >
      {children}
    </motion.div>
  );
}
