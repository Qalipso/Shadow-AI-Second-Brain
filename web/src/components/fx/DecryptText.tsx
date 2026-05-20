"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { useShadowReducedMotion } from "./useShadowReducedMotion";

type Props = {
  text: string;
  className?: string;
  glyphs?: string;
  duration?: number;
  delay?: number;
  perCharStep?: number;
  startOnView?: boolean;
  once?: boolean;
};

// DecryptText — char-by-char scramble→resolve reveal. Mystical Shadow vibe.
// Each character starts as a random glyph, then locks to its target left→right.
// Respects reduced-motion (renders final text immediately).
export function DecryptText({
  text,
  className,
  glyphs = "01■□░▒▓◆◇○●▲△▼▽◀▶★☆█▌▐▆▅▄▃ABCDEF#%@&*?+=-_/\\",
  duration = 1.2,
  delay = 0,
  perCharStep = 40,
  startOnView = true,
  once = true,
}: Props) {
  const reduced = useShadowReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, margin: "0px" });
  const [display, setDisplay] = useState(reduced ? text : maskAll(text, glyphs));

  useEffect(() => {
    if (reduced) {
      setDisplay(text);
      return;
    }
    if (startOnView && !inView) return;

    let cancelled = false;
    let raf = 0;
    const len = text.length;
    const start = performance.now() + delay * 1000;
    const totalMs = Math.max(duration * 1000, len * perCharStep);

    const tick = () => {
      if (cancelled) return;
      const now = performance.now();
      const elapsed = Math.max(0, now - start);
      const progress = Math.min(1, elapsed / totalMs);
      const resolvedCount = Math.floor(progress * len);

      let out = "";
      for (let i = 0; i < len; i++) {
        const ch = text[i];
        if (ch === " " || ch === "\n") {
          out += ch;
          continue;
        }
        if (i < resolvedCount) {
          out += ch;
        } else {
          out += glyphs[Math.floor(Math.random() * glyphs.length)];
        }
      }
      setDisplay(out);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [text, reduced, inView, startOnView, glyphs, duration, delay, perCharStep]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {display}
    </span>
  );
}

function maskAll(text: string, glyphs: string): string {
  let out = "";
  for (const ch of text) {
    if (ch === " " || ch === "\n") out += ch;
    else out += glyphs[Math.floor(Math.random() * glyphs.length)];
  }
  return out;
}
