import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// DELETE /api/music/disconnect — remove music profile and all associated data
export async function DELETE() {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Delete profile (cascades emotional_anchors, music_insights via RLS scope)
  const { error: profileError } = await supabase
    .from("music_profiles")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "spotify");

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Also clean up insights and anchors
  await Promise.all([
    supabase.from("music_insights").delete().eq("user_id", user.id),
    supabase.from("emotional_anchors").delete().eq("user_id", user.id),
  ]);

  return NextResponse.json({ ok: true });
}
