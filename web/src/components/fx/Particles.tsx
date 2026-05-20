"use client";
import { useEffect, useRef } from "react";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  count?: number;
  className?: string;
  color?: string;          // base RGB triplet, e.g. "214 184 116"
  speed?: number;          // px per frame
  maxOpacity?: number;
};

// Particles — lightweight canvas drift effect. Calm, dust-like.
// Pauses under reduced-motion + unmounts cleanly.
export function Particles({
  count = 28,
  className = "",
  color = "214 184 116",
  speed = 0.12,
  maxOpacity = 0.35,
}: Props) {
  const reduced = useShadowReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: { x: number; y: number; r: number; vx: number; vy: number; a: number }[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // setTransform replaces the matrix; ctx.scale() would compound on
      // every resize and silently inflate DPR each tick.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        r: 0.4 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        a: Math.random() * maxOpacity,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = rect.width;
        if (p.x > rect.width) p.x = 0;
        if (p.y < 0) p.y = rect.height;
        if (p.y > rect.height) p.y = 0;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color} / ${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [count, speed, color, maxOpacity, reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 ${className}`} />;
}
