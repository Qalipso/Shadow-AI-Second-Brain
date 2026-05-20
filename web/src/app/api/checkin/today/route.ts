import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// ─── GET /api/checkin/today ───────────────────────────────────────────────────
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ checkins: [], mode: "local" });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data, error } = await supabase
    .from("daily_checkins")
    .select(
      "id, date, energy, mood, mental_noise, body_state, focus, today_focus, today_focus_custom, insight_text, created_at",
    )
    .eq("user_id", user.id)
    .eq("date", today)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ checkins: data ?? [], mode: "db" });
}
