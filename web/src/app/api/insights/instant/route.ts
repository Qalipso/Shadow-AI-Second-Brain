import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLlm, hasLlm, MODELS } from "@/lib/llm";

// POST /api/insights/instant
// Generates a first-session instant insight from the user's very first capture.
// Intended to be called once — after the first successful memory save.
// Caller should guard with localStorage flag 'shadow:insights:first_done'.

const BodySchema = z.object({
  entry_id: z.string().uuid(),
  summary: z.string().min(1).max(400),
  life_area_slug: z.string().nullable().optional(),
  emotion: z.object({
    primary: z.string(),
    intensity: z.number(),
  }).nullable().optional(),
});

export async function POST(request: NextRequest) {
  if (!hasSupabase() || !hasLlm()) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { entry_id, summary, life_area_slug, emotion } = parsed.data;

  const emotionLine = emotion
    ? `Emotion detected: ${emotion.primary} (intensity ${emotion.intensity}/10).`
    : "";
  const areaLine = life_area_slug
    ? `Life area: ${life_area_slug}.`
    : "";

  const prompt = `A user just captured their first thought in Shadow, a personal life OS.

Their capture summary: "${summary}"
${areaLine}
${emotionLine}

Write one specific, direct insight about this person based only on what they shared.
- Be concrete, not generic.
- Do not use phrases like "it seems" or "you might".
- Max 2 sentences.
- Reference the actual content they wrote.

Return JSON: { "insight": "...", "follow_up": "..." }
Where follow_up is one practical question Shadow could ask next.`;

  let insightText = "";
  let followUp = "";

  try {
    const openai = getLlm();
    const resp = await openai.chat.completions.create({
      model: MODELS.classify,
      max_tokens: 200,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    const raw = resp.choices[0]?.message?.content ?? "{}";
    const json = JSON.parse(raw) as { insight?: string; follow_up?: string };
    insightText = json.insight ?? "";
    followUp = json.follow_up ?? "";
  } catch (e) {
    return NextResponse.json(
      { error: `LLM failed: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  if (!insightText) {
    return NextResponse.json({ error: "Insight generation returned empty." }, { status: 422 });
  }

  return NextResponse.json({
    insight: {
      text: insightText,
      follow_up: followUp,
      sources: [entry_id],
    },
  });
}
