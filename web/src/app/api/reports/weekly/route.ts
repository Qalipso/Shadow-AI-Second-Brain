import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { estimateCostUsd, getLlm, hasLlm, MODELS } from "@/lib/llm";
import { isOverDailyCap, maxDailyUsd, recordLlmCall, todaysCostUsd } from "@/lib/cost-ledger";
import { getCheckinStreak } from "@/lib/data";
import { SYSTEM_PROMPT, buildWeeklyUserPrompt } from "@/ai/prompts/weekly-digest";

// POST /api/reports/weekly
// Generates a weekly digest for the current ISO week.
// Returns { headline, theme, patterns, nudge, streak, week_start, week_end }.

function currentWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { weekStart: fmt(mon), weekEnd: fmt(sun) };
}

export async function POST(_request: NextRequest) {
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

  if (await isOverDailyCap(user.id)) {
    const spent = await todaysCostUsd(user.id);
    return NextResponse.json(
      { error: "Daily LLM cost cap reached.", spent_usd: Number(spent.toFixed(4)), cap_usd: maxDailyUsd() },
      { status: 429 },
    );
  }

  const { weekStart, weekEnd } = currentWeekBounds();

  // Fetch check-ins and entries for this week in parallel.
  const [checkinsResult, entriesResult, streak] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("date, energy, mood, mental_noise")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .order("date", { ascending: true }),
    supabase
      .from("entries")
      .select("raw_text, created_at")
      .eq("user_id", user.id)
      .gte("created_at", `${weekStart}T00:00:00Z`)
      .lte("created_at", `${weekEnd}T23:59:59Z`)
      .order("created_at", { ascending: false })
      .limit(5),
    getCheckinStreak(user.id),
  ]);

  const checkins = (checkinsResult.data ?? []) as Array<{
    date: string;
    energy: number | null;
    mood: number | null;
    mental_noise: number | null;
  }>;

  const entrySamples = (entriesResult.data ?? []).map((e: { raw_text: string }) =>
    e.raw_text.slice(0, 120),
  );

  const userPrompt = buildWeeklyUserPrompt({ weekStart, weekEnd, streak, checkins, entrySamples });

  const openai = getLlm();
  const model = MODELS.rag_answer;
  const startedAt = Date.now();

  let raw = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;

  try {
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: 400,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    tokensIn = resp.usage?.prompt_tokens ?? 0;
    tokensOut = resp.usage?.completion_tokens ?? 0;
    costUsd = estimateCostUsd(model, tokensIn, tokensOut);
    raw = resp.choices[0]?.message?.content?.trim() ?? "";
  } catch (e) {
    const msg = (e as Error).message;
    await recordLlmCall({
      userId: user.id,
      task: "weekly_digest",
      model,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
    return NextResponse.json({ error: `LLM call failed: ${msg}` }, { status: 502 });
  }

  const latencyMs = Date.now() - startedAt;

  await recordLlmCall({
    userId: user.id,
    task: "weekly_digest",
    model,
    latencyMs,
    tokensIn,
    tokensOut,
    costUsd,
    ok: true,
  });

  let parsed: { headline: string; theme: string; patterns: string[]; nudge: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "LLM returned invalid JSON.", raw }, { status: 502 });
  }

  return NextResponse.json({
    headline: parsed.headline ?? "",
    theme: parsed.theme ?? "",
    patterns: parsed.patterns ?? [],
    nudge: parsed.nudge ?? "",
    streak,
    week_start: weekStart,
    week_end: weekEnd,
    checkins_count: checkins.length,
    usage: {
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: Number(costUsd.toFixed(6)),
      latency_ms: latencyMs,
    },
  });
}
