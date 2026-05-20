"use client";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

// PageTransition — wraps app router children with a soft fade between routes.
// Reduced-motion → no animation, just direct render.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useShadowReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.14, 1, 0.34, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
