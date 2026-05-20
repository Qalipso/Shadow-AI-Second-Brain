// Evening Ritual question config.
// Edit copy here — zero code changes needed elsewhere.

export type ReflectionSlot =
  | "work" | "money" | "health" | "energy" | "food" | "mind"
  | "creativity" | "social" | "emotion" | "discipline" | "environment" | "meaning"
  | "autonomy" | "inner_noise" | "self_compassion";

export type ReflectionQuestion = {
  slot: ReflectionSlot;
  question: string;
  labelMin: string;
  labelMid: string;
  labelMax: string;
  optional?: boolean;
};

export const MAIN_QUESTIONS: ReflectionQuestion[] = [
  {
    slot: "work",
    question: "How present and alive did you feel in your work today?",
    labelMin: "absent",
    labelMid: "going through motions",
    labelMax: "fully in it",
  },
  {
    slot: "money",
    question: "How clear and grounded did you feel about your finances today?",
    labelMin: "chaotic",
    labelMid: "foggy but stable",
    labelMax: "clear and calm",
  },
  {
    slot: "health",
    question: "How did your body feel today — movement, sleep, recovery?",
    labelMin: "depleted",
    labelMid: "getting by",
    labelMax: "strong",
  },
  {
    slot: "energy",
    question: "How was your energy across the day?",
    labelMin: "drained early",
    labelMid: "uneven",
    labelMax: "steady and full",
  },
  {
    slot: "food",
    question: "How intentional and nourishing was your eating today?",
    labelMin: "reactive",
    labelMid: "decent",
    labelMax: "nourishing",
  },
  {
    slot: "mind",
    question: "How clear and focused was your mind today?",
    labelMin: "scattered",
    labelMid: "wandering",
    labelMax: "sharp",
  },
  {
    slot: "creativity",
    question: "Did you make, express, or explore something today?",
    labelMin: "nothing",
    labelMid: "a flicker",
    labelMax: "alive with it",
  },
  {
    slot: "social",
    question: "How connected did you feel to the people around you today?",
    labelMin: "isolated",
    labelMid: "neutral",
    labelMax: "genuinely close",
  },
  {
    slot: "emotion",
    question: "How well did you meet your emotions today — without suppressing or drowning?",
    labelMin: "stuck or flooded",
    labelMid: "managed",
    labelMax: "honest and processed",
  },
  {
    slot: "discipline",
    question: "How consistent were you with your commitments and habits today?",
    labelMin: "fell apart",
    labelMid: "mixed",
    labelMax: "solid",
  },
  {
    slot: "environment",
    question: "How much did your physical space support you today?",
    labelMin: "chaotic",
    labelMid: "neutral",
    labelMax: "ordered and calm",
  },
  {
    slot: "meaning",
    question: "Did today feel like it was pointing somewhere that matters?",
    labelMin: "directionless",
    labelMid: "faint signal",
    labelMax: "clear and alive",
  },
];

export const PSYCH_QUESTIONS: ReflectionQuestion[] = [
  {
    slot: "autonomy",
    question: "How much did you act from your own values today, rather than pressure or obligation?",
    labelMin: "all obligation",
    labelMid: "mixed",
    labelMax: "fully my own",
    optional: true,
  },
  {
    slot: "inner_noise",
    question: "How loud was the inner critic or anxiety today?",
    labelMin: "quiet",
    labelMid: "present",
    labelMax: "deafening",
    optional: true,
  },
  {
    slot: "self_compassion",
    question: "How kind were you to yourself today when things didn't go as planned?",
    labelMin: "harsh",
    labelMid: "indifferent",
    labelMax: "genuinely kind",
    optional: true,
  },
];

export const ALL_QUESTIONS: ReflectionQuestion[] = [
  ...MAIN_QUESTIONS,
  ...PSYCH_QUESTIONS,
];
