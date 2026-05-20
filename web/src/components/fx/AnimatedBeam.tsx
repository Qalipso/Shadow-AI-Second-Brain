"use client";
import { useEffect, useId, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
};

// AnimatedBeam — draws a curved gradient stroke between two DOM refs
// relative to a shared container. Auto-recomputes on resize.
// Inspired by Magic UI's animated-beam, retuned for Shadow palette.
export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 5,
  delay = 0,
  pathWidth = 1.5,
  pathOpacity = 0.18,
  gradientStartColor = "rgba(214, 184, 116, 0)",
  gradientStopColor = "rgba(214, 184, 116, 0.85)",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: Props) {
  const id = useId();
  const reduced = useShadowReducedMotion();
  const [pathD, setPathD] = useState("");
  const [svgDim, setSvgDim] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let lastD = "";
    let lastW = 0;
    let lastH = 0;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const c = containerRef.current;
        const a = fromRef.current;
        const b = toRef.current;
        if (!c || !a || !b) return;
        const cRect = c.getBoundingClientRect();
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();

        const w = Math.round(cRect.width);
        const h = Math.round(cRect.height);
        const x1 = aRect.left - cRect.left + aRect.width / 2 + startXOffset;
        const y1 = aRect.top - cRect.top + aRect.height / 2 + startYOffset;
        const x2 = bRect.left - cRect.left + bRect.width / 2 + endXOffset;
        const y2 = bRect.top - cRect.top + bRect.height / 2 + endYOffset;

        const controlY = y1 - curvature;
        const d = `M ${x1.toFixed(1)},${y1.toFixed(1)} Q ${((x1 + x2) / 2).toFixed(1)},${controlY.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;

        // Dedupe: skip setState if path & dims unchanged. ResizeObserver
        // can fire during layout when our own setState triggers reflow →
        // would loop without this guard.
        if (d === lastD && w === lastW && h === lastH) return;
        lastD = d;
        lastW = w;
        lastH = h;
        setSvgDim({ width: w, height: h });
        setPathD(d);
      });
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset]);

  if (!pathD) return null;

  const gradId = `beam-grad-${id}`;
  return (
    <svg
      aria-hidden
      pointerEvents="none"
      className="absolute inset-0"
      width={svgDim.width}
      height={svgDim.height}
      viewBox={`0 0 ${svgDim.width} ${svgDim.height}`}
    >
      <path
        d={pathD}
        stroke="rgba(255,255,255,1)"
        strokeOpacity={pathOpacity}
        strokeWidth={pathWidth}
        fill="none"
      />
      {!reduced && (
        <>
          <defs>
            <motion.linearGradient
              id={gradId}
              gradientUnits="userSpaceOnUse"
              initial={
                reverse
                  ? { x1: "100%", x2: "110%", y1: "0%", y2: "0%" }
                  : { x1: "-10%", x2: "0%", y1: "0%", y2: "0%" }
              }
              animate={
                reverse
                  ? { x1: ["100%", "-10%"], x2: ["110%", "0%"] }
                  : { x1: ["-10%", "100%"], x2: ["0%", "110%"] }
              }
              transition={{
                duration,
                delay,
                ease: "linear",
                repeat: Infinity,
                repeatDelay: 0.4,
              }}
            >
              <stop offset="0" stopColor={gradientStartColor} />
              <stop offset="0.4" stopColor={gradientStopColor} />
              <stop offset="1" stopColor={gradientStartColor} />
            </motion.linearGradient>
          </defs>
          <path d={pathD} stroke={`url(#${gradId})`} strokeWidth={pathWidth + 0.5} fill="none" />
        </>
      )}
    </svg>
  );
}
