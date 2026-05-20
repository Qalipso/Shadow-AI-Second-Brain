import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

const BodySchema = z.object({
  delete_data: z.boolean().default(false), // if true, also delete all imported music data
});

// DELETE /api/music/spotify/disconnect
// Body: { "delete_data": true|false }
export async function DELETE(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: unknown = {};
  try { body = await request.json(); } catch { /* empty body is fine */ }
  const parsed = BodySchema.safeParse(body);
  const deleteData = parsed.success ? parsed.data.delete_data : false;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Soft disconnect: mark as disconnected, wipe encrypted tokens
  const { error: connErr } = await supabase
    .from("spotify_connections")
    .update({
      status: "disconnected",
      access_token_enc: "",
      refresh_token_enc: null,
      error_message: "Disconnected by user.",
    })
    .eq("user_id", user.id);

  if (connErr) {
    return NextResponse.json({ error: connErr.message }, { status: 500 });
  }

  if (deleteData) {
    // Delete all imported Spotify data
    await Promise.all([
      supabase.from("spotify_artist_items").delete().eq("user_id", user.id),
      supabase.from("spotify_track_items").delete().eq("user_id", user.id),
      supabase.from("music_snapshots").delete().eq("user_id", user.id),
      supabase.from("music_meaning_labels").delete().eq("user_id", user.id),
      supabase.from("sonic_reflections").delete().eq("user_id", user.id),
      // Also clean up old music_profiles table data
      supabase.from("music_profiles").delete().eq("user_id", user.id),
      supabase.from("emotional_anchors").delete().eq("user_id", user.id),
    ]);
  }

  return NextResponse.json({ ok: true, data_deleted: deleteData });
}
