import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { hasLlm, estimateCostUsd, MODELS } from "@/lib/llm";
import { regenerateAISummary } from "@/lib/ai-brain/summary-generator";
import { detectKnowledgeGaps } from "@/lib/ai-brain/knowledge-gaps";
import { generateQuestionFromGap } from "@/lib/ai-brain/question-generator";
import { recordLlmCall } from "@/lib/cost-ledger";

// POST /api/profile/ai-summary/regenerate
export async function POST() {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }
  if (!hasLlm()) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  let summaryResult: Awaited<ReturnType<typeof regenerateAISummary>>;

  try {
    summaryResult = await regenerateAISummary(user.id);
  } catch (e) {
    const msg = (e as Error).message;
    await recordLlmCall({
      userId: user.id,
      task: "ai_summary_regen",
      model: MODELS.daily_report,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
    return NextResponse.json({ error: `Summary generation failed: ${msg}` }, { status: 502 });
  }

  const latencyMs = Date.now() - startedAt;

  // Upsert summary (user_id UNIQUE)
  const { error: upsertError } = await supabase
    .from("profile_ai_summary")
    .upsert(
      {
        user_id: user.id,
        summary_text: summaryResult.summary_text,
        personality_json: summaryResult.personality_json,
        values_json: summaryResult.values_json,
        communication_preferences_json: summaryResult.communication_preferences_json,
        current_state_json: summaryResult.current_state_json,
        last_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (upsertError) {
    return NextResponse.json({ error: `Failed to save summary: ${upsertError.message}` }, { status: 500 });
  }

  // Detect and insert knowledge gaps
  const detectedGaps = await detectKnowledgeGaps(user.id).catch(() => []);
  let gapsInserted = 0;

  if (detectedGaps.length > 0) {
    const rows = detectedGaps.map((g) => ({
      user_id: user.id,
      reason: g.reason,
      source: g.source,
      area: g.area,
      priority: g.priority,
      status: "open",
    }));

    const { data: inserted } = await supabase
      .from("knowledge_gaps")
      .insert(rows)
      .select("id");

    gapsInserted = (inserted ?? []).length;

    // Generate one AI question from highest-priority gap (PBI-26)
    // Only if no pending question already exists
    if (hasLlm() && inserted && inserted.length > 0) {
      const { data: existingQ } = await supabase
        .from("ai_questions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (!existingQ) {
        const topGap = detectedGaps[0];
        const topGapId = inserted[0]?.id as string | undefined;
        if (topGap && topGapId) {
          const generated = await generateQuestionFromGap(user.id, { ...topGap, id: topGapId }).catch(() => null);
          if (generated) {
            try {
              await supabase.from("ai_questions").insert({
                user_id: user.id,
                gap_id: topGapId,
                question_text: generated.question_text,
                question_type: generated.question_type,
                status: "pending",
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              });
            } catch { /* non-critical */ }
          }
        }
      }
    }
  }

  // Track LLM cost (approx — we don't have token counts here since regenerateAISummary doesn't expose them)
  await recordLlmCall({
    userId: user.id,
    task: "ai_summary_regen",
    model: MODELS.daily_report,
    latencyMs,
    costUsd: estimateCostUsd(MODELS.daily_report, 1500, 600),
    ok: true,
  });

  return NextResponse.json(
    {
      summary: summaryResult,
      knowledge_gaps_detected: gapsInserted,
    },
    { status: 200 },
  );
}
