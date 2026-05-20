import { NextResponse } from "next/server";
import { buildSpotifyAuthUrl } from "@/lib/music/spotify";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

// GET /api/music/connect — generate Spotify OAuth URL, redirect
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  if (!process.env.SPOTIFY_CLIENT_ID) {
    return NextResponse.json({ error: "Spotify not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // CSRF state: random bytes stored in short-lived cookie
  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("sonic_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const url = buildSpotifyAuthUrl(state);
  return NextResponse.redirect(url);
}
