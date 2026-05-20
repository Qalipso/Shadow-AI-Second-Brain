import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { hasLlm } from "@/lib/llm";
import { generateEmbedding } from "@/lib/embeddings";

// GET /api/admin/reembed
// Returns embedding coverage stats for the authenticated user.
//
// POST /api/admin/reembed
// Re-embeds up to 20 processed entries that have no embedding.
// Safe to call multiple times — skips already-embedded entries.

type EntryRow = {
  id: string;
  raw_text: string;
  summary: string | null;
  status: string;
  embedding: string | null;
};

export async function GET() {
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

  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, status, embedding")
    .eq("user_id", user.id)
    .returns<Array<{ id: string; status: string; embedding: string | null }>>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = entries?.length ?? 0;
  const processed = entries?.filter((e) => e.status === "processed").length ?? 0;
  const embedded = entries?.filter((e) => e.embedding !== null).length ?? 0;
  const processedNoEmbed =
    entries?.filter((e) => e.status === "processed" && e.embedding === null).length ?? 0;
  const searchable =
    entries?.filter((e) => e.status === "processed" && e.embedding !== null).length ?? 0;

  return NextResponse.json({
    total,
    processed,
    embedded,
    searchable,
    missing_embed: processedNoEmbed,
    note:
      processedNoEmbed > 0
        ? `${processedNoEmbed} entries ready to re-embed. POST to this endpoint.`
        : "All processed entries have embeddings.",
  });
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

  // Parse optional limit from body
  let limit = 20;
  try {
    const body = (await request.json()) as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 50) {
      limit = body.limit;
    }
  } catch {
    // no body or invalid — use default
  }

  // Fetch processed entries without embeddings
  const { data: entries, error: fetchErr } = await supabase
    .from("entries")
    .select("id, raw_text, summary, status, embedding")
    .eq("user_id", user.id)
    .eq("status", "processed")
    .is("embedding", null)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<EntryRow[]>();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({ embedded: 0, message: "No entries need re-embedding." });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const entry of entries) {
    const text = entry.summary ?? entry.raw_text;
    try {
      const result = await generateEmbedding(text);
      const { error: updateErr } = await supabase
        .from("entries")
        .update({ embedding: JSON.stringify(result.embedding) })
        .eq("id", entry.id)
        .eq("user_id", user.id);

      results.push({ id: entry.id, ok: !updateErr, error: updateErr?.message });
    } catch (e) {
      results.push({ id: entry.id, ok: false, error: (e as Error).message });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    attempted: entries.length,
    embedded: succeeded,
    failed,
    results,
  });
}
