import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { estimateCostUsd } from "@/lib/llm";
import {
  getConfiguredProvider,
  getConfiguredProviderName,
  hasProvider,
  resolveModel,
  LLMRateLimited,
} from "@/lib/llm-provider";
import {
  isOverDailyCap,
  maxDailyUsd,
  recordLlmCall,
  todaysCostUsd,
} from "@/lib/cost-ledger";
import {
  GenerateRequest,
  InterventionResult,
  TaskShatterInput,
  DopamineMenuInput,
  ContextSwitchInput,
  InterestFilterInput,
  type InterventionType,
} from "@/lib/interventions/types";
import { buildPrompt } from "@/ai/prompts/interventions";
import { insertIntervention } from "@/lib/interventions/queries";
import { recordInterventionActivity } from "@/lib/interventions/journal";

// POST /api/interventions/generate
// Generate a Shadow Intervention via LLM, validate, persist, return.

function validateInput(type: InterventionType, raw: unknown) {
  switch (type) {
    case "task_shatter":
      return TaskShatterInput.safeParse(raw);
    case "dopamine_menu":
      return DopamineMenuInput.safeParse(raw);
    case "context_switch":
      return ContextSwitchInput.safeParse(raw);
    case "interest_filter":
      return InterestFilterInput.safeParse(raw);
  }
}

function extractFirstAction(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  if (typeof r.firstAction === "string") return r.firstAction;
  if (r.kind === "dopamine_menu" && Array.isArray(r.appetizers) && r.appetizers[0]) {
    const a = r.appetizers[0] as Record<string, unknown>;
    if (typeof a.title === "string") return a.title;
  }
  if (r.kind === "interest_filter" && Array.isArray(r.stages) && r.stages[0]) {
    const s = r.stages[0] as Record<string, unknown>;
    if (typeof s.action === "string") return s.action;
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }
  const providerName = getConfiguredProviderName();
  if (!hasProvider(providerName)) {
    return NextResponse.json(
      { error: `${providerName === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} missing.` },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Parse outer
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = GenerateRequest.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { type, energyLevel, mood, friction, input } = parsed.data;

  // Per-tool input validation
  const inputCheck = validateInput(type, input);
  if (!inputCheck.success) {
    return NextResponse.json(
      { error: "Invalid tool input.", details: inputCheck.error.flatten() },
      { status: 400 },
    );
  }

  // Cost cap
  if (await isOverDailyCap(user.id)) {
    const spent = await todaysCostUsd(user.id);
    return NextResponse.json(
      {
        error: "Daily LLM cost cap reached.",
        spent_usd: Number(spent.toFixed(4)),
        cap_usd: maxDailyUsd(),
      },
      { status: 429 },
    );
  }

  const { system, user: userMsg } = buildPrompt(type, {
    input: inputCheck.data,
    energyLevel,
    mood,
    friction,
  });

  const model = resolveModel("classify", providerName); // fast/cheap is enough; outputs are short JSON
  const startedAt = Date.now();
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;
  let resultJson: unknown = null;

  try {
    const resp = await getConfiguredProvider().complete({
      model,
      maxTokens: 900,
      temperature: 0.75,
      jsonMode: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    });
    tokensIn = resp.usage.tokensIn;
    tokensOut = resp.usage.tokensOut;
    costUsd = estimateCostUsd(model, tokensIn, tokensOut);
    const text = resp.text.trim();
    try {
      resultJson = JSON.parse(text);
    } catch {
      throw new Error("Model did not return valid JSON.");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordLlmCall({
      userId: user.id,
      task: "classify",
      model,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
    if (e instanceof LLMRateLimited) {
      return NextResponse.json({ error: `LLM rate limited: ${msg}` }, { status: 429 });
    }
    return NextResponse.json({ error: `LLM call failed: ${msg}` }, { status: 502 });
  }

  // Force kind to match requested type before validation
  if (resultJson && typeof resultJson === "object") {
    (resultJson as Record<string, unknown>).kind = type;
  }
  const resultParsed = InterventionResult.safeParse(resultJson);
  if (!resultParsed.success) {
    await recordLlmCall({
      userId: user.id,
      task: "classify",
      model,
      latencyMs: Date.now() - startedAt,
      tokensIn,
      tokensOut,
      costUsd,
      ok: false,
      error: "result schema mismatch",
    });
    return NextResponse.json(
      {
        error: "AI output did not match schema.",
        details: resultParsed.error.flatten(),
        raw: resultJson,
      },
      { status: 502 },
    );
  }

  const latencyMs = Date.now() - startedAt;
  await recordLlmCall({
    userId: user.id,
    task: "classify",
    model,
    latencyMs,
    tokensIn,
    tokensOut,
    costUsd,
    ok: true,
  });

  const firstAction = extractFirstAction(resultParsed.data);

  const row = await insertIntervention({
    userId: user.id,
    type,
    userInput: inputCheck.data as Record<string, unknown>,
    energyLevel: energyLevel ?? null,
    mood: mood ?? null,
    friction: friction ?? null,
    resultJson: resultParsed.data,
    firstAction,
    model,
    tokensIn,
    tokensOut,
    costUsd,
  });

  if (row) {
    await recordInterventionActivity({
      userId: user.id,
      intervention: row,
      activity: "generated",
    });
  }

  return NextResponse.json({
    intervention: row,
    result: resultParsed.data,
    usage: {
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: Number(costUsd.toFixed(6)),
      latency_ms: latencyMs,
    },
  });
}
