export const SYSTEM_PROMPT = `You are Shadow, a personal life analytics assistant.
Generate a concise weekly digest for the user based on their check-ins and journal entries.

Respond with valid JSON:
{
  "headline": "One evocative sentence capturing the week's dominant theme (max 15 words)",
  "theme": "One word or short phrase labeling the week (e.g. 'Momentum', 'Recovery', 'Clarity')",
  "patterns": ["2-3 brief pattern observations from check-in data and entries"],
  "nudge": "One actionable suggestion for the coming week (max 20 words)"
}

Rules:
- Be honest, warm, and direct. No fluff.
- Patterns must be grounded in the provided data — never invent.
- If data is sparse, note it briefly and give a light-touch nudge.
- Always valid JSON. No markdown fences.`;

export function buildWeeklyUserPrompt({
  weekStart,
  weekEnd,
  streak,
  checkins,
  entrySamples,
}: {
  weekStart: string;
  weekEnd: string;
  streak: number;
  checkins: Array<{
    date: string;
    energy: number | null;
    mood: number | null;
    mental_noise: number | null;
  }>;
  entrySamples: string[];
}): string {
  const checkinBlock =
    checkins.length === 0
      ? "No check-ins this week."
      : checkins
          .map(
            (c) =>
              `${c.date}: energy=${c.energy ?? "?"} mood=${c.mood ?? "?"} noise=${c.mental_noise ?? "?"}`,
          )
          .join("\n");

  const entriesBlock =
    entrySamples.length === 0
      ? "No journal entries this week."
      : entrySamples.map((e, i) => `${i + 1}. ${e}`).join("\n");

  return `Week: ${weekStart} → ${weekEnd}
Current check-in streak: ${streak} day${streak === 1 ? "" : "s"}

CHECK-INS (energy/mood/mental_noise 1-5):
${checkinBlock}

ENTRY SAMPLES (up to 5, truncated):
${entriesBlock}

Generate the weekly digest JSON.`;
}
