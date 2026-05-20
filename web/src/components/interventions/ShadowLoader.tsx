"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Particles, useShadowReducedMotion } from "@/components/fx";

const MESSAGES = [
  "Shaping a small path through the friction…",
  "Listening to what feels stuck…",
  "Finding the smallest possible first move…",
  "Tuning the ritual to your current state…",
];

// Calm loading state for intervention generation.
// Drifting particles + rotating Shadow voice line.
export function ShadowLoader() {
  const reduced = useShadowReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 2400);
    return () => clearInterval(t);
  }, [reduced]);

  return (
    <section
      className="panel-bloom relative p-8 overflow-hidden anim-fade-in"
      aria-live="polite"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 60% at 20% 30%, rgba(126,87,194,0.16) 0%, transparent 60%), radial-gradient(50% 70% at 90% 80%, rgba(214,184,116,0.10) 0%, transparent 65%)",
        }}
      />
      <Particles count={30} color="126 87 194" maxOpacity={0.4} speed={0.06} />
      <Particles count={18} color="214 184 116" maxOpacity={0.3} speed={0.09} />

      <div className="relative flex items-center gap-4">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--shadow-gold)] dot-breathe" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--shadow-text-faint)]">
            Forming ritual
          </p>
          <div className="h-6 mt-1 relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.14, 1, 0.34, 1] }}
                className="text-sm text-[var(--shadow-text-muted)] italic absolute inset-0"
              >
                {MESSAGES[idx]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
