// Daily report prompt. Used by /api/reports/daily to generate Shadow-voiced
// summary of user's day based on entries, answers, and scores.

export const DAILY_REPORT_SCHEMA_VERSION = "v1";

export const SYSTEM_PROMPT = `You are Shadow, a calm personal operating system. Generate a daily report
for the user based on their entries, question answers, and life area scores from today.

Style:
- 200-400 words, first person perspective about the user ("Your day...")
- Warm but honest. Never diagnostic or clinical.
- Soft language: "low signal" not "neglected", "needs care" not "critical"
- Mention specific entries and patterns, not generic advice.
- End with a single forward-looking sentence (not a question).
- Use the user's language if entries are not in English.

Structure (flexible, not rigid headers):
1. Opening observation — what defined the day
2. Area highlights — which life areas were active, which quiet
3. Emotional texture — mood/energy patterns if data exists
4. Pattern or insight — something non-obvious from the data
5. Closing — gentle forward-looking note

Return ONLY a JSON object:
{
  "body": string,          // the report text, 200-400 words
  "confidence": number,    // 0.0-1.0, based on data volume
  "headline": string       // 1 sentence summary, ≤ 80 chars
}

Confidence guide:
- < 3 entries today → 0.3 (low data)
- 3-7 entries → 0.6 (moderate)
- 8+ entries + answers → 0.85+

Output JSON only, no prose, no markdown fences.`;

type ReportInput = {
  entries: Array<{
    summary: string | null;
    raw_text: string;
    entry_type: string | null;
    life_area_slug: string | null;
    emotion_primary: string | null;
    emotion_intensity: number | null;
    created_at: string;
  }>;
  answers: Array<{
    question_text: string;
    value_text: string | null;
    value_numeric: number | null;
  }>;
  scores: Array<{
    area_name: string;
    score: number;
    confidence: number | null;
  }>;
  todayDate: string;
  memoryBlock?: string; // RAG context: past entries similar to today's signals
};

export function buildUserPrompt(input: ReportInput): string {
  const parts: string[] = [];

  parts.push(`<date>${input.todayDate}</date>`);

  if (input.entries.length > 0) {
    const entriesXml = input.entries
      .map(
        (e) =>
          `  <entry type="${e.entry_type ?? "raw"}" area="${e.life_area_slug ?? "none"}" emotion="${e.emotion_primary ?? "none"}" intensity="${e.emotion_intensity ?? "?"}" time="${e.created_at}">
    ${e.summary ?? e.raw_text}
  </entry>`,
      )
      .join("\n");
    parts.push(`<entries count="${input.entries.length}">\n${entriesXml}\n</entries>`);
  } else {
    parts.push(`<entries count="0" />`);
  }

  if (input.answers.length > 0) {
    const answersXml = input.answers
      .map(
        (a) =>
          `  <answer question="${a.question_text}">${a.value_numeric != null ? a.value_numeric : a.value_text ?? "skipped"}</answer>`,
      )
      .join("\n");
    parts.push(`<answers count="${input.answers.length}">\n${answersXml}\n</answers>`);
  }

  if (input.scores.length > 0) {
    const scoresXml = input.scores
      .map(
        (s) =>
          `  <score area="${s.area_name}" value="${s.score}" confidence="${s.confidence ?? "?"}"/>`,
      )
      .join("\n");
    parts.push(`<scores>\n${scoresXml}\n</scores>`);
  }

  // Inject past-entry memory context when available.
  // Helps the report surface non-obvious patterns and recurring signals.
  if (input.memoryBlock) {
    parts.push(
      `<memory_context note="Past entries similar to today's signals — use to identify recurring patterns, shifts, or continuations.">\n${input.memoryBlock}\n</memory_context>`,
    );
  }

  parts.push("Return JSON only.");
  return parts.join("\n\n");
}
