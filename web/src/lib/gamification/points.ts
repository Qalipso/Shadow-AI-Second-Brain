// Point thresholds and gamification logic for Shadow.
// Levels are 1-indexed. Threshold[i] = min points for level i+1.

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000] as const;

export const LEVEL_NAMES = [
  "Shadow Seed",
  "Seeker",
  "Observer",
  "Weaver",
  "Architect",
] as const;

export type GamificationResult = {
  pointsEarned: number;
  newTotal: number;
  level: number;
  levelName: string;
  streak: number;
  leveledUp: boolean;
  pointsToNext: number | null;
};

export function levelFromPoints(pts: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (pts >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getLevelName(level: number): string {
  return LEVEL_NAMES[Math.max(0, Math.min(level - 1, LEVEL_NAMES.length - 1))];
}

export function pointsToNext(currentPts: number, level: number): number | null {
  const threshold = LEVEL_THRESHOLDS[level]; // level is 1-indexed, so [level] = next
  return threshold !== undefined ? Math.max(0, threshold - currentPts) : null;
}

export function calcReflectionPoints(opts: {
  answeredMainCount: number;
  answeredPsychCount: number;
  streakDays: number;
}): number {
  const { answeredMainCount, answeredPsychCount, streakDays } = opts;
  // Base: 50 if all 12 main answered, else 4 per question
  const base = answeredMainCount >= 12 ? 50 : answeredMainCount * 4;
  // Psych bonus: 25 if all 3, else 8 per question
  const psychBonus = answeredPsychCount >= 3 ? 25 : answeredPsychCount * 8;
  // Streak bonus: 5 per day, capped at 50 (= 10-day streak)
  const streakBonus = Math.min(streakDays * 5, 50);
  return base + psychBonus + streakBonus;
}
