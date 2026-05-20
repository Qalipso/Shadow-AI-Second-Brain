"use client";
import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/cn";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;      // degrees
  scale?: number;        // hover scale
  perspective?: number;  // px
  glare?: boolean;
};

// TiltCard — 3D mouse-tracking tilt with optional gloss highlight.
// Springs smooth the motion. Reduced-motion → static.
export function TiltCard({
  children,
  className,
  maxTilt = 7,
  scale = 1.015,
  perspective = 900,
  glare = true,
}: Props) {
  const reduced = useShadowReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const s = useMotionValue(1);

  const sprX = useSpring(rx, { stiffness: 220, damping: 22, mass: 0.7 });
  const sprY = useSpring(ry, { stiffness: 220, damping: 22, mass: 0.7 });
  const sprS = useSpring(s, { stiffness: 260, damping: 24 });

  const glareBg = useTransform(
    [gx, gy] as unknown as [import("motion/react").MotionValue<number>, import("motion/react").MotionValue<number>],
    ([x, y]: number[]) =>
      `radial-gradient(280px circle at ${x}% ${y}%, rgba(214,184,116,0.10), transparent 65%)`,
  );

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rx.set((0.5 - py) * maxTilt * 2);
    ry.set((px - 0.5) * maxTilt * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  }
  function onEnter() {
    if (!reduced) s.set(scale);
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
    s.set(1);
  }

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div style={{ perspective }} className={cn("[transform-style:preserve-3d]", className)}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{
          rotateX: sprX,
          rotateY: sprY,
          scale: sprS,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full h-full"
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ background: glareBg }}
          />
        )}
      </motion.div>
    </div>
  );
}
