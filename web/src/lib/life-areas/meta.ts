import { FALLBACK_LIFE_AREAS } from "../seed-fallback";

// Static slug → color/name/icon-token map. Mirrors seed-fallback so client
// code can render area pills without a DB round-trip.

export type LifeAreaMeta = {
  slug: string;
  name: string;
  description: string | null;
  color: string;
  icon: string; // lucide icon name
};

const ICONS: Record<string, string> = {
  work: "Briefcase",
  money: "Wallet",
  health: "Heart",
  energy: "Zap",
  food: "Utensils",
  mind: "Brain",
  creativity: "Palette",
  social: "Users",
  emotion: "Smile",
  discipline: "Target",
  environment: "TreePine",
  meaning: "Compass",
};

export const LIFE_AREA_META: Record<string, LifeAreaMeta> =
  FALLBACK_LIFE_AREAS.reduce(
    (acc, a) => {
      acc[a.slug] = {
        slug: a.slug,
        name: a.name,
        description: a.description,
        color: a.color_hint ?? "#C9A36A",
        icon: ICONS[a.slug] ?? "Circle",
      };
      return acc;
    },
    {} as Record<string, LifeAreaMeta>,
  );

export const SIGNAL_TYPE_TONES: Record<string, string> = {
  thought: "#A38BFF",
  task: "#C9A36A",
  feeling: "#D58CA0",
  question: "#6BB7C9",
  event: "#7FA1C9",
  food: "#A38BFF",
  money: "#6FBF8A",
  goal: "#B86DFF",
  habit: "#C97A6A",
  idea: "#E0B25C",
  mixed: "#8FB46B",
  health: "#6DBFA5",
  memory: "#8B8BCC",
  relationship: "#C98BA3",
  raw: "#5E5867",
};

export function signalTypeColor(type: string | null | undefined): string {
  if (!type) return SIGNAL_TYPE_TONES.raw;
  return SIGNAL_TYPE_TONES[type.toLowerCase()] ?? SIGNAL_TYPE_TONES.raw;
}

export function lifeAreaColor(slug: string | null | undefined): string {
  if (!slug) return "#5E5867";
  return LIFE_AREA_META[slug]?.color ?? "#C9A36A";
}

export function lifeAreaName(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return LIFE_AREA_META[slug]?.name ?? slug;
}
