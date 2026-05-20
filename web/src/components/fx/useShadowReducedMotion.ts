"use client";
import { useReducedMotion } from "motion/react";

// Single source of truth for motion preference across Shadow FX components.
// Centralising here means future global overrides (e.g. data-attr toggle on
// <body>) can be added without touching every component.
export function useShadowReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}
