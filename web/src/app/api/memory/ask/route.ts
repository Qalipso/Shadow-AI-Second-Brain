import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { estimateCostUsd, getLlm, hasLlm, MODELS } from "@/lib/llm";
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
  if (!hasLlm()) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 503 });
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
      confidence: 0,
      matched: 0,
    });
  }

  // LLM answer
  const openai = getLlm();
  const model = MODELS.rag_answer;
  const startedAt = Date.now();

  let rawText = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;

  try {
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(question, memoryBlock) },
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
      task: "rag_answer",
      model,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
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

  return NextResponse.json({
    answer: result.answer,
    cited_entries: result.cited_entries ?? [],
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
