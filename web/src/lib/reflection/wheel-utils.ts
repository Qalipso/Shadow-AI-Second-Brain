import type { DailyWheelScore } from "@/types/db";
import type { LifeAreaScore } from "@/types/db";
import type { ReflectionSlot } from "./questions";

// Hardcoded slug → life_area_id mapping (matches seed-fallback + migrations).
const SLUG_TO_ID: Record<ReflectionSlot, number> = {
  work: 1,
  money: 2,
  health: 3,
  energy: 4,
  food: 5,
  mind: 6,
  creativity: 7,
  social: 8,
  emotion: 9,
  discipline: 10,
  environment: 11,
  meaning: 12,
  // psych extras — not in life_areas, won't be mapped to area ids
  autonomy: 0,
  inner_noise: 0,
  self_compassion: 0,
};

const MAIN_SLOTS: ReflectionSlot[] = [
  "work", "money", "health", "energy", "food", "mind",
  "creativity", "social", "emotion", "discipline", "environment", "meaning",
];

/** Convert a DailyWheelScore row → Map<life_area_id, LifeAreaScore>
 *  Confidence = 1 (user submitted = certain).
 *  Only includes areas the user actually rated. */
export function wheelScoreToScoreMap(
  row: DailyWheelScore,
): Map<number, LifeAreaScore> {
  const m = new Map<number, LifeAreaScore>();
  const now = new Date().toISOString();

  for (const slot of MAIN_SLOTS) {
    const raw = row[slot as keyof DailyWheelScore];
    if (raw == null) continue;
    const score = typeof raw === "number" ? raw : Number(raw);
    if (Number.isNaN(score)) continue;
    const life_area_id = SLUG_TO_ID[slot];
    if (!life_area_id) continue;

    m.set(life_area_id, {
      user_id: row.user_id,
      life_area_id,
      score,
      confidence: 1,
      computed_at: row.submitted_at ?? now,
    });
  }

  return m;
}

/** Returns today's date as YYYY-MM-DD in local time.
 *  Must only be called client-side (gated on mounted). */
export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
