"use client";
import { useShadowReducedMotion } from "@/components/fx";

// SoulCoreOrbit — three drifting particles orbiting at radii 50/65/80px.
// Wraps content in a relatively-positioned container; particles appear
// behind the orb via z-index ordering. Calm, low-opacity, never neon.
export function SoulCoreOrbit({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  const reduced = useShadowReducedMotion();
  return (
    <div className="relative">
      {!reduced && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 m-auto block soul-orbit"
            style={{
              width: 130,
              height: 130,
              borderRadius: "9999px",
              border: `1px solid ${color}22`,
              animation: "soul-orbit-spin-1 22s linear infinite",
            }}
          />
          <span
            aria-hidden
            className="absolute inset-0 m-auto block soul-orbit"
            style={{
              width: 160,
              height: 160,
              borderRadius: "9999px",
              border: `1px solid ${color}14`,
              animation: "soul-orbit-spin-2 34s linear infinite reverse",
            }}
          />
          <span
            aria-hidden
            className="absolute inset-0 m-auto block soul-sat"
            style={{
              width: 6,
              height: 6,
              borderRadius: "9999px",
              background: color,
              boxShadow: `0 0 12px ${color}`,
              animation: "soul-orbit-sat-1 22s linear infinite",
            }}
          />
          <span
            aria-hidden
            className="absolute inset-0 m-auto block soul-sat"
            style={{
              width: 4,
              height: 4,
              borderRadius: "9999px",
              background: "rgba(214,184,116,0.7)",
              boxShadow: "0 0 10px rgba(214,184,116,0.5)",
              animation: "soul-orbit-sat-2 34s linear infinite reverse",
            }}
          />
          <style jsx>{`
            @keyframes soul-orbit-spin-1 { to { transform: rotate(360deg); } }
            @keyframes soul-orbit-spin-2 { to { transform: rotate(360deg); } }
            @keyframes soul-orbit-sat-1 {
              from { transform: rotate(0deg) translateX(65px) rotate(0deg); }
              to   { transform: rotate(360deg) translateX(65px) rotate(-360deg); }
            }
            @keyframes soul-orbit-sat-2 {
              from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
              to   { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
            }
            @media (prefers-reduced-motion: reduce) {
              .soul-orbit, .soul-sat { animation: none !important; }
            }
          `}</style>
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
