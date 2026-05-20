import "server-only";
import OpenAI from "openai";

// Singleton OpenAI client. Lazily initialized so the module loads even
// when OPENAI_API_KEY is missing (route handlers return 503).

let cached: OpenAI | null = null;

export function hasLlm(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getLlm(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing. Guard callers with hasLlm().");
  }
  cached = new OpenAI({ apiKey });
  return cached;
}

// Model routing per task. Single source of truth.
// Pricing reference (per 1M tokens, USD, retrieved 2026-05):
//   gpt-4o-mini      :  $0.15 in / $0.60 out
//   gpt-4o           :  $2.50 in / $10.00 out
//   gpt-5-mini       :  $0.25 in / $2.00 out      (if available; falls back via env override)
//   gpt-5            :  $1.25 in / $10.00 out
//
// Classification is the hot path → gpt-4o-mini. Reports/scoring → gpt-4o.
export const MODELS = {
  classify: process.env.OPENAI_CLASSIFY_MODEL || "gpt-4o-mini",
  daily_report: process.env.OPENAI_REPORT_MODEL || "gpt-4o",
  area_scoring: process.env.OPENAI_REPORT_MODEL || "gpt-4o",
  rag_answer: process.env.OPENAI_REPORT_MODEL || "gpt-4o",
  labs_analysis: process.env.OPENAI_REPORT_MODEL || "gpt-4o",
} as const;

export type LlmTask = keyof typeof MODELS;

export const PRICING: Record<string, { in_per_m: number; out_per_m: number }> = {
  "gpt-4o-mini": { in_per_m: 0.15, out_per_m: 0.6 },
  "gpt-4o":      { in_per_m: 2.5,  out_per_m: 10.0 },
  "gpt-5-mini":  { in_per_m: 0.25, out_per_m: 2.0 },
  "gpt-5":       { in_per_m: 1.25, out_per_m: 10.0 },
};

export function estimateCostUsd(
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (tokensIn / 1_000_000) * p.in_per_m + (tokensOut / 1_000_000) * p.out_per_m;
}
