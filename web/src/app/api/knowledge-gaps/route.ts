import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { detectKnowledgeGaps } from "@/lib/ai-brain/knowledge-gaps";

// GET /api/knowledge-gaps
// Returns open knowledge gaps for the authenticated user (status != 'dismissed').
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

  const { data, error } = await supabase
    .from("knowledge_gaps")
    .select("id, reason, source, area, priority, status, created_at")
    .eq("user_id", user.id)
    .neq("status", "dismissed")
    .order("priority", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ gaps: data ?? [] }, { status: 200 });
}

// POST /api/knowledge-gaps
// Detects new knowledge gaps and saves them to the DB.
export async function POST() {
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

  const detectedGaps = await detectKnowledgeGaps(user.id).catch(() => []);

  if (detectedGaps.length === 0) {
    return NextResponse.json({ inserted: 0, gaps: [] }, { status: 200 });
  }

  const rows = detectedGaps.map((g) => ({
    user_id: user.id,
    reason: g.reason,
    source: g.source,
    area: g.area,
    priority: g.priority,
    status: "open",
  }));

  const { data: inserted, error } = await supabase
    .from("knowledge_gaps")
    .insert(rows)
    .select("id, reason, source, area, priority, status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: (inserted ?? []).length, gaps: inserted ?? [] }, { status: 200 });
}
