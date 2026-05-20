// Shared option lists and visual maps for Direction drawers.

import type { GoalStatus, GoalType, MissionStatus, TaskPriority, TaskStatus } from "@/types/db";

export const LIFE_AREAS = [
  "work", "money", "health", "energy", "food", "mind",
  "creativity", "social", "emotion", "discipline", "environment", "meaning",
] as const;
export type LifeAreaSlug = (typeof LIFE_AREAS)[number];

export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "outcome",    label: "Outcome" },
  { value: "identity",   label: "Identity" },
  { value: "recovery",   label: "Recovery" },
  { value: "skill",      label: "Skill" },
  { value: "project",    label: "Project" },
  { value: "experiment", label: "Experiment" },
];

export const GOAL_STATUSES: { value: GoalStatus; label: string }[] = [
  { value: "active",    label: "Active" },
  { value: "paused",    label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Archived" },
];

export const MISSION_STATUSES: { value: MissionStatus; label: string }[] = [
  { value: "active",    label: "Active" },
  { value: "paused",    label: "Paused" },
  { value: "blocked",   label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Archived" },
];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "open",    label: "Todo" },
  { value: "done",    label: "Done" },
  { value: "dropped", label: "Dropped" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low",      label: "Low" },
  { value: "medium",   label: "Medium" },
  { value: "high",     label: "High" },
  { value: "critical", label: "Critical" },
];

// Energy cost is stored as integer 0..10. Map UI levels onto numeric value.
export const ENERGY_COSTS = [
  { value: 1, label: "Autopilot" },
  { value: 3, label: "Low" },
  { value: 5, label: "Medium" },
  { value: 7, label: "High" },
  { value: 8, label: "Deep Focus" },
  { value: 9, label: "Emotionally Heavy" },
] as const;

export const STATUS_COLOR: Record<string, string> = {
  active:    "var(--accent-warm)",
  paused:    "var(--shadow-text-faint)",
  blocked:   "var(--shadow-red)",
  completed: "var(--shadow-green)",
  abandoned: "var(--shadow-text-faint)",
  open:      "var(--accent-warm)",
  done:      "var(--shadow-green)",
  dropped:   "var(--shadow-text-faint)",
};

export const SIGNAL_TYPES = [
  { value: "win",      label: "Win" },
  { value: "blocker",  label: "Blocker" },
  { value: "urge",     label: "Urge" },
  { value: "relapse",  label: "Relapse" },
  { value: "thought",  label: "Thought" },
  { value: "emotion",  label: "Emotion" },
  { value: "progress", label: "Progress" },
  { value: "risk",     label: "Risk" },
] as const;
