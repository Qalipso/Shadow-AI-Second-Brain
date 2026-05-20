"use client";
import { useRef, type ReactNode } from "react";
import { AnimatedBeam } from "@/components/fx";

// IdentityZone — wraps Soul orb + CheckInHero and draws a neural beam
// between them. Used on /dashboard Zone A.
//
// Children are passed as named slots so server components (SoulCoreHero,
// CheckInHero) keep async data fetching while the wrapper is a client
// component for refs + framer-motion.
export function IdentityZone({
  orb,
  checkin,
}: {
  orb: ReactNode;
  checkin: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const checkinRef = useRef<HTMLDivElement>(null);

  return (
    <section ref={containerRef} className="relative mt-6 space-y-4">
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={orbRef}
        toRef={checkinRef}
        curvature={40}
        duration={6}
        pathWidth={1.4}
        pathOpacity={0.10}
        gradientStartColor="rgba(214, 184, 116, 0)"
        gradientStopColor="rgba(214, 184, 116, 0.7)"
      />
      <div ref={orbRef}>{orb}</div>
      <div ref={checkinRef}>{checkin}</div>
    </section>
  );
}
