import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// GET /api/account/export
// Returns a JSON file containing all personal data for the authenticated user.
// Tables: entries, daily_checkins, tasks, answers, life_area_scores, ai_processing_logs.

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

  const uid = user.id;

  // Fetch all personal tables in parallel.
  const [entries, checkins, tasks, scores, logs] = await Promise.all([
    supabase
      .from("entries")
      .select("id, raw_text, summary, entry_type, life_area_id, emotion_primary, emotion_intensity, status, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true }),

    supabase
      .from("daily_checkins")
      .select("id, energy, mood, mental_noise, body_state, focus, notes, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true }),

    supabase
      .from("tasks")
      .select("id, title, due_date, done, source_entry_id, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true }),

    supabase
      .from("life_area_scores")
      .select("life_area_id, score, confidence, computed_at")
      .eq("user_id", uid)
      .order("computed_at", { ascending: true }),

    supabase
      .from("ai_processing_logs")
      .select("task, model, tokens_in, tokens_out, cost_usd, ok, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true }),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: uid,
    email: user.email,
    entries: entries.data ?? [],
    daily_checkins: checkins.data ?? [],
    tasks: tasks.data ?? [],
    life_area_scores: scores.data ?? [],
    ai_processing_logs: logs.data ?? [],
  };

  const body = JSON.stringify(payload, null, 2);
  const filename = `shadow-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
