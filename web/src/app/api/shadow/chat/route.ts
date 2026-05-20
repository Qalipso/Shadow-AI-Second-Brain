import { NextResponse, type NextRequest } from "next/server";
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
import { buildMemoryContext } from "@/lib/memory/context";
import { buildChatMessages, isDeepQuery } from "@/ai/prompts/shadow-chat";
import { checkRateLimit, getRouteConfig } from "@/lib/rate-limit";

// POST /api/shadow/chat
//
// Body: { message: string, history: Array<{role: "you"|"shadow", text: string}> }
// Returns: { reply: string, sources_count: number, mode: "mini"|"deep" }

const HistoryItemSchema = z.object({
  role: z.enum(["you", "shadow"]),
  text: z.string().max(2000),
});

const RequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(HistoryItemSchema).max(40).default([]),
});

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }
  if (!hasLlm()) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 503 });
  }

  // Auth
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Rate limit
  const rl = checkRateLimit(`${user.id}:chat`, getRouteConfig("chat"));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // Parse body
  let body: z.infer<typeof RequestSchema>;
  try {
    const raw = await request.json();
    const result = RequestSchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request.", details: result.error.flatten() },
        { status: 400 },
      );
    }
    body = result.data;
  } catch {
    return NextResponse.json({ error: "Could not parse request body." }, { status: 400 });
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

  const todayDate = todayDateStr();
  const deep = isDeepQuery(body.message);
  const model = deep ? MODELS.rag_answer : MODELS.classify;

  // Build memory context (RAG + today + scores)
  const ctx = await buildMemoryContext(body.message, user.id, {
    k: deep ? 8 : 5,
    includeToday: true,
    includeScores: deep,
  });

  // Build messages
  const messages = buildChatMessages({
    message: body.message,
    history: body.history,
    memoryBlock: ctx.block,
    todayDate,
  });

  // LLM call
  const openai = getLlm();
  const startedAt = Date.now();
  let replyText = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;

  try {
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: deep ? 1000 : 500,
      temperature: 0.75,
      messages,
    });
    tokensIn = resp.usage?.prompt_tokens ?? 0;
    tokensOut = resp.usage?.completion_tokens ?? 0;
    costUsd = estimateCostUsd(model, tokensIn, tokensOut);
    replyText = resp.choices[0]?.message?.content?.trim() ?? "";
  } catch (e) {
    const msg = (e as Error).message;
    await recordLlmCall({
      userId: user.id,
      task: "chat",
      model,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
    return NextResponse.json({ error: `LLM call failed: ${msg}` }, { status: 502 });
  }

  const latencyMs = Date.now() - startedAt;

  const replyId = await recordLlmCall({
    userId: user.id,
    task: "chat",
    model,
    latencyMs,
    tokensIn,
    tokensOut,
    costUsd,
    ok: true,
  });

  const sources = ctx.similar.slice(0, 3).map((e) => ({
    id: e.id,
    snippet: (e.summary ?? e.raw_text).slice(0, 90),
    created_at: e.created_at,
  }));

  return NextResponse.json({
    reply: replyText || "...",
    reply_id: replyId,
    sources_count: ctx.similar.length,
    sources,
    mode: deep ? "deep" : "mini",
    usage: {
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: Number(costUsd.toFixed(6)),
      latency_ms: latencyMs,
    },
  });
}
