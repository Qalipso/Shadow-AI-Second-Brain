import { z } from "zod";

// Strict response schema for the classification LLM call.
// Update CLASSIFICATION_SCHEMA_VERSION whenever this changes.

export const LIFE_AREA_SLUGS = [
  "work",
  "money",
  "health",
  "energy",
  "food",
  "mind",
  "creativity",
  "social",
  "emotion",
  "discipline",
  "environment",
  "meaning",
] as const;

export const ENTRY_TYPES = [
  "thought",
  "task",
  "feeling",
  "question",
  "event",
  "expense",
  "food",
] as const;

export const EmotionSchema = z.object({
  primary: z.string().min(1).max(40),
  intensity: z.number().int().min(1).max(10),
});

export const ExtractedTaskSchema = z.object({
  title: z.string().min(1).max(200),
  due: z.string().nullable().optional(),
});

export const ClassificationResultSchema = z.object({
  summary: z.string().min(1).max(400),
  entry_type: z.enum(ENTRY_TYPES),
  life_area_slug: z.enum(LIFE_AREA_SLUGS).nullable(),
  emotion: EmotionSchema.nullable(),
  suggested_followup: z.string().max(200).nullable(),
  extracted_task: ExtractedTaskSchema.nullable(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// Parse a raw model response. Handles common Claude quirks: stray text before
// the JSON, code fences, trailing commentary. Returns Zod result.
export function parseClassificationResponse(raw: string) {
  const trimmed = stripFences(raw).trim();
  // Locate first '{' and last '}' to extract JSON body even if model added prose.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    return { success: false as const, error: "No JSON object in response." };
  }
  const slice = trimmed.slice(first, last + 1);
  let json: unknown;
  try {
    json = JSON.parse(slice);
  } catch (e) {
    return { success: false as const, error: `JSON parse: ${(e as Error).message}` };
  }
  const parsed = ClassificationResultSchema.safeParse(json);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  return { success: true as const, data: parsed.data };
}

function stripFences(s: string): string {
  // Common pattern: ```json\n{...}\n```
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/m;
  const m = s.match(fence);
  return m ? m[1] : s;
}
