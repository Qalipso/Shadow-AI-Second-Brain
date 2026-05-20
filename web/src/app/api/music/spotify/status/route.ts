import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// GET /api/music/spotify/status
// Returns connection state — never exposes tokens
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ status: "not_configured" });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data } = await supabase
    .from("spotify_connections")
    .select(
      "status, spotify_user_id, spotify_display_name, scopes, connected_at, last_synced_at, error_message, token_expires_at",
    )
    .eq("user_id", user.id)
    .single();

  if (!data) {
    return NextResponse.json({ status: "not_connected" });
  }

  // Check if token is expired
  const expired = new Date(data.token_expires_at).getTime() < Date.now();

  return NextResponse.json({
    status: expired ? "expired" : data.status,
    spotify_user_id: data.spotify_user_id,
    spotify_display_name: data.spotify_display_name,
    scopes: data.scopes,
    connected_at: data.connected_at,
    last_synced_at: data.last_synced_at,
    error_message: data.error_message,
  });
}
