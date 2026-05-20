// Mapping helpers between the persisted `Habit` data model and the
// ritual-language UI layer. Keep all DB → ritual translations here so the
// visual components stay simple and presentational.

import type { Habit, HabitLog } from "@/types/db";

export type RhythmLabel = "stable" | "fragile" | "returning" | "fading" | "lost";

export function rhythmLabel(habit: Habit, logs: HabitLog[] = []): RhythmLabel {
  const s = habit.strength_score ?? 0;
  // "returning" if recent activity contains a recovered status
  const recent = logs.slice(0, 7);
  if (recent.some((l) => l.status === "recovered")) return "returning";
  if (s <= 12) return "lost";
  if (s <= 30) return "fading";
  if (s <= 55) return "fragile";
  return "stable";
}

export function rhythmColor(label: RhythmLabel): string {
  switch (label) {
    case "stable":    return "var(--shadow-green)";
    case "returning": return "var(--shadow-gold)";
    case "fragile":   return "var(--accent-warm)";
    case "fading":    return "var(--shadow-red)";
    case "lost":      return "var(--shadow-text-faint)";
  }
}

// Map sphere slug → ritual TYPE label. First matching slug wins.
export function ritualTypeLabel(habit: Habit): string {
  const slugs = habit.sphere_slugs ?? [];
  const map: Record<string, string> = {
    health: "Body",
    energy: "Body",
    food: "Care",
    mind: "Mind",
    creativity: "Creative",
    social: "Social",
    money: "Money",
    work: "Focus",
    environment: "Home",
    discipline: "Focus",
    emotion: "Recovery",
    meaning: "Spiritual",
  };
  for (const s of slugs) {
    if (map[s]) return map[s];
  }
  // Fallback from habit.type
  if (habit.type === "avoidance") return "Recovery";
  if (habit.type === "ritual") return "Care";
  return "Care";
}

export const RITUAL_TYPES = [
  "Care", "Body", "Mind", "Focus", "Recovery",
  "Creative", "Social", "Money", "Home", "Spiritual",
] as const;
export type RitualTypeOption = (typeof RITUAL_TYPES)[number];

export const FREQUENCY_OPTIONS = [
  { value: "daily",          label: "Daily" },
  { value: "specific_days",  label: "Weekdays" },
  { value: "weekly",         label: "Weekly" },
  { value: "times_per_week", label: "Custom" },
] as const;
export type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"];

export const BEST_TIME_OPTIONS = [
  { value: "morning",   label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening",   label: "Evening" },
  { value: "night",     label: "Night" },
  { value: "anytime",   label: "Anytime" },
] as const;
export type BestTimeValue = (typeof BEST_TIME_OPTIONS)[number]["value"];

// Derive best-time bucket from reminder_time "HH:MM"
export function deriveBestTime(habit: Habit): BestTimeValue {
  const t = habit.reminder_time;
  if (!t) return "anytime";
  const hour = parseInt(t.slice(0, 2), 10);
  if (Number.isNaN(hour)) return "anytime";
  if (hour < 11) return "morning";
  if (hour < 16) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

// Map best-time to a default reminder_time string
export function bestTimeToReminder(v: BestTimeValue): string | null {
  switch (v) {
    case "morning":   return "07:30";
    case "afternoon": return "13:00";
    case "evening":   return "19:00";
    case "night":     return "22:00";
    case "anytime":   return null;
  }
}

// Short status label for the ritual card
export function ritualStatusLabel(habit: Habit, todayLog: HabitLog | null): {
  label: string; color: string;
} {
  if (!habit.is_active) return { label: "Paused", color: "var(--shadow-text-faint)" };
  if (todayLog?.status === "done") return { label: "Done", color: "var(--shadow-green)" };
  if (todayLog?.status === "partial") return { label: "Partial", color: "var(--accent-warm)" };
  if (todayLog?.status === "recovered") return { label: "Returned", color: "var(--shadow-gold)" };
  if (todayLog?.status === "skipped") return { label: "Skipped", color: "var(--shadow-text-faint)" };
  const label = rhythmLabel(habit);
  if (label === "fading" || label === "lost") return { label: "Fading", color: "var(--shadow-red)" };
  return { label: "Pending", color: "var(--accent-warm)" };
}

// Sentence describing what the ritual leaves in Shadow.
export function ritualTraceText(habit: Habit): string {
  const s = habit.sphere_slugs ?? [];
  if (s.includes("energy") || s.includes("health")) return "Restores body signal";
  if (s.includes("mind")) return "Clears mind signal";
  if (s.includes("creativity")) return "Anchors creative signal";
  if (s.includes("social")) return "Strengthens connection";
  if (s.includes("emotion")) return "Soothes emotional load";
  if (s.includes("environment")) return "Adds stability signal";
  if (s.includes("money")) return "Compounds money signal";
  if (s.includes("meaning")) return "Roots meaning signal";
  return "Adds a trace to your memory";
}

// Sentence: short purpose. Prefer habit.why, fall back to descriptor.
export function ritualPurpose(habit: Habit): string {
  if (habit.why && habit.why.trim().length > 0) return habit.why.trim();
  const type = ritualTypeLabel(habit).toLowerCase();
  return `${type[0].toUpperCase()}${type.slice(1)} ritual`;
}

// Suggested next move when ritual is pending today.
export function ritualNextMove(habit: Habit): string {
  if (habit.minimum_version && habit.minimum_version.trim().length > 0) {
    return habit.minimum_version.trim();
  }
  return "Return with the smallest possible version today.";
}

// Average rhythm across a list of habits
export function avgRhythm(habits: Habit[]): number {
  const active = habits.filter((h) => h.is_active);
  if (active.length === 0) return 0;
  return Math.round(active.reduce((s, h) => s + (h.strength_score ?? 0), 0) / active.length);
}
