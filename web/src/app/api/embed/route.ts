import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { hasLlm } from "@/lib/llm";
import { generateEmbedding, embedModel } from "@/lib/embeddings";
import { recordLlmCall } from "@/lib/cost-ledger";

// POST /api/embed { entry_id }
// Generates and stores embedding for a processed entry.
// Called after classification succeeds. Idempotent — overwrites if exists.

const RequestSchema = z.object({
  entry_id: z.string().uuid(),
});

type EntryRow = {
  id: string;
  user_id: string;
  raw_text: string;
  summary: string | null;
  status: string;
};

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
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Fetch entry
  const { data: entry, error: fetchErr } = await supabase
    .from("entries")
    .select("id, user_id, raw_text, summary, status")
    .eq("id", parsed.data.entry_id)
    .single<EntryRow>();

  if (fetchErr || !entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }
  if (entry.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Text to embed: use summary if available, else raw_text
  const textToEmbed = entry.summary ?? entry.raw_text;
  const startedAt = Date.now();

  try {
    const result = await generateEmbedding(textToEmbed);
    const latencyMs = Date.now() - startedAt;

    // Store embedding
    const { error: updateErr } = await supabase
      .from("entries")
      .update({ embedding: JSON.stringify(result.embedding) })
      .eq("id", entry.id)
      .eq("user_id", user.id);

    if (updateErr) {
      console.error("[embed] update failed", updateErr.message);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await recordLlmCall({
      userId: user.id,
      task: "embed",
      model: result.model,
      latencyMs,
      tokensIn: result.tokensUsed,
      tokensOut: 0,
      costUsd: result.costUsd,
      ok: true,
    });

    return NextResponse.json({
      entry_id: entry.id,
      embedded: true,
      model: result.model,
      tokens: result.tokensUsed,
      cost_usd: Number(result.costUsd.toFixed(6)),
      latency_ms: latencyMs,
    });
  } catch (e) {
    const msg = (e as Error).message;
    await recordLlmCall({
      userId: user.id,
      task: "embed",
      model: embedModel(),
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
