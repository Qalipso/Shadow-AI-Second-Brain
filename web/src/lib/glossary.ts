// Shadow system glossary — single source of truth for term definitions.
// Used in Settings/About. Terms mirror landing copy so both surfaces stay consistent.

export type GlossaryTerm = {
  term: string;
  short: string; // one-line definition
  detail: string; // 1–2 sentences for expanded view
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: "Entry",
    short: "A single thought, task, feeling, or event you drop into Shadow.",
    detail:
      "Entries are raw captures — unformatted and unstructured. Shadow classifies them automatically into types and life areas after you save.",
  },
  {
    term: "Memory",
    short: "The indexed store of all your past entries, searchable by meaning.",
    detail:
      "Shadow embeds each entry as a vector so it can find semantically similar moments from your past and surface them as context during chat or daily readings.",
  },
  {
    term: "Map",
    short: "A scored view of your 12 life areas, updated after each check-in.",
    detail:
      "The Map aggregates signals from your entries and Daily Syncs into a per-area score (1–100) with a confidence weight. Low-confidence areas have less data.",
  },
  {
    term: "Daily Sync",
    short: "A quick 2-minute check-in that calibrates your state sliders.",
    detail:
      "Five sliders — Energy, Mood, Mental noise, Body state, Focus — rated 1–5. Shadow uses these readings to weight your Map and detect pattern shifts over time.",
  },
  {
    term: "Orb",
    short: "The AI assistant button — a live interface to your own memory.",
    detail:
      "The Orb uses your entries and area scores as context for every reply. It also sends proactive nudges based on your configured check-in cadence.",
  },
  {
    term: "Life Area",
    short: "One of 12 domains Shadow tracks: Work, Money, Health, and more.",
    detail:
      "Each entry is tagged with a life area during classification. Areas accumulate a score over time based on the tone and frequency of entries.",
  },
  {
    term: "Signal",
    short: "Any data point Shadow uses to build your profile.",
    detail:
      "Signals include entry text, emotion ratings, state slider values, habit completions, and AI-derived scores. More signals → higher Map confidence.",
  },
];
