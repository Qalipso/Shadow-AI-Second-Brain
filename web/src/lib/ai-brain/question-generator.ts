import "server-only";
import { getLlm, hasLlm, MODELS, estimateCostUsd } from "@/lib/llm";
import { recordLlmCall } from "@/lib/cost-ledger";
import type { DetectedGap } from "./knowledge-gaps";

export type GeneratedQuestion = {
  question_text: string;
  question_type: string;
};

const QUESTION_TYPE_MAP: Record<string, string> = {
  profile:  "identity",
  memory:   "reflection",
  goals:    "goal",
  habits:   "habit",
  default:  "reflection",
};

const SYSTEM_PROMPT = `You are Shadow's question generator. Shadow is a personal AI life operating system.
Your task: given a knowledge gap (something Shadow doesn't know about the user), write one short, warm, non-intrusive question to gently help the user share that information.

Rules:
- Max 1 question, 1 sentence
- Conversational tone, not clinical, not generic
- Must be specific to the gap reason given
- Do NOT ask multiple questions in one
- Output ONLY valid JSON, no markdown

Output:
{"question_text": "...", "question_type": "identity|motivation|friction|pattern|context|reflection|goal|habit|emotional_state"}`;

export async function generateQuestionFromGap(
  userId: string,
  gap: DetectedGap & { id: string },
): Promise<GeneratedQuestion | null> {
  if (!hasLlm()) return null;

  const fallbackType = QUESTION_TYPE_MAP[gap.area ?? "default"] ?? "reflection";

  const userPrompt = `Knowledge gap: ${gap.reason}
Area: ${gap.area ?? "general"}
Source: ${gap.source}

Write one question to help Shadow understand this.`;

  const model = MODELS.classify;
  const startedAt = Date.now();

  try {
    const openai = getLlm();
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: 150,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const tokensIn = resp.usage?.prompt_tokens ?? 0;
    const tokensOut = resp.usage?.completion_tokens ?? 0;
    const costUsd = estimateCostUsd(model, tokensIn, tokensOut);

    await recordLlmCall({
      userId,
      task: "generate_ai_question",
      model,
      latencyMs: Date.now() - startedAt,
      tokensIn,
      tokensOut,
      costUsd,
      ok: true,
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { question_text?: string; question_type?: string };

    if (!parsed.question_text?.trim()) return null;

    return {
      question_text: parsed.question_text.trim(),
      question_type: parsed.question_type ?? fallbackType,
    };
  } catch (err) {
    await recordLlmCall({
      userId,
      task: "generate_ai_question",
      model,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: (err as Error).message,
    }).catch(() => {});
    return null;
  }
}
