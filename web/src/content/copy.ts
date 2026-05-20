// App copy — single source of truth for all user-facing strings.
// Tone: plain second-person. One grounding phrase per screen.

export const pages = {
  dashboard: {
    title: "Today",
    subtitle: "Your day, translated into signals.",
  },
  inbox: {
    eyebrow: "Capture",
    title: "Inbox",
    subtitle: "Drop anything here. Shadow reads it and structures it for you.",
  },
  areas: {
    eyebrow: "Map",
    title: "Map",
    subtitle: "Your life, scored by area. Each score builds from what you capture and how you check in.",
  },
  checkin: {
    eyebrow: "Daily Sync",
    title: "Daily Sync",
    subtitle: "Rate your state. Shadow uses this as baseline for your Map.",
  },
  memory: {
    eyebrow: "Memory",
    title: "Memory",
    subtitle: "Everything you've captured, searchable by meaning.",
  },
  insights: {
    eyebrow: "Insights",
    title: "Insights",
    subtitle: "Patterns Shadow found in your signals over time.",
  },
  journey: {
    eyebrow: "Journey",
    title: "Journey",
    subtitle: "Long-term traces and milestones, as they accumulate.",
  },
  rituals: {
    eyebrow: "Rituals",
    title: "Rituals",
    subtitle: "Small repeatable actions that leave signals in your memory.",
  },
  direction: {
    eyebrow: "Direction",
    title: "Direction",
    subtitle: "Where you're heading. Goals and intentions, tracked as signals.",
  },
  settings: {
    eyebrow: "Preferences",
    title: "Settings",
    subtitle: "Control how Shadow thinks, remembers, and talks to you.",
  },
} as const;

export const orb = {
  seed: "I'm Shadow. Drop a thought, a task, a feeling — I'll find how it connects to the rest of your life.",
  thinking: "reading your memory…",
  placeholder: "Write to Shadow…",
  proactiveHints: [
    "Your check-in from today is being analysed. Want to see what Shadow noticed?",
    "There's a pattern worth looking at. Open Shadow.",
    "One question Shadow wants to ask you today.",
  ],
} as const;

export const composer = {
  placeholder:
    "Write anything: a thought, task, fear, expense, food, idea, plan, emotion, or event.",
  submitLabel: "Send",
  classifyingLabel: "Shadow is reading…",
} as const;

export const emptyStates = {
  inbox: {
    heading: "Nothing here yet.",
    body: "Drop your first thought above — a task, a feeling, anything. Shadow will do the rest.",
  },
  memory: {
    heading: "Memory is empty.",
    body: "Start capturing in the Inbox. Shadow builds memory from every entry you send.",
  },
  areas: {
    heading: "Your Map is uncalibrated.",
    body: "Do a Daily Sync to give Shadow a baseline for your life areas.",
    cta: "Open Daily Sync",
    ctaHref: "/checkin",
  },
} as const;
