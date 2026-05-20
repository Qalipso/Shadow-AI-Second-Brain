import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { generateEmbedding } from "@/lib/embeddings";
import { hasLlm } from "@/lib/llm";

// GET /api/admin/rpc-test
// Runs a live match_entries RPC call with a test query and returns
// the raw Supabase response — including any error. Use to diagnose
// why semantic search returns empty results.

export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }
  if (!hasLlm()) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Step 1: generate embedding for a generic query
  let embedding: number[];
  try {
    const result = await generateEmbedding("feeling tired work stress");
    embedding = result.embedding;
  } catch (e) {
    return NextResponse.json({
      step: "generateEmbedding",
      error: (e as Error).message,
    }, { status: 502 });
  }

  // Step 2: call match_entries RPC directly — expose raw error
  const { data, error } = await supabase.rpc("match_entries", {
    query_embedding: JSON.stringify(embedding),
    match_user_id: user.id,
    match_count: 3,
  });

  if (error) {
    return NextResponse.json({
      step: "match_entries_rpc",
      rpc_error: error.message,
      rpc_code: error.code,
      hint: error.hint ?? null,
      detail: error.details ?? null,
    }, { status: 200 }); // 200 so body is readable
  }

  // Step 3: verify entries table has embeddings
  const { data: sampleEntries, error: entryErr } = await supabase
    .from("entries")
    .select("id, status, embedding")
    .eq("user_id", user.id)
    .not("embedding", "is", null)
    .limit(2);

  return NextResponse.json({
    step: "ok",
    rpc_results_count: (data ?? []).length,
    rpc_sample: (data ?? []).slice(0, 2),
    entries_with_embedding: sampleEntries?.length ?? 0,
    entries_sample: sampleEntries?.map((e: { id: string; status: string; embedding: string | null }) => ({
      id: e.id,
      status: e.status,
      embedding_length: e.embedding ? JSON.parse(e.embedding as string).length : null,
    })),
    entry_fetch_error: entryErr?.message ?? null,
  });
}
