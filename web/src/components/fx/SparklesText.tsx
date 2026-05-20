"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Sparkle = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
};

type Props = {
  children: React.ReactNode;
  count?: number;
  className?: string;
  colors?: string[];
};

// Stable default kept outside the component so its reference doesn't
// change every render — otherwise the seeding useEffect loops forever.
const DEFAULT_COLORS: readonly string[] = [
  "rgba(214, 184, 116, 0.95)",
  "rgba(126, 87, 194, 0.85)",
  "rgba(255, 255, 255, 0.7)",
];

// SparklesText — wraps text with drifting tiny stars. Used sparingly on
// quest names and major triumph headlines only.
export function SparklesText({
  children,
  count = 6,
  className = "",
  colors,
}: Props) {
  const reduced = useShadowReducedMotion();
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    if (reduced) return;
    const palette = colors ?? DEFAULT_COLORS;
    const seed = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 3,
      color: palette[Math.floor(Math.random() * palette.length)],
    }));
    setSparkles(seed);
    // Intentionally exclude `colors` from deps — callers pass a stable
    // array (or omit it). Including it would loop on inline defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, reduced]);

  return (
    <span className={`relative inline-block ${className}`}>
      {sparkles.map((s) => (
        <span
          key={s.id}
          aria-hidden
          className="sparkle-dot"
          style={
            {
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              background: s.color,
              boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
              animationDelay: `${s.delay}s`,
            } as CSSProperties
          }
        />
      ))}
      <span className="relative">{children}</span>
      <style jsx>{`
        .sparkle-dot {
          position: absolute;
          border-radius: 9999px;
          opacity: 0;
          pointer-events: none;
          animation: sparkle-twinkle 3.2s ease-in-out infinite;
        }
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.6); }
          40%      { opacity: 0.95; transform: scale(1); }
          70%      { opacity: 0.3; transform: scale(0.85); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sparkle-dot { animation: none; opacity: 0; }
        }
      `}</style>
    </span>
  );
}
