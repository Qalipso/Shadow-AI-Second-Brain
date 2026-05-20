import { z } from "zod";

export const InterventionType = z.enum([
  "task_shatter",
  "dopamine_menu",
  "context_switch",
  "interest_filter",
]);
export type InterventionType = z.infer<typeof InterventionType>;

export const EnergyLevel = z.enum(["low", "medium", "high"]);
export type EnergyLevel = z.infer<typeof EnergyLevel>;

export const MoodTag = z.enum([
  "stuck",
  "tired",
  "chaotic",
  "restless",
  "bored",
  "overstimulated",
]);
export type MoodTag = z.infer<typeof MoodTag>;

export const FrictionTag = z.enum([
  "cant_start",
  "cant_choose",
  "bored",
  "need_switch",
  "need_reset",
]);
export type FrictionTag = z.infer<typeof FrictionTag>;

// ─── Per-tool input schemas ───────────────────────────────────────────────

export const TaskShatterInput = z.object({
  task: z.string().min(2).max(800),
  notes: z.string().max(800).optional(),
});

export const DopamineMenuInput = z.object({
  intent: z.string().max(400).optional(),
});

export const ContextSwitchInput = z.object({
  finished: z.string().min(1).max(400),
  next: z.string().min(1).max(400),
});

export const InterestFilterInput = z.object({
  task: z.string().min(2).max(400),
  interest: z.string().min(2).max(200),
});

export const GenerateRequest = z.object({
  type: InterventionType,
  energyLevel: EnergyLevel.optional(),
  mood: MoodTag.optional(),
  friction: FrictionTag.optional(),
  input: z.unknown(),
});

// ─── Result shapes (the AI must return one of these) ───────────────────────

export const Step = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(""),
  estimatedMinutes: z.number().int().min(1).max(120).optional(),
});
export type Step = z.infer<typeof Step>;

export const TaskShatterResult = z.object({
  kind: z.literal("task_shatter"),
  whyHeavy: z.string(),
  firstAction: z.string(),
  steps: z.array(Step).min(3).max(10),
  reward: z.string(),
});

export const DopamineMenuItem = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedMinutes: z.number().int().min(1).max(60),
});

export const DopamineMenuResult = z.object({
  kind: z.literal("dopamine_menu"),
  mode: z.string(),
  appetizers: z.array(DopamineMenuItem).min(3).max(6),
  entrees: z.array(DopamineMenuItem).min(3).max(6),
  sides: z.array(DopamineMenuItem).min(3).max(6),
});

export const ContextSwitchResult = z.object({
  kind: z.literal("context_switch"),
  title: z.string(),
  physical: z.string(),
  sensory: z.string(),
  mental: z.string(),
  mantra: z.string(),
  firstAction: z.string(),
});

export const QuestStage = z.object({
  name: z.string(),
  action: z.string(),
  miniReward: z.string(),
});

export const InterestFilterResult = z.object({
  kind: z.literal("interest_filter"),
  questName: z.string(),
  theme: z.string(),
  stages: z.array(QuestStage).length(3),
  finalUnlock: z.string(),
});

export const InterventionResult = z.discriminatedUnion("kind", [
  TaskShatterResult,
  DopamineMenuResult,
  ContextSwitchResult,
  InterestFilterResult,
]);
export type InterventionResult = z.infer<typeof InterventionResult>;

// ─── DB row shape ──────────────────────────────────────────────────────────

export const InterventionRow = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  type: InterventionType,
  user_input: z.record(z.string(), z.unknown()),
  energy_level: EnergyLevel.nullable(),
  mood: z.string().nullable(),
  friction: z.string().nullable(),
  result_json: z.unknown(),
  first_action: z.string().nullable(),
  status: z.enum(["draft", "active", "completed", "archived", "dismissed"]),
  saved_to_memory: z.boolean(),
  converted_to_tasks: z.boolean(),
  added_to_today: z.boolean(),
  created_at: z.string(),
});
export type InterventionRow = z.infer<typeof InterventionRow>;

export const TOOL_META: Record<
  InterventionType,
  {
    name: string;
    short: string;
    when: string;
    example: string;
    slug: string;
  }
> = {
  task_shatter: {
    name: "Task Paralysis Shatter",
    short: "Break a frozen task into tiny doable steps.",
    when: "When a task feels heavy, vague, or emotionally loaded.",
    example: "Update my CV",
    slug: "shatter",
  },
  dopamine_menu: {
    name: "Dopamine Menu Architect",
    short: "Build a right-now menu based on your energy.",
    when: "When you can't choose what to do next.",
    example: "Low energy, need a small win",
    slug: "menu",
  },
  context_switch: {
    name: "Context Switching Guide",
    short: "Move body, senses, and mind into the next mode.",
    when: "When transitioning between very different tasks.",
    example: "From emails to deep design work",
    slug: "switch",
  },
  interest_filter: {
    name: "Interest-Based Filter",
    short: "Turn boring work into a themed quest.",
    when: "When admin work feels unbearable but must get done.",
    example: "Organize invoices · theme: dark fantasy",
    slug: "filter",
  },
};

export function slugToType(slug: string): InterventionType | null {
  for (const [type, meta] of Object.entries(TOOL_META)) {
    if (meta.slug === slug) return type as InterventionType;
  }
  return null;
}
