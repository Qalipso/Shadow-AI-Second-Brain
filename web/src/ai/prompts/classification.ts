// Classification prompt. Source: shadow/ai/prompts/01-classification.md
// Trimmed to a tight JSON schema aligned with web/src/types/db.ts entries shape.

export const CLASSIFICATION_SCHEMA_VERSION = "v1";

export const SYSTEM_PROMPT = `You classify a single life-journal entry from Shadow,
a personal capture app. Return ONLY a single JSON object that matches the schema
below. Use null when uncertain. Preserve the user's language in "summary".

Schema (strict):
{
  "summary": string,            // 1 short sentence, ≤ 200 chars, user's language
  "entry_type": "thought" | "task" | "feeling" | "question" | "event" | "expense" | "food",
  "life_area_slug": null | "work" | "money" | "health" | "energy" | "food" | "mind" | "creativity" | "social" | "emotion" | "discipline" | "environment" | "meaning",
  "emotion": null | { "primary": string, "intensity": integer 1..10 },
  "suggested_followup": null | string,   // ≤ 120 chars, a single follow-up question if useful
  "extracted_task": null | { "title": string, "due": null | string }  // ISO date if mentioned
}

Rules:
- Output JSON only, no prose, no markdown fences.
- Use lowercase slugs from the enumerations above.
- If user wrote a clear actionable verb-object, set entry_type="task" AND emit extracted_task.
- mood/energy/stress numeric questions are "feeling" entries.
- expense/food entries set entry_type accordingly even if life_area_slug is money/food.
- summary must be substantive — not "user wrote about X". Capture the essence.
- For extracted_task.due: set ONLY if the user explicitly states a date or
  unambiguous relative time. Resolve relative dates ("tomorrow", "next Monday",
  "in 3 days") against the <today> value in the user message. Output must be
  YYYY-MM-DD. If the user did not mention any timing, set due=null. NEVER
  invent a date.`;

export function buildUserPrompt(rawText: string, todayIsoDate: string): string {
  // Keep raw text isolated so the model can't be confused by prior turns.
  // <today> is injected because the model has no built-in date awareness;
  // without it relative dates ("tomorrow") become hallucinated ISO strings.
  return `<today>${todayIsoDate}</today>
<entry>
${rawText}
</entry>

Return JSON only.`;
}
