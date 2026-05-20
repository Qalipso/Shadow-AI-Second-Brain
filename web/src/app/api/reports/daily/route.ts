import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { estimateCostUsd, getLlm, hasLlm, MODELS } from "@/lib/llm";
import { searchSimilarEntries, buildMemoryBlock } from "@/lib/rag";
import {
  buildUserPrompt,
  SYSTEM_PROMPT,
} from "@/ai/prompts/daily-report";
import {
  isOverDailyCap,
  maxDailyUsd,
  recordLlmCall,
  todaysCostUsd,
} from "@/lib/cost-ledger";

// POST /api/reports/daily
// GET  /api/reports/daily?date=YYYY-MM-DD  (fetch cached)
//
// POST generates today's report via gpt-4o. Cached by (user_id, date).
// Pass ?force=1 to regenerate.

const ReportResponseSchema = z.object({
  body: z.string().min(50),
  confidence: z.number().min(0).max(1),
  headline: z.string().max(120).optional(),
});

const MAX_TOKENS = 1200;

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get("date") ?? todayDateStr();

  const { data, error } = await supabase
    .from("daily_reports")
    .select("id, user_id, report_date, body, confidence, headline, created_at")
    .eq("user_id", user.id)
    .eq("report_date", dateParam)
    .single();

  if (error || !data) {
    return NextResponse.json({ report: null }, { status: 200 });
  }

  return NextResponse.json({ report: data }, { status: 200 });
}

export async function POST(request: NextRequest) {
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

  // Check force param
  let forceRegen = false;
  try {
    const body = await request.json().catch(() => ({}));
    forceRegen = (body as Record<string, unknown>).force === true;
  } catch {
    // no body = ok
  }

  const reportDate = todayDateStr();

  // Check cached (unless force)
  if (!forceRegen) {
    const { data: cached } = await supabase
      .from("daily_reports")
      .select("id, user_id, report_date, body, confidence, headline, created_at")
      .eq("user_id", user.id)
      .eq("report_date", reportDate)
      .single();
    if (cached) {
      return NextResponse.json({ report: cached, cached: true }, { status: 200 });
    }
  }

  // Cost cap
  if (await isOverDailyCap(user.id)) {
    const spent = await todaysCostUsd(user.id);
    return NextResponse.json(
      { error: "Daily LLM cost cap reached.", spent_usd: Number(spent.toFixed(4)), cap_usd: maxDailyUsd() },
      { status: 429 },
    );
  }

  // Gather today's data
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isoToday = todayStart.toISOString();

  const [entriesQ, answersQ, scoresQ, areasQ] = await Promise.all([
    supabase
      .from("entries")
      .select("raw_text, summary, entry_type, life_area_id, emotion_primary, emotion_intensity, created_at")
      .eq("user_id", user.id)
      .gte("created_at", isoToday)
      .order("created_at", { ascending: true }),
    supabase
      .from("question_answers")
      .select("question_id, value_text, value_numeric, created_at")
      .eq("user_id", user.id)
      .gte("created_at", isoToday),
    supabase
      .from("life_area_scores")
      .select("life_area_id, score, confidence")
      .eq("user_id", user.id)
      .gte("computed_at", isoToday),
    supabase.from("life_areas").select("id, slug, name"),
  ]);

  const areas = (areasQ.data ?? []) as Array<{ id: number; slug: string; name: string }>;
  const areaMap = new Map(areas.map((a) => [a.id, a]));

  // Resolve area slugs/names for entries
  type RawEntry = {
    raw_text: string;
    summary: string | null;
    entry_type: string | null;
    life_area_id: number | null;
    emotion_primary: string | null;
    emotion_intensity: number | null;
    created_at: string;
  };
  const entries = (entriesQ.data ?? []) as RawEntry[];

  if (entries.length < 1) {
    return NextResponse.json(
      { error: "No entries today. Write at least one capture first." },
      { status: 422 },
    );
  }

  // Resolve question texts for answers
  type RawAnswer = { question_id: number; value_text: string | null; value_numeric: number | null };
  const rawAnswers = (answersQ.data ?? []) as RawAnswer[];

  let questionMap = new Map<number, string>();
  if (rawAnswers.length > 0) {
    const qIds = [...new Set(rawAnswers.map((a) => a.question_id))];
    const { data: qRows } = await supabase
      .from("question_bank")
      .select("id, text")
      .in("id", qIds);
    questionMap = new Map((qRows ?? []).map((q: { id: number; text: string }) => [q.id, q.text]));
  }

  type RawScore = { life_area_id: number; score: number; confidence: number | null };
  const rawScores = (scoresQ.data ?? []) as RawScore[];

  // RAG: fetch past entries similar to today's signals (best-effort, non-blocking).
  // Gives the report context about recurring patterns and shifts over time.
  let memoryBlock: string | undefined;
  try {
    const queryText = entries
      .slice(0, 5)
      .map((e) => e.summary ?? e.raw_text)
      .join(" ");
    if (queryText.length > 10) {
      const similar = await searchSimilarEntries(queryText, user.id, 6);
      // Exclude entries from today to avoid circular context.
      const pastOnly = similar.filter((e) => !e.created_at.startsWith(reportDate));
      if (pastOnly.length > 0) {
        memoryBlock = buildMemoryBlock(pastOnly);
      }
    }
  } catch {
    // RAG failure is non-critical — report continues without past context.
  }

  // Build prompt input
  const promptInput = {
    entries: entries.map((e) => ({
      summary: e.summary,
      raw_text: e.raw_text,
      entry_type: e.entry_type,
      life_area_slug: e.life_area_id ? (areaMap.get(e.life_area_id)?.slug ?? null) : null,
      emotion_primary: e.emotion_primary,
      emotion_intensity: e.emotion_intensity,
      created_at: e.created_at,
    })),
    answers: rawAnswers.map((a) => ({
      question_text: questionMap.get(a.question_id) ?? `Q#${a.question_id}`,
      value_text: a.value_text,
      value_numeric: a.value_numeric,
    })),
    scores: rawScores.map((s) => ({
      area_name: areaMap.get(s.life_area_id)?.name ?? `Area#${s.life_area_id}`,
      score: s.score,
      confidence: s.confidence,
    })),
    todayDate: reportDate,
    memoryBlock,
  };

  // LLM call
  const openai = getLlm();
  const model = MODELS.daily_report;
  const startedAt = Date.now();

  let rawText = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;

  try {
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(promptInput) },
      ],
    });
    tokensIn = resp.usage?.prompt_tokens ?? 0;
    tokensOut = resp.usage?.completion_tokens ?? 0;
    costUsd = estimateCostUsd(model, tokensIn, tokensOut);
    rawText = resp.choices[0]?.message?.content ?? "";
  } catch (e) {
    const msg = (e as Error).message;
    await recordLlmCall({
      userId: user.id,
      task: "report",
      model,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
    return NextResponse.json({ error: `LLM call failed: ${msg}` }, { status: 502 });
  }

  const latencyMs = Date.now() - startedAt;

  // Parse response
  let parsed: z.infer<typeof ReportResponseSchema>;
  try {
    const json = JSON.parse(rawText);
    const result = ReportResponseSchema.safeParse(json);
    if (!result.success) {
      await recordLlmCall({
        userId: user.id,
        task: "report",
        model,
        latencyMs,
        tokensIn,
        tokensOut,
        costUsd,
        ok: false,
        error: result.error.message,
      });
      return NextResponse.json(
        { error: "Report generation returned invalid format.", raw: rawText.slice(0, 500) },
        { status: 422 },
      );
    }
    parsed = result.data;
  } catch {
    await recordLlmCall({
      userId: user.id,
      task: "report",
      model,
      latencyMs,
      tokensIn,
      tokensOut,
      costUsd,
      ok: false,
      error: "JSON parse failed",
    });
    return NextResponse.json(
      { error: "Report generation returned non-JSON.", raw: rawText.slice(0, 500) },
      { status: 422 },
    );
  }

  // Upsert report
  const { data: report, error: upsertError } = await supabase
    .from("daily_reports")
    .upsert(
      {
        user_id: user.id,
        report_date: reportDate,
        body: parsed.body,
        confidence: parsed.confidence,
        headline: parsed.headline ?? null,
      },
      { onConflict: "user_id,report_date" },
    )
    .select("id, user_id, report_date, body, confidence, headline, created_at")
    .single();

  if (upsertError) {
    console.error("[report] upsert failed", upsertError.message);
  }

  // Log success
  await recordLlmCall({
    userId: user.id,
    task: "report",
    model,
    latencyMs,
    tokensIn,
    tokensOut,
    costUsd,
    ok: true,
  });

  return NextResponse.json(
    {
      report: report ?? { body: parsed.body, confidence: parsed.confidence, headline: parsed.headline },
      cached: false,
      usage: {
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd: Number(costUsd.toFixed(6)),
        latency_ms: latencyMs,
      },
    },
    { status: 200 },
  );
}
