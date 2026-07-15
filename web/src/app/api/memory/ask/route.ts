import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
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
import { searchSimilarEntries, buildMemoryBlock } from "@/lib/rag";
import {
  buildUserPrompt,
  SYSTEM_PROMPT,
} from "@/ai/prompts/memory-answer";
import {
  isOverDailyCap,
  maxDailyUsd,
  recordLlmCall,
  todaysCostUsd,
} from "@/lib/cost-ledger";

// POST /api/memory/ask { question }
// Semantic search over past entries + LLM answer.

const RequestSchema = z.object({
  question: z.string().min(3).max(1000),
});

const AnswerSchema = z.object({
  answer: z.string(),
  cited_entries: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const MAX_TOKENS = 600;

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
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

  const question = parsed.data.question;

  // RAG retrieval
  let memoryBlock = "";
  let matchedEntries: Awaited<ReturnType<typeof searchSimilarEntries>> = [];
  try {
    matchedEntries = await searchSimilarEntries(question, user.id, 5);
    memoryBlock = buildMemoryBlock(matchedEntries);
  } catch (e) {
    console.error("[memory/ask] RAG search failed", (e as Error).message);
    // Continue without memory — LLM will say "not enough data"
  }

  if (matchedEntries.length === 0) {
    return NextResponse.json({
      answer: "I don't have enough memory to answer that yet. Keep capturing, and I'll build context over time.",
      cited_entries: [],
      sources: [],
      confidence: 0,
      matched: 0,
    });
  }

  // LLM answer — provider-agnostic (DECISIONS/011).
  const model = resolveModel("rag_answer", providerName);
  const startedAt = Date.now();

  let rawText = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;

  try {
    const resp = await getConfiguredProvider().complete({
      model,
      maxTokens: MAX_TOKENS,
      temperature: 0.5,
      jsonMode: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(question, memoryBlock) },
      ],
    });
    tokensIn = resp.usage.tokensIn;
    tokensOut = resp.usage.tokensOut;
    costUsd = estimateCostUsd(model, tokensIn, tokensOut);
    rawText = resp.text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordLlmCall({
      userId: user.id,
      task: "rag_answer",
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

  const latencyMs = Date.now() - startedAt;

  // Parse response
  let result: z.infer<typeof AnswerSchema>;
  try {
    const json = JSON.parse(rawText);
    const parseResult = AnswerSchema.safeParse(json);
    if (!parseResult.success) {
      await recordLlmCall({
        userId: user.id,
        task: "rag_answer",
        model,
        latencyMs,
        tokensIn,
        tokensOut,
        costUsd,
        ok: false,
        error: parseResult.error.message,
      });
      return NextResponse.json(
        { error: "Invalid answer format.", raw: rawText.slice(0, 300) },
        { status: 422 },
      );
    }
    result = parseResult.data;
  } catch {
    await recordLlmCall({
      userId: user.id,
      task: "rag_answer",
      model,
      latencyMs,
      tokensIn,
      tokensOut,
      costUsd,
      ok: false,
      error: "JSON parse failed",
    });
    return NextResponse.json({ error: "Non-JSON response." }, { status: 422 });
  }

  await recordLlmCall({
    userId: user.id,
    task: "rag_answer",
    model,
    latencyMs,
    tokensIn,
    tokensOut,
    costUsd,
    ok: true,
  });

  // Resolve cited entry IDs against the entries already fetched for the
  // memory block, so the client can show what actually grounded the answer
  // instead of opaque UUIDs (issue #25) — no extra DB round trip needed.
  const citedIds = new Set(result.cited_entries ?? []);
  const sources = matchedEntries
    .filter((e) => citedIds.has(e.id))
    .map((e) => ({
      id: e.id,
      snippet: (e.summary ?? e.raw_text).slice(0, 140),
      created_at: e.created_at,
    }));

  return NextResponse.json({
    answer: result.answer,
    cited_entries: result.cited_entries ?? [],
    sources,
    confidence: result.confidence ?? 0.5,
    matched: matchedEntries.length,
    usage: {
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: Number(costUsd.toFixed(6)),
      latency_ms: latencyMs,
    },
  });
}
