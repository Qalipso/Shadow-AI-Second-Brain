// Shared client-side types for Shadow Interventions UI.

export type EnergyLevel = "low" | "medium" | "high";

export type MoodTag =
  | "stuck"
  | "tired"
  | "chaotic"
  | "restless"
  | "bored"
  | "overstimulated";

export type FrictionTag =
  | "cant_start"
  | "cant_choose"
  | "bored"
  | "need_switch"
  | "need_reset";

export type InterventionType =
  | "task_shatter"
  | "dopamine_menu"
  | "context_switch"
  | "interest_filter";

export type ClientState = {
  energy?: EnergyLevel;
  mood?: MoodTag;
  friction?: FrictionTag;
};

export const MOOD_LABEL: Record<MoodTag, string> = {
  stuck: "Stuck",
  tired: "Tired",
  chaotic: "Chaotic",
  restless: "Restless",
  bored: "Bored",
  overstimulated: "Overstimulated",
};

export const FRICTION_LABEL: Record<FrictionTag, string> = {
  cant_start: "I can't start",
  cant_choose: "I can't choose",
  bored: "I'm bored",
  need_switch: "I need to switch",
  need_reset: "I need a reset",
};

export const ENERGY_LABEL: Record<EnergyLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const TOOL_LABELS: Record<
  InterventionType,
  { name: string; short: string; slug: string }
> = {
  task_shatter:    { name: "Task Paralysis Shatter",   short: "Break a frozen task into tiny doable steps.",     slug: "shatter" },
  dopamine_menu:   { name: "Dopamine Menu Architect",  short: "Build a right-now menu based on your energy.",   slug: "menu" },
  context_switch:  { name: "Context Switching Guide",  short: "Move body, senses and mind into the next mode.", slug: "switch" },
  interest_filter: { name: "Interest-Based Filter",    short: "Turn boring work into a themed quest.",          slug: "filter" },
};
