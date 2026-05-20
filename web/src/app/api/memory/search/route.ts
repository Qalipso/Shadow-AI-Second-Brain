import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { hasLlm } from "@/lib/llm";
import { generateEmbedding } from "@/lib/embeddings";

// POST /api/memory/search { query, limit? }
// Semantic vector search over user's entries (pgvector, no LLM for retrieval).
// Single Supabase client shared for auth + RPC — avoids secondary client auth loss.

type RpcRow = {
  id: string;
  raw_text: string;
  summary: string | null;
  entry_type: string | null;
  life_area_id: number | null;
  emotion_primary: string | null;
  created_at: string;
  similarity: number;
};

const BodySchema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(20).optional().default(8),
});

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

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { query, limit } = parsed.data;

  // Generate query embedding
  let embedding: number[];
  try {
    const result = await generateEmbedding(query);
    embedding = result.embedding;
  } catch (e) {
    return NextResponse.json(
      { error: `Embedding failed: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  // Vector similarity search — same authenticated client as auth check
  const { data, error: rpcError } = await supabase.rpc("match_entries", {
    query_embedding: JSON.stringify(embedding),
    match_user_id: user.id,
    match_count: limit,
  });

  if (rpcError) {
    console.error("[memory/search] RPC error:", rpcError.message);
    return NextResponse.json(
      { error: `Search failed: ${rpcError.message}` },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as RpcRow[];

  return NextResponse.json({
    query,
    results: rows.map((r) => ({
      id: r.id,
      text: r.raw_text,
      summary: r.summary,
      entry_type: r.entry_type,
      emotion: r.emotion_primary,
      created_at: r.created_at,
      score: Math.round(r.similarity * 100),
    })),
  });
}
