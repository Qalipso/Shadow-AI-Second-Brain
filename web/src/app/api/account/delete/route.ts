import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// DELETE /api/account/delete
// Deletes all user data rows, then signs the user out.
// Actual auth record removal requires service-role key (not set in client env).
// Cascade: entries, daily_checkins, tasks, life_area_scores, ai_processing_logs.
// The Supabase DB should have ON DELETE CASCADE on all tables with user_id FK.

export async function DELETE() {
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

  // Delete data rows. Supabase RLS ensures only own rows are touched.
  // Order: dependent tables first, entries last (embeddings FK).
  await Promise.all([
    supabase.from("ai_processing_logs").delete().eq("user_id", uid),
    supabase.from("life_area_scores").delete().eq("user_id", uid),
    supabase.from("tasks").delete().eq("user_id", uid),
    supabase.from("daily_checkins").delete().eq("user_id", uid),
  ]);

  // Entries deleted after dependents (embeddings FK, tasks FK).
  await supabase.from("entries").delete().eq("user_id", uid);

  // Sign the user out. Auth record remains until admin deletion is wired.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
