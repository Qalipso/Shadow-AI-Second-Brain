import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { estimateCostUsd, getLlm, hasLlm, MODELS } from "@/lib/llm";
import {
  isOverDailyCap,
  maxDailyUsd,
  recordLlmCall,
  todaysCostUsd,
} from "@/lib/cost-ledger";
import {
  type AreaFacts,
  type AiAdjustment,
  computeScore,
  classifyEmotion,
  confidenceGate,
} from "@/lib/scoring";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  type AreaFactsForPrompt,
} from "@/ai/prompts/area-scoring";

// POST /api/score-areas
// Triggers hybrid scoring for all life areas for the authenticated user.
// 1. Compute factual signals per area
// 2. If total entries < 3 across all areas -> return early
// 3. Call gpt-4o for rationale + confidence adjustments
// 4. Compute final scores via hybrid engine
// 5. Upsert life_area_scores with period_type='daily'
// 6. Log cost

const AiResponseSchema = z.object({
  areas: z.array(
    z.object({
      slug: z.string(),
      rationale: z.string(),
      confidence_adjustment: z.number().min(-0.2).max(0.2),
    }),
  ),
});

const MAX_TOKENS = 800;

type AreaRow = { id: number; slug: string; name: string };
type EntryRow = {
  id: string;
  life_area_id: number | null;
  emotion_primary: string | null;
  summary: string | null;
  raw_text: string;
  created_at: string;
};
type TaskRow = {
  life_area_id: number | null;
  status: string;
};
type AnswerRow = {
  question_id: number;
  value_numeric: number | null;
};
type QuestionRow = {
  id: number;
  state_key: string | null;
  is_state_question: boolean | null;
};

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

  // Cost cap
  if (await isOverDailyCap(user.id)) {
    const spent = await todaysCostUsd(user.id);
    return NextResponse.json(
      { error: "Daily LLM cost cap reached.", spent_usd: Number(spent.toFixed(4)), cap_usd: maxDailyUsd() },
      { status: 429 },
    );
  }

  // Date boundaries
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  // Fetch all data in parallel
  const [areasQ, entriesQ, tasksQ, answersQ, questionsQ] = await Promise.all([
    supabase.from("life_areas").select("id, slug, name"),
    supabase
      .from("entries")
      .select("id, life_area_id, emotion_primary, summary, raw_text, created_at")
      .eq("user_id", user.id)
      .eq("status", "processed")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("life_area_id, status")
      .eq("user_id", user.id),
    supabase
      .from("question_answers")
      .select("question_id, value_numeric")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("question_bank")
      .select("id, state_key, is_state_question")
      .eq("is_state_question", true),
  ]);

  const areas = (areasQ.data ?? []) as AreaRow[];
  const entries = (entriesQ.data ?? []) as EntryRow[];
  const tasks = (tasksQ.data ?? []) as TaskRow[];
  const answers = (answersQ.data ?? []) as AnswerRow[];
  const stateQuestions = (questionsQ.data ?? []) as QuestionRow[];

  // Total entries threshold
  if (entries.length < 3) {
    return NextResponse.json(
      { error: "Not enough data. Need at least 3 processed entries in the last 7 days.", entries_found: entries.length },
      { status: 422 },
    );
  }

  // Build area map
  const areaMap = new Map(areas.map((a) => [a.id, a]));
  const areaBySlug = new Map(areas.map((a) => [a.slug, a]));

  // State question mapping: state_key -> question_id
  const stateKeyToQid = new Map(
    stateQuestions
      .filter((q) => q.state_key)
      .map((q) => [q.state_key!, q.id]),
  );

  // Today's state answers keyed by state_key
  const stateAnswers = new Map<string, number>();
  for (const a of answers) {
    if (a.value_numeric == null) continue;
    for (const [key, qid] of stateKeyToQid) {
      if (a.question_id === qid) {
        stateAnswers.set(key, a.value_numeric);
      }
    }
  }

  // Compute factual signals per area
  const factsMap = new Map<number, AreaFacts>();
  for (const area of areas) {
    factsMap.set(area.id, {
      areaId: area.id,
      slug: area.slug,
      name: area.name,
      entriesTotal7d: 0,
      entriesToday: 0,
      emotionPositive: 0,
      emotionNegative: 0,
      emotionNeutral: 0,
      tasksCompleted: 0,
      tasksOpen: 0,
      msSinceLastEntry: null,
      stateValue: null,
    });
  }

  // Accumulate entry stats
  for (const e of entries) {
    if (e.life_area_id == null) continue;
    const f = factsMap.get(e.life_area_id);
    if (!f) continue;

    f.entriesTotal7d += 1;
    if (new Date(e.created_at) >= todayStart) {
      f.entriesToday += 1;
    }

    const cls = classifyEmotion(e.emotion_primary);
    if (cls === "positive") f.emotionPositive += 1;
    else if (cls === "negative") f.emotionNegative += 1;
    else f.emotionNeutral += 1;

    const entryAge = now.getTime() - new Date(e.created_at).getTime();
    if (f.msSinceLastEntry == null || entryAge < f.msSinceLastEntry) {
      f.msSinceLastEntry = entryAge;
    }
  }

  // Accumulate task stats
  for (const t of tasks) {
    if (t.life_area_id == null) continue;
    const f = factsMap.get(t.life_area_id);
    if (!f) continue;
    if (t.status === "done") f.tasksCompleted += 1;
    else if (t.status === "open") f.tasksOpen += 1;
  }

  // Map state answers to relevant areas
  // mood -> self, energy -> health, stress -> mental_health
  const stateAreaMapping: Record<string, string[]> = {
    mood: ["self", "mental-health"],
    energy: ["health", "body"],
    stress: ["mental-health", "self"],
  };
  for (const [stateKey, value] of stateAnswers) {
    const slugs = stateAreaMapping[stateKey] ?? [];
    for (const slug of slugs) {
      const area = areaBySlug.get(slug);
      if (!area) continue;
      const f = factsMap.get(area.id);
      if (f && f.stateValue == null) {
        f.stateValue = value;
      }
    }
  }

  // Build prompt input for areas with data
  const recentSummariesByArea = new Map<number, string[]>();
  for (const e of entries) {
    if (e.life_area_id == null) continue;
    const existing = recentSummariesByArea.get(e.life_area_id) ?? [];
    if (existing.length < 5) {
      existing.push(e.summary ?? e.raw_text.slice(0, 120));
      recentSummariesByArea.set(e.life_area_id, existing);
    }
  }

  const promptAreas: AreaFactsForPrompt[] = areas
    .map((a) => {
      const f = factsMap.get(a.id)!;
      return {
        slug: a.slug,
        name: a.name,
        entries7d: f.entriesTotal7d,
        entriesToday: f.entriesToday,
        emotionBreakdown: `${f.emotionPositive} positive, ${f.emotionNegative} negative, ${f.emotionNeutral} neutral`,
        tasksCompleted: f.tasksCompleted,
        tasksOpen: f.tasksOpen,
        recentSummaries: recentSummariesByArea.get(a.id) ?? [],
        stateValue: f.stateValue,
      };
    })
    .filter((a) => a.entries7d > 0 || a.tasksCompleted > 0 || a.tasksOpen > 0);

  // LLM call for rationale
  const openai = getLlm();
  const model = MODELS.area_scoring;
  const startedAt = Date.now();
  let aiAdjustments: AiAdjustment[] = [];

  if (promptAreas.length > 0) {
    try {
      const resp = await openai.chat.completions.create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(promptAreas) },
        ],
      });

      const tokensIn = resp.usage?.prompt_tokens ?? 0;
      const tokensOut = resp.usage?.completion_tokens ?? 0;
      const costUsd = estimateCostUsd(model, tokensIn, tokensOut);
      const latencyMs = Date.now() - startedAt;
      const rawText = resp.choices[0]?.message?.content ?? "";

      try {
        const json = JSON.parse(rawText);
        const parsed = AiResponseSchema.safeParse(json);
        if (parsed.success) {
          aiAdjustments = parsed.data.areas;
        } else {
          console.error("[score-areas] AI response invalid schema", parsed.error.message);
        }
      } catch {
        console.error("[score-areas] AI response not JSON");
      }

      await recordLlmCall({
        userId: user.id,
        task: "area_scoring",
        model,
        latencyMs,
        tokensIn,
        tokensOut,
        costUsd,
        ok: true,
      });
    } catch (e) {
      const msg = (e as Error).message;
      await recordLlmCall({
        userId: user.id,
        task: "area_scoring",
        model,
        latencyMs: Date.now() - startedAt,
        ok: false,
        error: msg,
      });
      // Continue without AI adjustments — factual scores still valid
      console.error("[score-areas] LLM call failed, using factual-only scores:", msg);
    }
  }

  // Build adjustment map by slug
  const adjMap = new Map(aiAdjustments.map((a) => [a.slug, a]));

  // Compute final scores
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const scores = areas.map((a) => {
    const facts = factsMap.get(a.id)!;
    const adj = adjMap.get(a.slug);
    const result = computeScore(facts, adj);
    const gate = confidenceGate(result.dataVolume);

    return {
      ...result,
      gate,
      periodType: "daily" as const,
      periodStart: todayStr,
      periodEnd: todayStr,
    };
  });

  // Upsert scores (only areas with gate != "none")
  const scoresToWrite = scores.filter((s) => s.gate !== "none");
  if (scoresToWrite.length > 0) {
    const rows = scoresToWrite.map((s) => ({
      user_id: user.id,
      life_area_id: s.areaId,
      score: s.score,
      confidence: s.confidence,
      computed_at: now.toISOString(),
      period_type: s.periodType,
      period_start: s.periodStart,
      period_end: s.periodEnd,
      rationale: s.rationale,
      data_volume: s.dataVolume,
    }));

    // Delete existing daily scores for today, then insert fresh
    await supabase
      .from("life_area_scores")
      .delete()
      .eq("user_id", user.id)
      .eq("period_type", "daily")
      .gte("computed_at", todayStart.toISOString());

    const { error: insertErr } = await supabase
      .from("life_area_scores")
      .insert(rows);

    if (insertErr) {
      console.error("[score-areas] insert failed", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    scored: scoresToWrite.length,
    skipped: scores.length - scoresToWrite.length,
    scores: scores.map((s) => ({
      slug: s.slug,
      score: s.score,
      confidence: s.confidence,
      gate: s.gate,
      rationale: s.rationale,
      data_volume: s.dataVolume,
    })),
  });
}
