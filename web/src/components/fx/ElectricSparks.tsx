"use client";
import { useEffect, useRef } from "react";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  className?: string;
  density?: number;        // sparks per second
  color?: string;          // RGB triplet for rgba(...)
  branchChance?: number;   // 0..1, chance of forking
  maxLength?: number;      // longest arc px
};

// Tiny electric arcs that flicker briefly inside the container.
// Canvas-based. Pauses under prefers-reduced-motion.
export function ElectricSparks({
  className = "",
  density = 3,
  color = "214 184 116",
  branchChance = 0.4,
  maxLength = 60,
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
    let lastSpawn = 0;
    type Arc = {
      segments: { x: number; y: number }[];
      bornAt: number;
      life: number;
      width: number;
      hot: number; // 0..1 brightness multiplier
    };
    const arcs: Arc[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const buildSegs = (
      x0: number, y0: number, angle: number, len: number, steps: number, jitter: number,
    ) => {
      const segs: { x: number; y: number }[] = [{ x: x0, y: y0 }];
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        segs.push({
          x: x0 + Math.cos(angle) * len * t + (Math.random() - 0.5) * jitter,
          y: y0 + Math.sin(angle) * len * t + (Math.random() - 0.5) * jitter,
        });
      }
      return segs;
    };

    const spawnArc = (delay = 0) => {
      const rect = canvas.getBoundingClientRect();
      const x0 = Math.random() * rect.width;
      const y0 = Math.random() * rect.height;
      const len = 22 + Math.random() * (maxLength - 22);
      const angle = Math.random() * Math.PI * 2;
      const steps = 6 + Math.floor(Math.random() * 6);
      const segs = buildSegs(x0, y0, angle, len, steps, 9);
      const now = performance.now();
      arcs.push({
        segments: segs,
        bornAt: now + delay,
        life: 140 + Math.random() * 180,
        width: 0.9 + Math.random() * 0.8,
        hot: 0.7 + Math.random() * 0.3,
      });

      // Branch
      if (Math.random() < branchChance) {
        const branchFrom = segs[Math.floor(segs.length * (0.3 + Math.random() * 0.4))];
        const bAngle = angle + (Math.random() - 0.5) * Math.PI * 0.7;
        const bLen = len * (0.25 + Math.random() * 0.35);
        const bSegs = buildSegs(branchFrom.x, branchFrom.y, bAngle, bLen, 3 + Math.floor(Math.random() * 3), 6);
        arcs.push({
          segments: bSegs,
          bornAt: now + delay + 20 + Math.random() * 30,
          life: 100 + Math.random() * 80,
          width: 0.4 + Math.random() * 0.3,
          hot: 0.8,
        });
      }
    };

    // Spawn arcs in bursts (2-3 at once, mimicking real lightning strike clusters)
    const spawnBurst = () => {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        spawnArc(i * (20 + Math.random() * 40));
      }
    };

    const drawArc = (a: Arc, alpha: number) => {
      ctx.beginPath();
      ctx.moveTo(a.segments[0].x, a.segments[0].y);
      for (let j = 1; j < a.segments.length; j++) {
        ctx.lineTo(a.segments[j].x, a.segments[j].y);
      }
      // Outer glow
      ctx.lineWidth = a.width + 5;
      ctx.strokeStyle = `rgba(${color} / ${alpha * 0.08})`;
      ctx.stroke();
      // Mid glow
      ctx.lineWidth = a.width + 2.5;
      ctx.strokeStyle = `rgba(${color} / ${alpha * 0.22})`;
      ctx.stroke();
      // Hot core
      ctx.lineWidth = a.width;
      ctx.strokeStyle = `rgba(${color} / ${alpha})`;
      ctx.stroke();
    };

    const tick = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const interval = 1000 / density;
      if (now - lastSpawn > interval) {
        spawnBurst();
        lastSpawn = now;
      }

      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i];
        const age = now - a.bornAt;
        if (age < 0) continue;
        if (age > a.life) {
          arcs.splice(i, 1);
          continue;
        }
        const t = age / a.life;
        // Sharp flash onset (≤8%), rapid exponential decay — realistic lightning
        const alpha = a.hot * (t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 1.8));
        drawArc(a, alpha);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced, density, color, branchChance, maxLength]);

  if (reduced) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
