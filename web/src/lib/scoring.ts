import "server-only";

// Hybrid scoring engine. Computes factual signals per life area,
// then combines with optional AI-provided confidence adjustments.
// Score = weighted average of factual signals, not AI-generated numbers.

export type AreaFacts = {
  areaId: number;
  slug: string;
  name: string;
  // Volume signals
  entriesTotal7d: number;
  entriesToday: number;
  // Emotion signals
  emotionPositive: number; // count of positive-coded emotions
  emotionNegative: number; // count of negative-coded emotions
  emotionNeutral: number;
  // Task signals
  tasksCompleted: number;
  tasksOpen: number;
  // Recency: ms since last entry (lower = better)
  msSinceLastEntry: number | null;
  // State question answers (mood/energy/stress) — last value if relevant
  stateValue: number | null; // 1-10 numeric answer
};

export type AiAdjustment = {
  slug: string;
  rationale: string;
  confidence_adjustment: number; // -0.2 to +0.2
};

export type ComputedScore = {
  areaId: number;
  slug: string;
  score: number; // 0-10
  confidence: number; // 0-1
  rationale: string | null;
  dataVolume: number;
};

// Positive-leaning emotion keywords
const POSITIVE_EMOTIONS = new Set([
  "joy", "happy", "excited", "grateful", "proud", "calm", "hopeful",
  "content", "love", "amused", "inspired", "confident", "relieved",
  "peaceful", "energetic", "optimistic", "satisfied", "cheerful",
]);

const NEGATIVE_EMOTIONS = new Set([
  "sad", "angry", "anxious", "frustrated", "stressed", "overwhelmed",
  "tired", "lonely", "guilty", "ashamed", "fearful", "irritated",
  "disappointed", "hopeless", "exhausted", "worried", "insecure",
  "bored", "jealous", "resentful",
]);

export function classifyEmotion(emotion: string | null): "positive" | "negative" | "neutral" {
  if (!emotion) return "neutral";
  const lower = emotion.toLowerCase().trim();
  if (POSITIVE_EMOTIONS.has(lower)) return "positive";
  if (NEGATIVE_EMOTIONS.has(lower)) return "negative";
  return "neutral";
}

// --- Signal computations (each returns 0-10) ---

function volumeSignal(entries7d: number): number {
  // Median expectation: ~7 entries/week = 1/day
  // 0 entries = 0, 1-2 = 3, 3-5 = 5, 6-9 = 7, 10+ = 9
  if (entries7d === 0) return 0;
  if (entries7d <= 2) return 3;
  if (entries7d <= 5) return 5;
  if (entries7d <= 9) return 7;
  return Math.min(10, 8 + entries7d * 0.1);
}

function emotionSignal(pos: number, neg: number, neutral: number): number {
  const total = pos + neg + neutral;
  if (total === 0) return 5; // neutral default
  const positiveRatio = pos / total;
  const negativeRatio = neg / total;
  // Scale: pure negative = 2, balanced = 5, pure positive = 8
  return Math.max(0, Math.min(10, 5 + (positiveRatio - negativeRatio) * 5));
}

function taskSignal(completed: number, open: number): number {
  const total = completed + open;
  if (total === 0) return 5; // neutral — no tasks
  const ratio = completed / total;
  return Math.min(10, 3 + ratio * 7); // 3 (none done) to 10 (all done)
}

function recencySignal(msSinceLastEntry: number | null): number {
  if (msSinceLastEntry == null) return 0;
  const hours = msSinceLastEntry / (1000 * 60 * 60);
  // < 6h = 9, < 24h = 7, < 48h = 5, < 7d = 3, else 1
  if (hours < 6) return 9;
  if (hours < 24) return 7;
  if (hours < 48) return 5;
  if (hours < 168) return 3;
  return 1;
}

function stateSignal(value: number | null): number {
  if (value == null) return 5; // neutral
  return Math.max(0, Math.min(10, value));
}

// --- Weights per signal ---
const WEIGHTS = {
  volume: 0.25,
  emotion: 0.25,
  task: 0.15,
  recency: 0.20,
  state: 0.15,
};

export function computeScore(facts: AreaFacts, aiAdj?: AiAdjustment): ComputedScore {
  const vol = volumeSignal(facts.entriesTotal7d);
  const emo = emotionSignal(facts.emotionPositive, facts.emotionNegative, facts.emotionNeutral);
  const tsk = taskSignal(facts.tasksCompleted, facts.tasksOpen);
  const rec = recencySignal(facts.msSinceLastEntry);
  const st = stateSignal(facts.stateValue);

  const baseScore =
    vol * WEIGHTS.volume +
    emo * WEIGHTS.emotion +
    tsk * WEIGHTS.task +
    rec * WEIGHTS.recency +
    st * WEIGHTS.state;

  // AI can nudge score by up to 0.5 via confidence_adjustment
  const adjustment = aiAdj ? Math.max(-0.5, Math.min(0.5, aiAdj.confidence_adjustment * 2.5)) : 0;
  const finalScore = Math.max(0, Math.min(10, baseScore + adjustment));

  // Confidence based on data volume + recency
  const dataVolume = facts.entriesTotal7d + facts.tasksCompleted + facts.tasksOpen + (facts.stateValue != null ? 1 : 0);
  const volumeConf = dataVolume >= 8 ? 1 : dataVolume >= 3 ? 0.6 : dataVolume >= 1 ? 0.3 : 0;
  const recencyConf = facts.msSinceLastEntry != null ? (facts.msSinceLastEntry < 86400000 ? 1 : 0.5) : 0;
  const confidence = Math.max(0, Math.min(1, (volumeConf * 0.7 + recencyConf * 0.3)));

  return {
    areaId: facts.areaId,
    slug: facts.slug,
    score: Math.round(finalScore * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    rationale: aiAdj?.rationale ?? null,
    dataVolume,
  };
}

// Confidence gating labels (for UI)
export function confidenceGate(dataVolume: number): "none" | "low" | "normal" | "high" {
  if (dataVolume < 3) return "none"; // "Not enough data"
  if (dataVolume < 8) return "low";  // score + low confidence badge
  return "normal"; // score + rationale + trend
}
