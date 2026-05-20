import "server-only";
import { getLlm, hasLlm, MODELS, estimateCostUsd } from "@/lib/llm";
import { buildAIBrainContext } from "@/lib/ai-brain/context";

export type CheckinSignals = {
  energy: number | null;
  mood: number | null;
  mental_noise: number | null;
  body_state: number | null;
  focus: number | null;
  inbox_dump: string | null;
  today_focus: string | null;
  insight_text: string | null;
  linked_goal_id: string | null;
};

export type InitiativeResult = {
  title: string;
  reason: string;
  suggested_action: string;
  initiative_type: string;
  priority: number;
  initiative_json: Record<string, unknown>;
};

const FALLBACK_INITIATIVE: InitiativeResult = {
  title: "Take a moment to check in with yourself",
  reason: "Your state signals suggest a moment of reflection could be valuable.",
  suggested_action: "Spend 5 minutes writing one thing on your mind.",
  initiative_type: "reflection_prompt",
  priority: 2,
  initiative_json: {},
};

const SYSTEM_PROMPT = `You are Shadow's initiative generator. Shadow is a personal life analytics assistant.
Your job is to generate one focused, actionable initiative based on the user's current state and context.
Output ONLY valid JSON matching this shape:
{
  "title": "short action title",
  "reason": "why this matters now (1-2 sentences, based on signals)",
  "suggested_action": "specific thing to do (1 sentence)",
  "initiative_type": "recovery_focus | reflection_prompt | productive_nudge | goal_alignment | habit_repair",
  "priority": 1-5
}
Rules:
- If energy <= 2: generate a recovery-focused initiative (rest, reduce load, restore)
- If mental_noise >= 4: generate a reflection or journaling initiative
- Otherwise: generate a productive nudge aligned to goals or focus
- Do NOT make clinical claims, diagnoses, or medical recommendations
- Frame everything as self-observation and personal choice
- Keep language warm, direct, non-judgmental`;

function buildUserPrompt(signals: CheckinSignals, contextBlock: string): string {
  const state = [
    signals.energy != null ? `Energy: ${signals.energy}/5` : null,
    signals.mood != null ? `Mood: ${signals.mood} (-5 to +5 scale)` : null,
    signals.mental_noise != null ? `Mental noise: ${signals.mental_noise}/5` : null,
    signals.body_state != null ? `Body state: ${signals.body_state}/5` : null,
    signals.focus != null ? `Focus: ${signals.focus}/5` : null,
    signals.today_focus ? `Today's focus: "${signals.today_focus}"` : null,
    signals.inbox_dump ? `Inbox dump: "${signals.inbox_dump.slice(0, 400)}"` : null,
    signals.insight_text ? `Insight: "${signals.insight_text.slice(0, 300)}"` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Current user state:\n${state}\n\n${contextBlock}\n\nGenerate one initiative for this user right now.`;
}

function parseInitiativeResponse(raw: string): InitiativeResult | null {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const title = typeof json.title === "string" ? json.title : null;
    const reason = typeof json.reason === "string" ? json.reason : null;
    const suggested_action = typeof json.suggested_action === "string" ? json.suggested_action : null;
    const initiative_type = typeof json.initiative_type === "string" ? json.initiative_type : "reflection_prompt";
    const priority = typeof json.priority === "number" ? Math.min(5, Math.max(1, Math.round(json.priority))) : 2;

    if (!title || !reason || !suggested_action) return null;

    return { title, reason, suggested_action, initiative_type, priority, initiative_json: json };
  } catch {
    return null;
  }
}

export async function generateTodayInitiative(
  userId: string,
  checkinData: CheckinSignals,
): Promise<InitiativeResult> {
  if (!hasLlm()) return FALLBACK_INITIATIVE;

  const ctx = await buildAIBrainContext(userId).catch(() => null);
  const contextBlock = ctx?.contextBlock ?? "";

  const model = MODELS.classify;
  const openai = getLlm();

  try {
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: 400,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(checkinData, contextBlock) },
      ],
    });

    const raw = resp.choices[0]?.message?.content ?? "";
    const parsed = parseInitiativeResponse(raw);

    // Log cost (best-effort, non-blocking)
    const tokensIn = resp.usage?.prompt_tokens ?? 0;
    const tokensOut = resp.usage?.completion_tokens ?? 0;
    const _cost = estimateCostUsd(model, tokensIn, tokensOut);

    return parsed ?? FALLBACK_INITIATIVE;
  } catch {
    return FALLBACK_INITIATIVE;
  }
}
