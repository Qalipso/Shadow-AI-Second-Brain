import { z } from "zod";

// Zod schemas double as runtime validators at the Supabase boundary
// AND as the source of truth for TS types (via z.infer).

// ─── Life Area ─────────────────────────────────────────────────────────────
export const LifeAreaSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  order_index: z.number().int(),
  color_hint: z.string().nullable().optional(),
});
export type LifeArea = z.infer<typeof LifeAreaSchema>;

// ─── Question ──────────────────────────────────────────────────────────────
export const QuestionSchema = z.object({
  id: z.number().int(),
  text: z.string(),
  category: z.string().nullable(),
  type: z.string().nullable(), // open | numeric | yesno
  time_of_day: z.string().nullable(), // morning | day | evening | any
  emotional_depth: z.number().int().nullable(),
  weight: z.number().nullable(),
  is_active: z.boolean().nullable().optional(),
  is_state_question: z.boolean().nullable().optional(),
  state_key: z.string().nullable().optional(), // mood | energy | stress
});
export type Question = z.infer<typeof QuestionSchema>;

// ─── Entry ─────────────────────────────────────────────────────────────────
export const EntryStatusSchema = z.enum(["unprocessed", "processed", "failed"]);
export type EntryStatus = z.infer<typeof EntryStatusSchema>;

export const EntrySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  raw_text: z.string(),
  summary: z.string().nullable(),
  entry_type: z.string().nullable(),
  life_area_id: z.number().int().nullable(),
  emotion_primary: z.string().nullable(),
  emotion_intensity: z.number().int().nullable(),
  status: EntryStatusSchema,
  created_at: z.string(),
});
export type Entry = z.infer<typeof EntrySchema>;

// ─── Question Answer ───────────────────────────────────────────────────────
export const QuestionAnswerSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  question_id: z.number().int(),
  value_text: z.string().nullable(),
  value_numeric: z.number().nullable(),
  created_at: z.string(),
});
export type QuestionAnswer = z.infer<typeof QuestionAnswerSchema>;

// Task and Goal types defined in Direction section below

// ─── Entry ↔ Life Area (junction, many-to-many) ────────────────────────────
export const EntryLifeAreaSchema = z.object({
  entry_id: z.string().uuid(),
  life_area_id: z.number().int(),
  is_primary: z.boolean().optional(),
  created_at: z.string().optional(),
});
export type EntryLifeArea = z.infer<typeof EntryLifeAreaSchema>;

// ─── Life Area Score ───────────────────────────────────────────────────────
export const ScorePeriodType = z.enum(["daily", "weekly", "monthly"]);
export type ScorePeriodType = z.infer<typeof ScorePeriodType>;

export const LifeAreaScoreSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  life_area_id: z.number().int(),
  score: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1).nullable(),
  computed_at: z.string(),
  period_type: ScorePeriodType.optional(),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
  data_volume: z.number().int().optional(),
});
export type LifeAreaScore = z.infer<typeof LifeAreaScoreSchema>;

// ─── Daily Report ─────────────────────────────────────────────────────────
export const DailyReportSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  report_date: z.string(), // YYYY-MM-DD
  body: z.string(),
  confidence: z.number().min(0).max(1).nullable(),
  headline: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
export type DailyReport = z.infer<typeof DailyReportSchema>;

// ─── Daily Wheel Score (user self-assessment) ─────────────────────────────
const scoreCol = z.number().int().min(0).max(10).nullable();

export const DailyWheelScoreSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  scored_date: z.string(), // YYYY-MM-DD
  // 12 main life areas
  work: scoreCol,
  money: scoreCol,
  health: scoreCol,
  energy: scoreCol,
  food: scoreCol,
  mind: scoreCol,
  creativity: scoreCol,
  social: scoreCol,
  emotion: scoreCol,
  discipline: scoreCol,
  environment: scoreCol,
  meaning: scoreCol,
  // 3 optional psych extras
  autonomy: scoreCol,
  inner_noise: scoreCol,
  self_compassion: scoreCol,
  submitted_at: z.string().optional(),
  created_at: z.string().optional(),
});
export type DailyWheelScore = z.infer<typeof DailyWheelScoreSchema>;

// ─── Habits (LifeOS Protocols) ─────────────────────────────────────────────

export const HabitTypeSchema = z.enum(["binary", "measurable", "timer", "avoidance", "ritual"]);
export type HabitType = z.infer<typeof HabitTypeSchema>;

export const HabitDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type HabitDifficulty = z.infer<typeof HabitDifficultySchema>;

export const HabitPrioritySchema = z.enum(["low", "medium", "high"]);
export type HabitPriority = z.infer<typeof HabitPrioritySchema>;

export const HabitScheduleSchema = z.object({
  type: z.enum(["daily", "weekly", "specific_days", "times_per_week"]),
  daysOfWeek: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).optional(),
  timesPerWeek: z.number().int().optional(),
  timeWindow: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});
export type HabitSchedule = z.infer<typeof HabitScheduleSchema>;

export const HabitSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  type: HabitTypeSchema,
  sphere_slugs: z.array(z.string()),
  schedule: HabitScheduleSchema,
  target_value: z.number().nullable(),
  target_unit: z.string().nullable(),
  minimum_version: z.string().nullable(),
  ideal_version: z.string().nullable(),
  why: z.string().nullable(),
  difficulty: HabitDifficultySchema,
  priority: HabitPrioritySchema,
  evidence_types: z.array(z.string()),
  reminder_enabled: z.boolean(),
  reminder_time: z.string().nullable(),
  is_active: z.boolean(),
  strength_score: z.number().min(0).max(100),
  streak_current: z.number().int(),
  streak_best: z.number().int(),
  completion_rate: z.number().min(0).max(100),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Habit = z.infer<typeof HabitSchema>;

export const HabitLogStatusSchema = z.enum(["done", "partial", "skipped", "missed", "failed", "recovered"]);
export type HabitLogStatus = z.infer<typeof HabitLogStatusSchema>;

export const HabitLogSchema = z.object({
  id: z.string().uuid(),
  habit_id: z.string().uuid(),
  user_id: z.string().uuid(),
  log_date: z.string(), // YYYY-MM-DD
  status: HabitLogStatusSchema,
  value: z.number().nullable(),
  note: z.string().nullable(),
  mood_after: z.number().int().min(1).max(10).nullable(),
  energy_after: z.number().int().min(1).max(10).nullable(),
  reason_if_skipped: z.string().nullable(),
  reason_if_failed: z.string().nullable(),
  points_awarded: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type HabitLog = z.infer<typeof HabitLogSchema>;

// ─── Soul Core ─────────────────────────────────────────────────────────────

export const SoulEventTypeSchema = z.enum(["award", "reset", "milestone"]);
export type SoulEventType = z.infer<typeof SoulEventTypeSchema>;

export const SoulSourceTypeSchema = z.enum([
  "habit_log", "task", "daily_review", "life_circle",
  "inbox", "goal", "weekly_review",
]);
export type SoulSourceType = z.infer<typeof SoulSourceTypeSchema>;

export const UserSoulStateSchema = z.object({
  user_id: z.string().uuid(),
  current_souls: z.number().int(),
  lifetime_souls: z.number().int(),
  cycle_souls: z.number().int(),
  best_cycle_souls: z.number().int(),
  cycle_started_at: z.string().nullable(),
  last_qualifying_activity_at: z.string().nullable(),
  reset_count: z.number().int(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type UserSoulState = z.infer<typeof UserSoulStateSchema>;

export const SoulEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_type: SoulEventTypeSchema,
  source_type: SoulSourceTypeSchema.nullable(),
  source_id: z.string().uuid().nullable(),
  amount: z.number().int(),
  reason: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  occurred_at: z.string(),
});
export type SoulEvent = z.infer<typeof SoulEventSchema>;

// ─── AI Processing Log ─────────────────────────────────────────────────────
export const AiProcessingLogSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().nullable(),
  task: z.string(), // "classify" | "score" | "report" | "embed"
  model: z.string(),
  latency_ms: z.number().int().nullable(),
  tokens_in: z.number().int().nullable(),
  tokens_out: z.number().int().nullable(),
  cost_usd: z.number().nullable(),
  ok: z.boolean(),
  created_at: z.string(),
});
export type AiProcessingLog = z.infer<typeof AiProcessingLogSchema>;

// ─── Direction: Goals, Missions, Tasks ────────────────────────────────────

export const GoalStatusSchema = z.enum(["active", "paused", "completed", "abandoned"]);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const GoalTypeSchema = z.enum(["outcome","identity","recovery","skill","project","experiment"]);
export type GoalType = z.infer<typeof GoalTypeSchema>;

export const GoalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  why: z.string().nullable(),
  linked_life_areas: z.array(z.string()).default([]),
  goal_type: z.string().nullable().optional(),
  clarity_score: z.number().int().min(0).max(10).nullable(),
  energy_score: z.number().int().min(0).max(10).nullable(),
  progress: z.number().int().min(0).max(100).default(0),
  status: GoalStatusSchema.default("active"),
  life_area_id: z.number().nullable(),
  deadline: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const MissionStatusSchema = z.enum(["active", "paused", "completed", "blocked", "abandoned"]);
export type MissionStatus = z.infer<typeof MissionStatusSchema>;

export const MissionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  goal_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: MissionStatusSchema.default("active"),
  progress: z.number().int().min(0).max(100).default(0),
  linked_life_areas: z.array(z.string()).default([]),
  blocker: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});
export type Mission = z.infer<typeof MissionSchema>;

export const TaskStatusSchema = z.enum(["open", "done", "dropped"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema.default("open"),
  priority: TaskPrioritySchema.nullable(),
  goal_id: z.string().uuid().nullable(),
  mission_id: z.string().uuid().nullable(),
  linked_entry_id: z.string().uuid().nullable(),
  energy_cost: z.number().int().min(0).max(10).nullable(),
  linked_life_areas: z.array(z.string()).default([]),
  created_from_inbox: z.boolean().default(false),
  due_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

// ─── Labs: Self-Knowledge Laboratory ──────────────────────────────────────

export const LabsTestSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  version: z.string(),
  source_type: z.string(),
  estimated_minutes: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type LabsTest = z.infer<typeof LabsTestSchema>;

export const LabsQuestionSchema = z.object({
  id: z.number().int(),
  test_id: z.number().int(),
  question_text: z.string(),
  question_key: z.string(),
  dimension: z.string(),
  reverse_scored: z.boolean(),
  order_index: z.number().int(),
  answer_type: z.string(),
  metadata_json: z.record(z.unknown()).nullable().optional(),
  created_at: z.string(),
});
export type LabsQuestion = z.infer<typeof LabsQuestionSchema>;

export const LabsAnswerOptionSchema = z.object({
  id: z.number().int(),
  question_id: z.number().int(),
  label: z.string(),
  value: z.number().int(),
  order_index: z.number().int(),
});
export type LabsAnswerOption = z.infer<typeof LabsAnswerOptionSchema>;

export const LabsSessionStatusSchema = z.enum(["in_progress", "completed", "abandoned"]);
export type LabsSessionStatus = z.infer<typeof LabsSessionStatusSchema>;

export const LabsSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  test_id: z.number().int(),
  status: LabsSessionStatusSchema,
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  duration_seconds: z.number().int().nullable().optional(),
  test_version: z.string(),
  created_at: z.string(),
});
export type LabsSession = z.infer<typeof LabsSessionSchema>;

export const LabsAnswerSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  question_id: z.number().int(),
  raw_value: z.number().int(),
  normalized_value: z.number(),
  created_at: z.string(),
});
export type LabsAnswer = z.infer<typeof LabsAnswerSchema>;

export const LabsResultSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  test_id: z.number().int(),
  session_id: z.string().uuid(),
  scores_json: z.record(z.number()),
  interpretation_json: z.record(z.unknown()),
  ai_summary_text: z.string().nullable().optional(),
  confidence_level: z.number().nullable().optional(),
  created_at: z.string(),
});
export type LabsResult = z.infer<typeof LabsResultSchema>;

export const ProfileAiSummarySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  summary_text: z.string().nullable().optional(),
  personality_json: z.record(z.unknown()).optional(),
  values_json: z.record(z.unknown()).optional(),
  current_state_json: z.record(z.unknown()).optional(),
  communication_preferences_json: z.record(z.unknown()).optional(),
  updated_from_sources_json: z.array(z.unknown()).optional(),
  last_generated_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProfileAiSummary = z.infer<typeof ProfileAiSummarySchema>;

export const MemoryTypeSchema = z.enum([
  "profile", "episodic", "behavioral", "goal",
  "current_state", "preference", "insight", "relationship",
]);
export type MemoryType = z.infer<typeof MemoryTypeSchema>;

export const MemoryItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  source_type: z.string(),
  source_id: z.string().nullable().optional(),
  source_object_id: z.string().nullable().optional(),
  title: z.string(),
  content: z.string(),
  memory_type: MemoryTypeSchema.default("insight"),
  importance: z.number().int().min(1).max(5),
  stability: z.string(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  tags: z.array(z.string()),
  expires_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MemoryItem = z.infer<typeof MemoryItemSchema>;

// ─── Memory Graph ──────────────────────────────────────────────────────────

export const MemoryNodeTypeSchema = z.enum([
  "user_profile", "value", "goal", "project", "habit", "emotion",
  "event", "pattern", "risk", "preference", "person", "place",
  "decision", "insight", "current_state",
]);
export type MemoryNodeType = z.infer<typeof MemoryNodeTypeSchema>;

export const MemoryEdgeTypeSchema = z.enum([
  "supports", "blocks", "triggers", "repeats_in", "belongs_to",
  "contradicts", "strengthens", "weakens", "causes", "related_to",
]);
export type MemoryEdgeType = z.infer<typeof MemoryEdgeTypeSchema>;

export const MemoryGraphNodeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  node_type: MemoryNodeTypeSchema,
  label: z.string(),
  description: z.string().nullable().optional(),
  data_json: z.record(z.unknown()).default({}),
  importance: z.number().int().min(1).max(5),
  source_type: z.string().nullable().optional(),
  source_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MemoryGraphNode = z.infer<typeof MemoryGraphNodeSchema>;

export const MemoryGraphEdgeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  from_node_id: z.string().uuid(),
  to_node_id: z.string().uuid(),
  edge_type: MemoryEdgeTypeSchema,
  weight: z.number().min(0).max(1),
  data_json: z.record(z.unknown()).default({}),
  created_at: z.string(),
});
export type MemoryGraphEdge = z.infer<typeof MemoryGraphEdgeSchema>;

// ─── Knowledge Gaps ────────────────────────────────────────────────────────

export const KnowledgeGapStatusSchema = z.enum(["open", "questioning", "answered", "dismissed"]);
export type KnowledgeGapStatus = z.infer<typeof KnowledgeGapStatusSchema>;

export const KnowledgeGapSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  reason: z.string(),
  source: z.string(),
  area: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(5),
  status: KnowledgeGapStatusSchema.default("open"),
  created_at: z.string(),
  updated_at: z.string(),
});
export type KnowledgeGap = z.infer<typeof KnowledgeGapSchema>;

// ─── AI Questions ──────────────────────────────────────────────────────────

export const AIQuestionTypeSchema = z.enum([
  "identity", "motivation", "friction", "pattern", "context",
  "reflection", "goal", "habit", "emotional_state",
]);
export type AIQuestionType = z.infer<typeof AIQuestionTypeSchema>;

export const AIQuestionStatusSchema = z.enum([
  "pending", "shown", "answered", "skipped", "snoozed", "dismissed",
]);
export type AIQuestionStatus = z.infer<typeof AIQuestionStatusSchema>;

export const AIQuestionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  gap_id: z.string().uuid().nullable().optional(),
  question_text: z.string(),
  question_type: AIQuestionTypeSchema,
  status: AIQuestionStatusSchema.default("pending"),
  shown_at: z.string().nullable().optional(),
  snoozed_until: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AIQuestion = z.infer<typeof AIQuestionSchema>;

export const AIQuestionAnswerSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  question_id: z.string().uuid(),
  answer_text: z.string(),
  memory_item_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
});
export type AIQuestionAnswer = z.infer<typeof AIQuestionAnswerSchema>;

// ─── Daily Check-in ────────────────────────────────────────────────────────

export const DailyCheckinSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  energy: z.number().int().min(0).max(5).nullable().optional(),
  mood: z.number().int().min(-5).max(5).nullable().optional(),
  mental_noise: z.number().int().min(0).max(5).nullable().optional(),
  body_state: z.number().int().min(0).max(5).nullable().optional(),
  focus: z.number().int().min(0).max(5).nullable().optional(),
  inbox_dump: z.string().nullable().optional(),
  today_focus: z.string().nullable().optional(),
  today_focus_custom: z.string().nullable().optional(),
  habit_id_today: z.string().uuid().nullable().optional(),
  linked_goal_id: z.string().uuid().nullable().optional(),
  insight_text: z.string().nullable().optional(),
  ai_question_id: z.string().uuid().nullable().optional(),
  ai_question_answer: z.string().nullable().optional(),
  today_initiative_text: z.string().nullable().optional(),
  today_initiative_json: z.record(z.unknown()).nullable().optional(),
  ai_processed: z.boolean().default(false),
  ai_processed_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DailyCheckin = z.infer<typeof DailyCheckinSchema>;

// ─── Shadow Initiatives ────────────────────────────────────────────────────

export const InitiativeTypeSchema = z.enum([
  "observation", "question", "pattern", "recovery", "goal",
  "habit", "memory_gap", "productive_nudge", "reflection_prompt",
]);
export type InitiativeType = z.infer<typeof InitiativeTypeSchema>;

export const PatternDurationSchema = z.enum(["micro", "short", "medium", "long", "core"]);
export type PatternDuration = z.infer<typeof PatternDurationSchema>;

export const InitiativeStatusSchema = z.enum([
  "active", "accepted", "done", "snoozed", "dismissed", "expired",
]);
export type InitiativeStatus = z.infer<typeof InitiativeStatusSchema>;

export const ShadowInitiativeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  reason: z.string(),
  suggested_action: z.string().nullable().optional(),
  initiative_type: InitiativeTypeSchema,
  linked_area: z.string().nullable().optional(),
  source_signals: z.array(z.unknown()).default([]),
  priority: z.number().int().min(1).max(5),
  pattern_duration: PatternDurationSchema.nullable().optional(),
  status: InitiativeStatusSchema.default("active"),
  expires_at: z.string().nullable().optional(),
  snoozed_until: z.string().nullable().optional(),
  source_checkin_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ShadowInitiative = z.infer<typeof ShadowInitiativeSchema>;
