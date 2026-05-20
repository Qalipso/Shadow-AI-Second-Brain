"use client";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  size?: number;        // beam length in px
  duration?: number;    // seconds per orbit
  delay?: number;       // seconds
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number; // px
  className?: string;
};

// BorderBeam — a single rotating gradient streak orbiting the parent's border.
// Inspired by Magic UI's border-beam, retuned to Shadow's gold/violet palette.
// Place inside a `relative` element; the beam absolutely fills its parent.
export function BorderBeam({
  size = 200,
  duration = 10,
  delay = 0,
  colorFrom = "rgba(214, 184, 116, 0.0)",
  colorTo = "rgba(214, 184, 116, 0.75)",
  borderWidth = 1.5,
  className = "",
}: Props) {
  const reduced = useShadowReducedMotion();
  if (reduced) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 rounded-[inherit] [mask-image:linear-gradient(transparent,transparent),linear-gradient(black,black)] [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-mode:match-source,match-source] ${className}`}
      style={{
        border: `${borderWidth}px solid transparent`,
      }}
    >
      <div
        className="absolute aspect-square"
        style={{
          width: `${size}px`,
          offsetPath: "rect(0 auto auto 0 round 0px)",
          background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, ${colorFrom})`,
          animation: `border-beam ${duration}s linear infinite`,
          animationDelay: `${-delay}s`,
        }}
      />
      <style jsx>{`
        @keyframes border-beam {
          to {
            offset-distance: 100%;
          }
        }
      `}</style>
    </div>
  );
}
