// Labs scoring engine.
// Converts raw 1-5 Likert answers → normalized 0-100 dimension scores.

export type RawAnswer = {
  question_id: number;
  raw_value: number;
  reverse_scored: boolean;
  dimension: string;
};

export type DimensionScore = {
  dimension: string;
  score: number;       // 0-100
  raw_avg: number;     // 1-5 scale
  question_count: number;
};

// Normalize a single answer: reverse if needed, then map 1-5 → 0-100.
export function normalizeValue(raw: number, reverse: boolean): number {
  const adjusted = reverse ? 6 - raw : raw;
  const value = ((adjusted - 1) / 4) * 100;
  // Clamp to NUMERIC(5,2) safe range — 100.00 exceeds NUMERIC(4,2).
  return Math.min(99.99, Math.max(0, Math.round(value * 100) / 100));
}

// Calculate dimension scores from an array of raw answers.
export function calcDimensionScores(answers: RawAnswer[]): DimensionScore[] {
  const byDimension = new Map<string, { sum: number; normSum: number; count: number }>();

  for (const a of answers) {
    const norm = normalizeValue(a.raw_value, a.reverse_scored);
    const bucket = byDimension.get(a.dimension) ?? { sum: 0, normSum: 0, count: 0 };
    bucket.sum += a.raw_value;
    bucket.normSum += norm;
    bucket.count += 1;
    byDimension.set(a.dimension, bucket);
  }

  const result: DimensionScore[] = [];
  for (const [dimension, { sum, normSum, count }] of byDimension) {
    result.push({
      dimension,
      score: Math.round((normSum / count) * 10) / 10,
      raw_avg: Math.round((sum / count) * 100) / 100,
      question_count: count,
    });
  }

  return result.sort((a, b) => a.dimension.localeCompare(b.dimension));
}

// Convert DimensionScore[] to a plain scores_json record { dimension: score }.
export function scoresToJson(scores: DimensionScore[]): Record<string, number> {
  return Object.fromEntries(scores.map((s) => [s.dimension, s.score]));
}

// Describe a 0-100 score with a short label.
export function scoreLabel(score: number): string {
  if (score >= 80) return "Very high";
  if (score >= 65) return "High";
  if (score >= 45) return "Moderate";
  if (score >= 30) return "Low";
  return "Very low";
}
