import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  estimateCostUsd,
  getLlm,
  hasLlm,
  MODELS,
} from "@/lib/llm";
import {
  buildUserPrompt,
  CLASSIFICATION_SCHEMA_VERSION,
  SYSTEM_PROMPT,
} from "@/ai/prompts/classification";
import {
  parseClassificationResponse,
  type ClassificationResult,
} from "@/lib/entries/classification";
import {
  isOverDailyCap,
  maxDailyUsd,
  recordLlmCall,
  todaysCostUsd,
} from "@/lib/cost-ledger";
import { checkRateLimit, getRouteConfig } from "@/lib/rate-limit";

// POST /api/classify { entry_id }
//
// Pipeline:
// 1. Auth check (must own the entry).
// 2. Daily cost cap check (per-user, sums today's ai_processing_logs.cost_usd).
// 3. Fetch entry by id.
// 4. Call Claude Haiku 4.5 with system + user prompts.
// 5. Strict Zod-validate response → 422 on failure.
// 6. Resolve life_area_slug → life_area_id.
// 7. Update entries row (summary, entry_type, life_area_id, emotion_*).
// 8. If extracted_task → insert into tasks table.
// 9. Log call to ai_processing_logs (always, even on failure).
//
// Errors are surfaced honestly; no silent retries.

const RequestSchema = z.object({
  entry_id: z.string().uuid(),
});

const MAX_TOKENS = 600;

type EntryRow = {
  id: string;
  user_id: string;
  raw_text: string;
  status: string;
};

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json(
      { error: "Supabase env missing." },
      { status: 503 },
    );
  }
  if (!hasLlm()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY missing." },
      { status: 503 },
    );
  }

  // ─── Parse body ─────────────────────────────────────────────────────────
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
  const entryId = parsed.data.entry_id;

  // ─── Auth ───────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ─── Rate limit ─────────────────────────────────────────────────────────
  const rl = checkRateLimit(`${user.id}:classify`, getRouteConfig("classify"));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // ─── Cost cap ───────────────────────────────────────────────────────────
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

  // ─── Fetch entry (RLS scopes to user) ───────────────────────────────────
  const { data: entryRow, error: fetchError } = await supabase
    .from("entries")
    .select("id, user_id, raw_text, status")
    .eq("id", entryId)
    .single<EntryRow>();
  if (fetchError || !entryRow) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Entry not found." },
      { status: 404 },
    );
  }
  if (entryRow.user_id !== user.id) {
    // RLS should already prevent this, but defense-in-depth.
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // ─── LLM call ───────────────────────────────────────────────────────────
  const openai = getLlm();
  const model = MODELS.classify;
  const startedAt = Date.now();
  let result: ClassificationResult | null = null;
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;
  let rawText = "";

  try {
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      // Force valid-JSON output. System prompt mentions "Return JSON only".
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(
            entryRow.raw_text,
            new Date().toISOString().slice(0, 10),
          ),
        },
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
      task: "classify",
      model,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
    return NextResponse.json(
      { error: `LLM call failed: ${msg}` },
      { status: 502 },
    );
  }

  const latencyMs = Date.now() - startedAt;

  // ─── Validate ───────────────────────────────────────────────────────────
  const parseRes = parseClassificationResponse(rawText);
  if (!parseRes.success) {
    await recordLlmCall({
      userId: user.id,
      task: "classify",
      model,
      latencyMs,
      tokensIn,
      tokensOut,
      costUsd,
      ok: false,
      error: parseRes.error,
    });
    return NextResponse.json(
      {
        error: "Classifier produced invalid JSON.",
        detail: parseRes.error,
        raw: rawText.slice(0, 500),
        schema_version: CLASSIFICATION_SCHEMA_VERSION,
      },
      { status: 422 },
    );
  }
  result = parseRes.data;

  // ─── Resolve life area slug → id ────────────────────────────────────────
  let lifeAreaId: number | null = null;
  if (result.life_area_slug) {
    const { data: area } = await supabase
      .from("life_areas")
      .select("id")
      .eq("slug", result.life_area_slug)
      .single<{ id: number }>();
    lifeAreaId = area?.id ?? null;
  }

  // ─── Update entry ───────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("entries")
    .update({
      summary: result.summary,
      entry_type: result.entry_type,
      life_area_id: lifeAreaId,
      emotion_primary: result.emotion?.primary ?? null,
      emotion_intensity: result.emotion?.intensity ?? null,
      status: "processed",
    })
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (updateError) {
    await recordLlmCall({
      userId: user.id,
      task: "classify",
      model,
      latencyMs,
      tokensIn,
      tokensOut,
      costUsd,
      ok: false,
      error: `update entries: ${updateError.message}`,
    });
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  // ─── Insert into entry_life_areas junction (best-effort) ───────────────
  if (lifeAreaId) {
    const { error: junctionError } = await supabase
      .from("entry_life_areas")
      .upsert(
        {
          entry_id: entryId,
          life_area_id: lifeAreaId,
          is_primary: true,
        },
        { onConflict: "entry_id,life_area_id" },
      );
    if (junctionError) {
      console.error("[classify] entry_life_areas insert failed", junctionError.message);
    }
  }

  // ─── Insert extracted task (best-effort) ───────────────────────────────
  let createdTaskId: string | null = null;
  if (result.extracted_task) {
    const { data: taskRow, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: result.extracted_task.title,
        linked_entry_id: entryId,
        due_at: parseDueDate(result.extracted_task.due),
        status: "open",
      })
      .select("id")
      .single<{ id: string }>();
    if (taskError) {
      console.error("[classify] task insert failed", taskError.message);
    } else {
      createdTaskId = taskRow?.id ?? null;
    }
  }

  // ─── Log success ────────────────────────────────────────────────────────
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

  // ─── Auto-trigger embedding + scoring (fire-and-forget) ────────────────
  try {
    const host = request.headers.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const cookie = request.headers.get("cookie") ?? "";
    // Embed entry (uses fresh summary) — enables memory search.
    void fetch(`${protocol}://${host}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ entry_id: entryId }),
    });
    // Score life areas.
    void fetch(`${protocol}://${host}/api/score-areas`, {
      method: "POST",
      headers: { cookie },
    });
  } catch {
    // Downstream failures must not fail classify.
  }

  return NextResponse.json(
    {
      entry_id: entryId,
      classification: result,
      life_area_id: lifeAreaId,
      task_id: createdTaskId,
      usage: {
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd: Number(costUsd.toFixed(6)),
        latency_ms: latencyMs,
      },
      schema_version: CLASSIFICATION_SCHEMA_VERSION,
    },
    { status: 200 },
  );
}

// Parse a loose date string from the model (e.g., "2026-05-13" or "tomorrow").
// We only accept strict ISO dates. Everything else becomes null.
function parseDueDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // YYYY-MM-DD or YYYY-MM-DDTHH:MM... — let Date validate.
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
