export type PatternDuration = "micro" | "short" | "medium" | "long" | "core";

export function classifyPatternDuration(dayCount: number): PatternDuration {
  if (dayCount <= 2) return "micro";
  if (dayCount <= 7) return "short";
  if (dayCount <= 28) return "medium";
  if (dayCount <= 90) return "long";
  return "core";
}

export function patternLabel(duration: PatternDuration): string {
  const labels: Record<PatternDuration, string> = {
    micro: "Fleeting (1-2 days)",
    short: "Short-term (3-7 days)",
    medium: "Emerging (8-28 days)",
    long: "Established (1-3 months)",
    core: "Core pattern (3+ months)",
  };
  return labels[duration];
}
