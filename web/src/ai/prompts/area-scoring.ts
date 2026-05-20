// Area scoring prompt. AI provides rationale + confidence adjustment per area.
// The score NUMBER is computed by the hybrid engine (src/lib/scoring.ts),
// NOT by the LLM. AI only provides soft interpretation.

export const SYSTEM_PROMPT = `You are Shadow, a calm personal operating system. You interpret life area activity data and provide a brief rationale for each area's health.

You receive pre-computed factual signals per life area (entry volume, emotion distribution, task status, recency) plus recent entry summaries.

Your job:
1. For each area with data, write a 1-sentence rationale in Shadow's voice (warm, direct, non-clinical).
2. Provide a confidence_adjustment (-0.2 to +0.2) if the raw facts miss nuance. For example:
   - Entries are all negative but person is processing grief well -> +0.1
   - High volume but entries are superficial -> -0.1
   - Data is straightforward -> 0.0

Style:
- Never say "critical", "failing", "danger", "you need to", "you should".
- Use soft language: "low signal", "steady", "growing", "quiet", "shifting".
- 1 sentence max per rationale. No bullet points.
- If not enough data, rationale = "Not enough signals to read this area yet."
- Use the user's language if entries are not in English.

Return ONLY a JSON object:
{
  "areas": [
    {
      "slug": string,
      "rationale": string,
      "confidence_adjustment": number
    }
  ]
}

Output JSON only, no prose, no markdown fences.`;

export type AreaFactsForPrompt = {
  slug: string;
  name: string;
  entries7d: number;
  entriesToday: number;
  emotionBreakdown: string; // e.g. "3 positive, 1 negative, 2 neutral"
  tasksCompleted: number;
  tasksOpen: number;
  recentSummaries: string[]; // last 3-5 entry summaries
  stateValue?: number | null; // mood/energy/stress score 1-10 when mapped to this area
};

export function buildUserPrompt(areas: AreaFactsForPrompt[]): string {
  const blocks = areas
    .filter((a) => a.entries7d > 0 || a.tasksCompleted > 0 || a.tasksOpen > 0)
    .map((a) => {
      const summaries =
        a.recentSummaries.length > 0
          ? a.recentSummaries.map((s, i) => `  ${i + 1}. ${s}`).join("\n")
          : "  (no summaries available)";

      const stateStr = a.stateValue != null ? `\n  state_score: ${a.stateValue}/10 (mood/energy/stress slider)` : "";
      return `<area slug="${a.slug}" name="${a.name}">
  entries_7d: ${a.entries7d}
  entries_today: ${a.entriesToday}
  emotions: ${a.emotionBreakdown}
  tasks: ${a.tasksCompleted} completed, ${a.tasksOpen} open${stateStr}
  recent_summaries:
${summaries}
</area>`;
    })
    .join("\n\n");

  if (!blocks) {
    return "<no-data>No areas have entries this week.</no-data>\n\nReturn JSON only.";
  }

  return `${blocks}\n\nReturn JSON only.`;
}
