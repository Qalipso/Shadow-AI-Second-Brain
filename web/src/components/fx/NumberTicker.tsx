"use client";
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  value: number;
  format?: "int" | "decimal" | "compact";
  decimals?: number;
  className?: string;
  duration?: number;
  delay?: number;
  startOnView?: boolean;
};

// NumberTicker — animated count-up to target value via spring.
// Respects prefers-reduced-motion (renders static target).
export function NumberTicker({
  value,
  format = "int",
  decimals = 0,
  className,
  duration = 1.4,
  delay = 0,
  startOnView = true,
}: Props) {
  const reduced = useShadowReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const mv = useMotionValue(0);
  // Spring duration mapping: stiffness/damping tuned for ~1.4s settle
  const spring = useSpring(mv, {
    stiffness: 60,
    damping: 18,
    mass: 1,
    duration: duration * 1000,
  });

  useEffect(() => {
    if (reduced) {
      if (ref.current) ref.current.textContent = formatVal(value, format, decimals);
      return;
    }
    if (startOnView && !inView) return;
    const t = setTimeout(() => mv.set(value), delay * 1000);
    return () => clearTimeout(t);
  }, [value, inView, startOnView, reduced, delay, mv, format, decimals]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = formatVal(latest, format, decimals);
    });
  }, [spring, format, decimals]);

  return <span ref={ref} className={className}>{formatVal(reduced ? value : 0, format, decimals)}</span>;
}

function formatVal(v: number, format: "int" | "decimal" | "compact", decimals: number): string {
  if (format === "compact") {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toString();
  }
  if (format === "decimal") return v.toFixed(decimals);
  return Math.round(v).toString();
}
