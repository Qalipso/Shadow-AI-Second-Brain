import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { hasEncryptionKey } from "@/lib/music/crypto";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildSpotifyPKCEAuthUrl,
} from "@/lib/music/pkce";

// GET /api/music/spotify/connect
// Initiates Spotify PKCE OAuth. Requires user to be authenticated.
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REDIRECT_URI) {
    return NextResponse.json({ error: "Spotify is not configured on this server." }, { status: 503 });
  }
  if (!hasEncryptionKey()) {
    return NextResponse.json({ error: "Token encryption not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`);
  }

  // PKCE: generate verifier + challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // CSRF state token
  const state = randomBytes(16).toString("hex");

  // Store both in short-lived httpOnly cookies
  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
  };
  cookieStore.set("sp_pkce_verifier", codeVerifier, cookieOpts);
  cookieStore.set("sp_oauth_state", state, cookieOpts);

  const url = buildSpotifyPKCEAuthUrl({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    state,
    codeChallenge,
    scopes: ["user-top-read", "user-read-recently-played"],
  });

  return NextResponse.redirect(url);
}
