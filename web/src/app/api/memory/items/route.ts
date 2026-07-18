import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { writeMemoryItems } from "@/lib/memory/writeMemoryItems";

// POST /api/memory/items
// Save a memory item from an inbox capture or other source.
// Uses existing memory_items table (source_type = 'inbox').
//
// source_type is NOT client-settable (issue #23): it's the only field that
// distinguishes user-authored from AI-synthesized memory, and this is the
// one user-facing write path, so it's hardcoded below rather than accepted
// from the request body — a client can no longer POST source_type:
// "brain_synthesis" to impersonate AI-authored provenance.

const BodySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  source_id: z.string().uuid().optional(),
  tags: z.array(z.string()).max(10).default([]),
  importance: z.number().int().min(1).max(5).default(3),
});

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
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

  const { items, error } = await writeMemoryItems([
    {
      userId: user.id,
      // Hardcoded, not client-settable (issue #23): this is the one
      // user-facing capture path, so it can never write any of the other
      // MEMORY_SOURCE_TYPES (e.g. "brain_synthesis") on a caller's behalf —
      // a client can no longer POST its way into impersonating AI-authored
      // provenance. Other source types are only ever written server-side by
      // their own dedicated routes (save-memory, labs/complete, synthesizer).
      sourceType: "inbox",
      sourceId: parsed.data.source_id ?? null,
      title: parsed.data.title,
      content: parsed.data.content,
      // Explicit, not the DB default (issue #22) — "insight" preserves what
      // the column default already produced for every row this route has
      // written so far; a finer per-item taxonomy is a product decision, not
      // an architecture-boundary one, so it's deliberately not guessed here.
      memoryType: "insight",
      importance: parsed.data.importance,
      tags: parsed.data.tags,
    },
  ]);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ item: items[0] }, { status: 201 });
}

// GET /api/memory/items?limit=20
// List recent memory items for the current user.
export async function GET(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ items: [] });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);

  const { data: items, error } = await supabase
    .from("memory_items")
    .select("id, title, content, source_type, tags, importance, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: items ?? [] });
}
