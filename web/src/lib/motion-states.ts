/**
 * Shadow Motion State Library
 * 7 named state transitions — each tied to a real product event.
 * Rule: no animation unless there is a state change.
 *
 * Usage:
 *   import { motionStates } from "@/lib/motion-states";
 *   <motion.div {...motionStates.fadeIn} />
 *   <motion.div variants={motionStates.stagger.container} initial="hidden" animate="visible">
 */

import type { Variants, Transition } from "motion/react";

// ── Shared easings ────────────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;
const spring: Transition = { type: "spring", stiffness: 400, damping: 30 };

// ── 1. Capture submitted ──────────────────────────────────────────────────────
// Input field shrinks → skeleton loader appears.

export const captureSubmit = {
  input: {
    initial: { scaleX: 1, opacity: 1 },
    animate: { scaleX: 0.96, opacity: 0 },
    transition: { duration: 0.15, ease },
  },
  skeleton: {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease, delay: 0.1 },
  },
} as const;

// ── 2. Parse complete (stagger reveal) ───────────────────────────────────────
// Skeleton fades out, classified fields appear one by one (100ms stagger).

export const parseComplete: { container: Variants; item: Variants } = {
  container: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  },
  item: {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease } },
  },
};

// ── 3. Memory saved ───────────────────────────────────────────────────────────
// Card shrinks and slides to bottom-right (toward Core).

export const memorySaved = {
  initial: { opacity: 1, scale: 1, x: 0, y: 0 },
  animate: { opacity: 0, scale: 0.85, x: 40, y: 40 },
  transition: { duration: 0.35, ease },
} as const;

// ── 4. Life area updated ──────────────────────────────────────────────────────
// Sector pulses twice (scale 1.02 → 1).

export const areaUpdated: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.025, 1, 1.02, 1],
    transition: { duration: 0.6, ease: "easeInOut" },
  },
};

// ── 5. Insight generated ──────────────────────────────────────────────────────
// Fade in with slight rise (−8px → 0).

export const insightGenerated = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease },
} as const;

// ── 6. Error state ────────────────────────────────────────────────────────────
// Shake horizontally.

export const errorShake: Variants = {
  idle: { x: 0 },
  shake: {
    x: [-4, 4, -4, 4, 0],
    transition: { duration: 0.35, ease: "easeInOut" },
  },
};

// ── 7. Private mode toggle ────────────────────────────────────────────────────
// Whole UI desaturates + dims for 300ms transition.

export const privateModeTransition = {
  on: {
    filter: "grayscale(20%) brightness(0.9)",
    transition: { duration: 0.3 },
  },
  off: {
    filter: "grayscale(0%) brightness(1)",
    transition: { duration: 0.3 },
  },
} as const;

// ── Convenience: generic fade in ─────────────────────────────────────────────

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.25, ease },
} as const;

// ── Convenience: slide up ─────────────────────────────────────────────────────

export const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease },
} as const;

// ── Re-export spring for one-off use ─────────────────────────────────────────

export { spring };
