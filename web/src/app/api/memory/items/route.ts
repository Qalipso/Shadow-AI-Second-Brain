import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { insertMemoryItem } from "@/lib/memory/write";

// POST /api/memory/items
// Save a memory item from an inbox capture or other source.
// Uses existing memory_items table (source_type = 'inbox').

const BodySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  source_type: z.string().default("inbox"),
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

  const item = await insertMemoryItem(user.id, {
    title: parsed.data.title,
    content: parsed.data.content,
    source_type: parsed.data.source_type,
    source_id: parsed.data.source_id,
    tags: parsed.data.tags,
    importance: parsed.data.importance,
    memory_type: "insight", // explicit: a manual capture is a generic saved thought
  });

  if (!item) {
    return NextResponse.json({ error: "Insert failed." }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
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
