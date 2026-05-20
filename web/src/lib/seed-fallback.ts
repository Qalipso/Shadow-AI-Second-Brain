import type { LifeArea, Question } from "@/types/db";

// Deterministic fallback data used when Supabase env is empty (dev mode).
// Mirrors the seed migrations so the UI shape is identical with or without DB.
// Order + slugs MUST match `db/seeds/life_areas.sql`.

export const FALLBACK_LIFE_AREAS: LifeArea[] = [
  { id: 1, slug: "work", name: "Work", description: "Career, focus, output", order_index: 1, color_hint: "#C9A36A" },
  { id: 2, slug: "money", name: "Money", description: "Income, spending, runway", order_index: 2, color_hint: "#6FBF8A" },
  { id: 3, slug: "health", name: "Health", description: "Body, sleep, movement", order_index: 3, color_hint: "#E36161" },
  { id: 4, slug: "energy", name: "Energy", description: "Daily fuel + recovery", order_index: 4, color_hint: "#E0B25C" },
  { id: 5, slug: "food", name: "Food", description: "Eating + nutrition", order_index: 5, color_hint: "#A38BFF" },
  { id: 6, slug: "mind", name: "Mind", description: "Thoughts, focus, learning", order_index: 6, color_hint: "#6D7BFF" },
  { id: 7, slug: "creativity", name: "Creativity", description: "Making, ideas, expression", order_index: 7, color_hint: "#6BB7C9" },
  { id: 8, slug: "social", name: "Social", description: "People, relationships", order_index: 8, color_hint: "#D58CA0" },
  { id: 9, slug: "emotion", name: "Emotion", description: "Feeling, mood, processing", order_index: 9, color_hint: "#8FB46B" },
  { id: 10, slug: "discipline", name: "Discipline", description: "Habits, follow-through", order_index: 10, color_hint: "#C97A6A" },
  { id: 11, slug: "environment", name: "Environment", description: "Space, surroundings", order_index: 11, color_hint: "#7FA1C9" },
  { id: 12, slug: "meaning", name: "Meaning", description: "Purpose, direction", order_index: 12, color_hint: "#B86DFF" },
];

// Small sample of questions to keep the dashboard daily-list non-empty in dev.
export const FALLBACK_QUESTIONS: Question[] = [
  { id: 1, text: "How is your mood right now (1–10)?", category: "state", type: "numeric", time_of_day: "any", emotional_depth: 1, weight: 1.0, is_active: true, is_state_question: true, state_key: "mood" },
  { id: 2, text: "How is your energy right now (1–10)?", category: "state", type: "numeric", time_of_day: "any", emotional_depth: 1, weight: 1.0, is_active: true, is_state_question: true, state_key: "energy" },
  { id: 3, text: "How is your stress right now (1–10)?", category: "state", type: "numeric", time_of_day: "any", emotional_depth: 1, weight: 1.0, is_active: true, is_state_question: true, state_key: "stress" },
  { id: 4, text: "What is the one thing you must do today?", category: "intent", type: "open", time_of_day: "morning", emotional_depth: 2, weight: 1.0, is_active: true, is_state_question: false, state_key: null },
  { id: 5, text: "What is occupying your mind most right now?", category: "reflection", type: "open", time_of_day: "any", emotional_depth: 3, weight: 1.0, is_active: true, is_state_question: false, state_key: null },
  { id: 6, text: "What did you avoid today and why?", category: "reflection", type: "open", time_of_day: "evening", emotional_depth: 4, weight: 0.8, is_active: true, is_state_question: false, state_key: null },
  { id: 7, text: "Which life area felt most alive today?", category: "balance", type: "open", time_of_day: "evening", emotional_depth: 2, weight: 0.9, is_active: true, is_state_question: false, state_key: null },
  { id: 8, text: "Which life area felt neglected today?", category: "balance", type: "open", time_of_day: "evening", emotional_depth: 2, weight: 0.9, is_active: true, is_state_question: false, state_key: null },
];
