import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// GET /api/initiatives
// Returns active shadow_initiatives for the authenticated user.
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
    .from("shadow_initiatives")
    .select(
      "id, title, reason, suggested_action, initiative_type, linked_area, priority, pattern_duration, status, created_at",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ initiatives: data ?? [] }, { status: 200 });
}
