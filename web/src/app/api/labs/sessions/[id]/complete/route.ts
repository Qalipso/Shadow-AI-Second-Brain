import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { estimateCostUsd, getLlm, hasLlm, MODELS } from "@/lib/llm";
import { isOverDailyCap, recordLlmCall } from "@/lib/cost-ledger";
import { getLabsSession, insertMemoryItems } from "@/lib/labs/queries";
import { calcDimensionScores, normalizeValue, scoresToJson } from "@/lib/labs/scoring";
import { LABS_SYSTEM_PROMPT, buildLabsAnalysisPrompt } from "@/ai/prompts/labs-analysis";
import { generateEmbedding } from "@/lib/embeddings";
import { upsertMemoryNode } from "@/lib/memory/graph";

const AnswerSchema = z.object({
  question_id: z.number().int(),
  raw_value: z.number().int().min(1).max(5),
  dimension: z.string(),
  reverse_scored: z.boolean(),
  question_text: z.string(),
});

const CompleteBodySchema = z.object({
  answers: z.array(AnswerSchema).min(1),
  started_at: z.string(), // ISO
});

const MAX_TOKENS = 1800;

// POST /api/labs/sessions/[id]/complete
// Saves answers, calculates scores, runs AI analysis, updates profile summary.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const { id: sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const session = await getLabsSession(sessionId, user.id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  if (session.status !== "in_progress") {
    return NextResponse.json({ error: "Session already completed." }, { status: 409 });
  }

  let body: z.infer<typeof CompleteBodySchema>;
  try {
    body = CompleteBodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid answers." }, { status: 400 });
  }

  const completedAt = new Date();
  const startedAt = new Date(body.started_at);
  const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

  // 1. Calculate normalized values + dimension scores
  const rawAnswers = body.answers.map((a) => ({
    question_id: a.question_id,
    raw_value: a.raw_value,
    reverse_scored: a.reverse_scored,
    dimension: a.dimension,
  }));
  const dimensionScores = calcDimensionScores(rawAnswers);
  const scoresJson = scoresToJson(dimensionScores);

  // 2. Save answers
  const answerRows = body.answers.map((a) => ({
    session_id: sessionId,
    user_id: user.id,
    question_id: a.question_id,
    raw_value: a.raw_value,
    normalized_value: normalizeValue(a.raw_value, a.reverse_scored),
  }));
  const { error: answersError } = await supabase.from("labs_answers").insert(answerRows);
  if (answersError) {
    console.error("[labs:complete] save answers failed", answersError.message);
    return NextResponse.json({ error: "Failed to save answers." }, { status: 500 });
  }

  // 3. Mark session completed
  await supabase
    .from("labs_sessions")
    .update({ status: "completed", completed_at: completedAt.toISOString(), duration_seconds: durationSeconds })
    .eq("id", sessionId);

  // 4. AI analysis (best-effort, non-blocking on failure)
  let interpretationJson: Record<string, unknown> = {};
  let aiSummaryText: string | null = null;
  let confidence: number | null = null;

  if (hasLlm() && !(await isOverDailyCap(user.id))) {
    const { data: testRow } = await supabase
      .from("labs_tests")
      .select("title, slug, category")
      .eq("id", session.test_id)
      .single();

    const promptInput = {
      test_slug: testRow?.slug ?? "",
      test_title: testRow?.title ?? "",
      test_category: testRow?.category ?? "",
      scores: scoresJson,
      question_texts: body.answers.map((a) => ({
        dimension: a.dimension,
        text: a.question_text,
        normalized_value: normalizeValue(a.raw_value, a.reverse_scored),
      })),
    };

    const model = MODELS.labs_analysis;
    const startedLlm = Date.now();
    let tokensIn = 0, tokensOut = 0, costUsd = 0;

    try {
      const openai = getLlm();
      const resp = await openai.chat.completions.create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: LABS_SYSTEM_PROMPT },
          { role: "user", content: buildLabsAnalysisPrompt(promptInput) },
        ],
      });
      tokensIn = resp.usage?.prompt_tokens ?? 0;
      tokensOut = resp.usage?.completion_tokens ?? 0;
      costUsd = estimateCostUsd(model, tokensIn, tokensOut);
      const rawText = resp.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(rawText);
      interpretationJson = parsed;
      aiSummaryText = parsed.interpretation?.summary ?? null;
      confidence = parsed.confidence ?? null;

      await recordLlmCall({
        userId: user.id, task: "labs_analysis", model,
        latencyMs: Date.now() - startedLlm, tokensIn, tokensOut, costUsd, ok: true,
      });

      // 5. Save memory candidates
      const memoryCandidates: Array<{
        title: string;
        content: string;
        importance: number;
        stability: string;
        tags: string[];
      }> = parsed.memory_candidates ?? [];

      if (memoryCandidates.length > 0) {
        const memoryWithEmbeddings = await Promise.allSettled(
          memoryCandidates.slice(0, 6).map(async (mc) => {
            const { embedding } = await generateEmbedding(mc.content);
            return {
              user_id: user.id,
              source_type: "labs" as const,
              source_id: sessionId,
              title: mc.title,
              content: mc.content,
              importance: Math.min(5, Math.max(1, mc.importance ?? 3)),
              stability: mc.stability ?? "stable",
              tags: mc.tags ?? [],
              embedding,
            };
          }),
        );
        const successfulItems = memoryWithEmbeddings
          .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer T> ? T : never> => r.status === "fulfilled")
          .map((r) => r.value);
        await insertMemoryItems(successfulItems);
      }

      // 6. Update profile_ai_summary (upsert)
      const profileUpdate = parsed.profile_update ?? {};
      const shadowPersonalization = parsed.shadow_personalization ?? {};
      await supabase.from("profile_ai_summary").upsert(
        {
          user_id: user.id,
          ...(profileUpdate.personality_json && Object.keys(profileUpdate.personality_json).length > 0
            ? { personality_json: profileUpdate.personality_json } : {}),
          ...(profileUpdate.values_json && Object.keys(profileUpdate.values_json).length > 0
            ? { values_json: profileUpdate.values_json } : {}),
          ...(profileUpdate.current_state_json && Object.keys(profileUpdate.current_state_json).length > 0
            ? { current_state_json: profileUpdate.current_state_json } : {}),
          ...(Object.keys(shadowPersonalization).length > 0
            ? { communication_preferences_json: shadowPersonalization } : {}),
          summary_text: aiSummaryText,
          last_generated_at: new Date().toISOString(),
          updated_from_sources_json: [{ type: "labs", session_id: sessionId, test_slug: testRow?.slug, at: new Date().toISOString() }],
        },
        { onConflict: "user_id" },
      );

    } catch (e) {
      const msg = (e as Error).message;
      await recordLlmCall({
        userId: user.id, task: "labs_analysis", model,
        latencyMs: Date.now() - startedLlm, ok: false, error: msg,
      }).catch(() => {});
      console.error("[labs:complete] AI analysis failed", msg);
    }
  }

  // 7. Save result row
  const { data: result, error: resultError } = await supabase
    .from("labs_results")
    .insert({
      user_id: user.id,
      test_id: session.test_id,
      session_id: sessionId,
      scores_json: scoresJson,
      interpretation_json: interpretationJson,
      ai_summary_text: aiSummaryText,
      confidence_level: confidence,
    })
    .select()
    .single();

  if (resultError) {
    console.error("[labs:complete] save result failed", resultError.message);
    return NextResponse.json({ error: "Failed to save results." }, { status: 500 });
  }

  return NextResponse.json({
    result,
    session_id: sessionId,
    scores: scoresJson,
  }, { status: 200 });
}
